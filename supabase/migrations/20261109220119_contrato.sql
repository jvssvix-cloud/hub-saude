-- =============================================================================
-- Contrato entre entrada (A) e saídas (B). Ver supabase/README.md.
--
-- Ideia central: TODO consumidor de fora (médico via QR, Claude via MCP, API de
-- terceiros) lê o histórico por UMA função, acessar_historico(token, ...).
-- Ela confere o consentimento, filtra pelo escopo e grava o log. Revogar o
-- consentimento corta os três na hora, porque não existe outro caminho de leitura.
--
-- Sem Auth no MVP (1 paciente de demonstração). As tabelas ficam com RLS ligado e
-- SEM políticas: a chave anon não lê nada direto; só chama acessar_historico.
-- O servidor do app usa a service_role (que ignora RLS) para gravar e para as
-- telas do próprio paciente.
-- =============================================================================

-- ---------------------------------------------------------------- paciente
create table paciente (
  id          text primary key,              -- ex.: 'persona-roberto'
  nome        text not null,
  nascimento  date not null,
  sexo        text not null check (sexo in ('M', 'F')),
  criado_em   timestamptz not null default now()
);

-- ---------------------------------------------------------------- documento
-- De onde veio cada dado. Todo número aponta para cá (+ página).
create table documento (
  id           text primary key,             -- ex.: '2025-03' (laudo_id do gabarito)
  paciente_id  text not null references paciente(id) on delete cascade,
  tipo         text not null check (tipo in ('laudo_exame', 'carteira_vacinacao', 'wearable', 'outro')),
  -- canal de entrada: é o que mostra "várias fontes, um histórico"
  origem       text not null check (origem in (
                 'upload_pdf', 'upload_foto', 'email', 'meu_sus', 'wearable', 'clinica_api', 'seed')),
  emissor      text,                         -- laboratório, "Meu SUS Digital", "Apple Health"...
  data         date,                         -- data de coleta do laudo (null em carteira de vacina)
  arquivo      text,                         -- caminho no Storage (bucket 'documentos')
  paginas      int,
  criado_em    timestamptz not null default now()
);
create index on documento (paciente_id, data);

-- ---------------------------------------------------------------- observacao
-- Uma linha por resultado de exame, dose de vacina ou agregado de wearable.
-- Os nomes das colunas seguem extraction/src/schema.ts e insights/src/tipos.ts
-- para o carregar.ts dos insights trocar JSON por banco sem tradução.
create table observacao (
  id                   bigint generated always as identity primary key,
  paciente_id          text not null references paciente(id) on delete cascade,
  documento_id         text not null references documento(id) on delete cascade,
  categoria            text not null check (categoria in ('exame', 'vacina', 'wearable')),
  codigo               text not null,        -- analito canônico ('ldl'), vacina ('hepatite_b') ou métrica ('fc_repouso')
  data                 date not null,        -- coleta do resultado, data da dose ou dia do agregado

  -- como impresso (rastreabilidade)
  nome_impresso        text,
  valor_impresso       text,
  unidade_impressa     text,
  referencia_impressa  text,
  pagina               int,

  -- normalizado (unidade canônica)
  valor_canonico       numeric,
  unidade_canonica     text,
  qualificador         text check (qualificador in ('<', '>', '<=', '>=')),
  resultado_texto      text,                 -- "NÃO REAGENTE"
  ref_min_canonico     numeric,
  ref_max_canonico     numeric,
  fora_da_faixa        boolean not null default false,

  -- só vacina
  dose                 text,                 -- '1' | '2' | '3' | 'reforco' | 'unica' | 'anual' | 'outra'
  lote                 text,
  local                text,

  -- qualidade da leitura
  confianca            text check (confianca in ('alta', 'media', 'baixa')),
  alertas              text[] not null default '{}',

  criado_em            timestamptz not null default now()
);
create index on observacao (paciente_id, categoria, codigo, data);

-- ---------------------------------------------------------------- consentimento
-- "grant" é palavra reservada no Postgres, por isso o nome em português.
create table consentimento (
  id                 uuid primary key default gen_random_uuid(),
  paciente_id        text not null references paciente(id) on delete cascade,
  -- segredo que vai no QR / na URL / na config do MCP
  token              text not null unique default replace(gen_random_uuid()::text, '-', ''),
  destinatario_tipo  text not null check (destinatario_tipo in ('medico', 'ia', 'app_terceiro')),
  destinatario_nome  text not null,          -- "Dra. Ana (cardiologia)", "Claude do Roberto"
  -- escopo: null = tudo daquela dimensão
  categorias         text[],                 -- ex.: '{exame,wearable}'
  codigos            text[],                 -- ex.: '{ldl,hdl,glicose}'
  desde              date,                   -- só dados a partir desta data
  criado_em          timestamptz not null default now(),
  expira_em          timestamptz not null,
  revogado_em        timestamptz
);
create index on consentimento (paciente_id);

-- ---------------------------------------------------------------- log_acesso
-- Toda tentativa, permitida ou negada. É o que o paciente vê em "quem acessou".
create table log_acesso (
  id                bigint generated always as identity primary key,
  consentimento_id  uuid references consentimento(id) on delete set null,
  paciente_id       text references paciente(id) on delete cascade,
  em                timestamptz not null default now(),
  consumidor        text not null,           -- 'visao_medico' | 'mcp' | 'api' ...
  permitido         boolean not null,
  motivo            text not null,           -- 'ok' | 'token_invalido' | 'revogado' | 'expirado'
  qtd_observacoes   int not null default 0,
  filtros           jsonb
);
create index on log_acesso (paciente_id, em desc);

-- ---------------------------------------------------------------- RLS
alter table paciente      enable row level security;
alter table documento     enable row level security;
alter table observacao    enable row level security;
alter table consentimento enable row level security;
alter table log_acesso    enable row level security;
-- (sem políticas de propósito: anon/authenticated não leem nada direto)

-- =============================================================================
-- acessar_historico: o ÚNICO caminho de leitura para consumidores externos.
-- Retorna jsonb:
--   negado:    { ok: false, motivo: 'revogado' | 'expirado' | 'token_invalido' }
--   permitido: { ok: true, motivo: 'ok', consentimento: {...}, paciente: {...},
--                documentos: [...], observacoes: [...] }
-- Os filtros do consumidor só ESTREITAM o escopo do consentimento, nunca ampliam.
-- Sem exceções: um erro desfaria o insert no log.
-- =============================================================================
create or replace function acessar_historico(
  p_token       text,
  p_consumidor  text,
  p_categorias  text[] default null,
  p_codigos     text[] default null,
  p_desde       date   default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c        consentimento%rowtype;
  v_motivo text;
  v_desde  date;
  v_obs    jsonb;
  v_docs   jsonb;
  v_pac    jsonb;
  v_qtd    int;
  v_filtros jsonb := jsonb_strip_nulls(jsonb_build_object(
                       'categorias', p_categorias, 'codigos', p_codigos, 'desde', p_desde));
begin
  select * into c from consentimento where token = p_token;

  if not found then
    v_motivo := 'token_invalido';
  elsif c.revogado_em is not null then
    v_motivo := 'revogado';
  elsif c.expira_em <= now() then
    v_motivo := 'expirado';
  end if;

  if v_motivo is not null then
    insert into log_acesso (consentimento_id, paciente_id, consumidor, permitido, motivo, filtros)
    values (c.id, c.paciente_id, coalesce(p_consumidor, 'desconhecido'), false, v_motivo, v_filtros);
    return jsonb_build_object('ok', false, 'motivo', v_motivo);
  end if;

  v_desde := greatest(c.desde, p_desde);  -- greatest ignora null

  with sel as (
    select o.*
    from observacao o
    where o.paciente_id = c.paciente_id
      and (c.categorias is null or o.categoria = any (c.categorias))
      and (c.codigos    is null or o.codigo    = any (c.codigos))
      and (p_categorias is null or o.categoria = any (p_categorias))
      and (p_codigos    is null or o.codigo    = any (p_codigos))
      and (v_desde      is null or o.data >= v_desde)
  )
  select coalesce(jsonb_agg(to_jsonb(sel) - 'paciente_id' - 'criado_em'
                            order by sel.data, sel.categoria, sel.codigo), '[]'::jsonb),
         count(*)
    into v_obs, v_qtd
  from sel;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', d.id, 'tipo', d.tipo, 'origem', d.origem, 'emissor', d.emissor,
           'data', d.data, 'arquivo', d.arquivo, 'paginas', d.paginas) order by d.data nulls last, d.id), '[]'::jsonb)
    into v_docs
  from documento d
  where d.id in (select distinct (e->>'documento_id') from jsonb_array_elements(v_obs) e);

  select jsonb_build_object('nome', p.nome, 'nascimento', p.nascimento, 'sexo', p.sexo)
    into v_pac
  from paciente p where p.id = c.paciente_id;

  insert into log_acesso (consentimento_id, paciente_id, consumidor, permitido, motivo, qtd_observacoes, filtros)
  values (c.id, c.paciente_id, coalesce(p_consumidor, 'desconhecido'), true, 'ok', v_qtd, v_filtros);

  return jsonb_build_object(
    'ok', true,
    'motivo', 'ok',
    'consentimento', jsonb_build_object(
      'destinatario_tipo', c.destinatario_tipo, 'destinatario_nome', c.destinatario_nome,
      'categorias', c.categorias, 'codigos', c.codigos, 'desde', c.desde, 'expira_em', c.expira_em),
    'paciente', v_pac,
    'documentos', v_docs,
    'observacoes', v_obs);
end;
$$;

-- Ações do paciente (chamadas pelo servidor do app com a service_role).
create or replace function criar_consentimento(
  p_paciente_id        text,
  p_destinatario_tipo  text,
  p_destinatario_nome  text,
  p_validade           interval default interval '24 hours',
  p_categorias         text[]   default null,
  p_codigos            text[]   default null,
  p_desde              date     default null
) returns consentimento
language sql
security definer
set search_path = public
as $$
  insert into consentimento (paciente_id, destinatario_tipo, destinatario_nome, expira_em, categorias, codigos, desde)
  values (p_paciente_id, p_destinatario_tipo, p_destinatario_nome, now() + p_validade, p_categorias, p_codigos, p_desde)
  returning *;
$$;

create or replace function revogar_consentimento(p_id uuid)
returns consentimento
language sql
security definer
set search_path = public
as $$
  update consentimento set revogado_em = coalesce(revogado_em, now()) where id = p_id returning *;
$$;

-- Postgres dá EXECUTE a PUBLIC por padrão: tira e dá só o necessário.
revoke execute on function acessar_historico(text, text, text[], text[], date) from public;
revoke execute on function criar_consentimento(text, text, text, interval, text[], text[], date) from public;
revoke execute on function revogar_consentimento(uuid) from public;

-- Consumidor externo (médico, MCP, API) só pode isto, e só com o token certo:
grant execute on function acessar_historico(text, text, text[], text[], date) to anon, authenticated, service_role;
-- Criar e revogar: só o servidor do app (sem Auth no MVP, não dá para expor à anon).
grant execute on function criar_consentimento(text, text, text, interval, text[], text[], date) to service_role;
grant execute on function revogar_consentimento(uuid) to service_role;

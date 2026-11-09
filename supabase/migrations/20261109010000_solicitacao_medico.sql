-- =============================================================================
-- Pedido de acesso iniciado pelo médico (como no open finance / consent request da ABDM).
--
--   1. Médico/secretária digita o telefone do paciente -> solicitar_acesso()
--      devolve um token que ainda NÃO dá acesso (status 'pendente').
--   2. O app do paciente mostra "Dra. Ana pede seus exames por 24h" -> aprovar/recusar
--      (o paciente pode estreitar o escopo antes de aprovar).
--   3. Aprovado: o mesmo token passa a funcionar em acessar_historico, e a validade
--      (24h) conta a partir da aprovação. Revogar continua cortando na hora.
--
-- Privacidade: solicitar_acesso responde IGUAL exista ou não o telefone, e um pedido
-- para telefone desconhecido fica 'pendente' até expirar. Assim o pedido não serve
-- para descobrir quem usa o app.
-- O QR continua existindo: criar_consentimento gera um consentimento já aprovado.
-- =============================================================================

-- ---------------------------------------------------------------- paciente.telefone
-- Só dígitos, com DDI (ex.: 5511999990000). Comparação pelos últimos 11 dígitos (DDD + número).
alter table paciente add column telefone text;
create unique index paciente_telefone_idx on paciente (right(telefone, 11));

-- ---------------------------------------------------------------- consentimento: estados
alter table consentimento
  add column status        text not null default 'aprovado' check (status in ('pendente', 'aprovado', 'recusado')),
  add column canal         text not null default 'qr'       check (canal in ('qr', 'solicitacao')),
  add column motivo        text,              -- "Consulta de cardiologia em 14/11"
  add column validade      interval,          -- pedida pelo médico; vira expira_em na aprovação
  add column respondido_em timestamptz;

-- Pedido para telefone desconhecido não tem paciente (e nunca será aprovado).
alter table consentimento alter column paciente_id drop not null;
alter table consentimento add constraint consentimento_paciente_ou_pendente
  check (paciente_id is not null or status = 'pendente');

-- Enquanto 'pendente', expira_em é o prazo para o paciente responder.
-- Depois de 'aprovado', é o fim do acesso.

-- =============================================================================
-- solicitar_acesso: chamado pela tela do médico (chave anon, sem login no MVP).
-- Retorna { id, token, prazo_resposta } sempre, exista ou não o telefone.
-- O médico guarda o token e consulta acessar_historico até virar 'ok'.
-- =============================================================================
create or replace function solicitar_acesso(
  p_telefone           text,
  p_destinatario_nome  text,
  p_motivo             text     default null,
  p_destinatario_tipo  text     default 'medico',
  p_validade           interval default interval '24 hours',
  p_categorias         text[]   default null,
  p_codigos            text[]   default null,
  p_desde              date     default null,
  p_prazo_resposta     interval default interval '15 minutes'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tel  text := right(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), 11);
  v_pac  text;
  c      consentimento%rowtype;
begin
  if length(v_tel) < 10 then
    return jsonb_build_object('erro', 'telefone_invalido');  -- só formato; não diz nada sobre cadastro
  end if;
  if p_validade > interval '30 days' then
    p_validade := interval '30 days';
  end if;

  select id into v_pac from paciente where right(telefone, 11) = v_tel;

  insert into consentimento (paciente_id, destinatario_tipo, destinatario_nome, motivo,
                             categorias, codigos, desde, validade,
                             status, canal, expira_em)
  values (v_pac, p_destinatario_tipo, p_destinatario_nome, p_motivo,
          p_categorias, p_codigos, p_desde, p_validade,
          'pendente', 'solicitacao', now() + p_prazo_resposta)
  returning * into c;

  -- (fase 2: aqui sai o SMS/push. Na demo o app do paciente consulta os pendentes.)
  return jsonb_build_object('id', c.id, 'token', c.token, 'prazo_resposta', c.expira_em);
end;
$$;

-- =============================================================================
-- responder_solicitacao: chamado pelo servidor do app do paciente (service_role).
-- Na aprovação o paciente pode ESTREITAR o escopo pedido (nunca ampliar).
-- =============================================================================
create or replace function responder_solicitacao(
  p_id          uuid,
  p_aprovar     boolean,
  p_categorias  text[]   default null,
  p_codigos     text[]   default null,
  p_desde       date     default null,
  p_validade    interval default null
) returns consentimento
language plpgsql
security definer
set search_path = public
as $$
declare
  c consentimento%rowtype;
begin
  select * into c from consentimento
   where id = p_id and status = 'pendente' and paciente_id is not null and revogado_em is null
   for update;
  if not found then
    raise exception 'solicitacao_inexistente_ou_respondida';
  end if;
  if c.expira_em <= now() then
    raise exception 'solicitacao_expirada';
  end if;

  if not p_aprovar then
    update consentimento set status = 'recusado', respondido_em = now()
     where id = p_id returning * into c;
    return c;
  end if;

  update consentimento set
    status        = 'aprovado',
    respondido_em = now(),
    -- interseção: o que o médico pediu E o que o paciente liberou (null = sem restrição)
    categorias    = case when p_categorias is null then categorias
                         when categorias   is null then p_categorias
                         else array(select unnest(categorias) intersect select unnest(p_categorias)) end,
    codigos       = case when p_codigos is null then codigos
                         when codigos   is null then p_codigos
                         else array(select unnest(codigos) intersect select unnest(p_codigos)) end,
    desde         = greatest(desde, p_desde),
    expira_em     = now() + least(coalesce(validade, interval '24 hours'),
                                  coalesce(p_validade, validade, interval '24 hours'))
   where id = p_id
   returning * into c;
  return c;
end;
$$;

-- =============================================================================
-- acessar_historico: igual à versão anterior + estados 'pendente' e 'recusado'.
-- Consultas de quem ainda está esperando ('pendente') não vão para o log: a tela do
-- médico pergunta a cada poucos segundos e não há dado saindo.
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
  elsif c.status = 'pendente' then
    return jsonb_build_object('ok', false, 'motivo', 'pendente', 'prazo_resposta', c.expira_em);
  elsif c.status = 'recusado' then
    v_motivo := 'recusado';
  end if;

  if v_motivo is not null then
    if c.paciente_id is not null or not found then
      insert into log_acesso (consentimento_id, paciente_id, consumidor, permitido, motivo, filtros)
      values (c.id, c.paciente_id, coalesce(p_consumidor, 'desconhecido'), false, v_motivo, v_filtros);
    end if;
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

revoke execute on function solicitar_acesso(text, text, text, text, interval, text[], text[], date, interval) from public;
revoke execute on function responder_solicitacao(uuid, boolean, text[], text[], date, interval) from public;
-- A tela do médico (sem login) pode pedir; só o app do paciente responde.
grant execute on function solicitar_acesso(text, text, text, text, interval, text[], text[], date, interval) to anon, authenticated, service_role;
grant execute on function responder_solicitacao(uuid, boolean, text[], text[], date, interval) to service_role;

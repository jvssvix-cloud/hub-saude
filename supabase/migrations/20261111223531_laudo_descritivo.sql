-- Laudos descritivos (11/11, João, fatia C da coleta): ECG, ecocardiograma, endoscopia, ultrassom, mamografia...
-- O resultado é um texto: guardamos o nome do exame, a área (a mesma do /reunir), a data e a CONCLUSÃO copiada do
-- laudo, com a página. Não viram observação (não há valor nem faixa), então ficam no próprio documento.
alter table documento drop constraint if exists documento_tipo_check;
alter table documento add constraint documento_tipo_check
  check (tipo in ('laudo_exame', 'carteira_vacinacao', 'laudo_descritivo', 'wearable', 'outro'));

alter table documento
  add column area             text check (area in ('coracao', 'gastro', 'rins', 'mulher', 'ossos', 'pulmao', 'outros')),
  add column exame_nome       text check (char_length(exame_nome) <= 200),
  add column conclusao        text check (char_length(conclusao) <= 4000),
  add column conclusao_pagina integer check (conclusao_pagina >= 1);

-- =============================================================================
-- acessar_historico: igual à versão anterior + os laudos descritivos do paciente.
-- Eles entram na categoria "exame" do consentimento: aparecem quando o escopo libera exames (ou tudo), sem filtro
-- de códigos, e respeitam o "desde" pela data do exame. Cada documento leva área, nome, conclusão e página.
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
           'data', d.data, 'arquivo', d.arquivo, 'paginas', d.paginas,
           'area', d.area, 'exame_nome', d.exame_nome, 'conclusao', d.conclusao,
           'conclusao_pagina', d.conclusao_pagina) order by d.data nulls last, d.id), '[]'::jsonb)
    into v_docs
  from documento d
  where d.paciente_id = c.paciente_id
    and (
      d.id in (select distinct (e->>'documento_id') from jsonb_array_elements(v_obs) e)
      or (d.tipo = 'laudo_descritivo'
          and (c.categorias is null or 'exame' = any (c.categorias))
          and (p_categorias is null or 'exame' = any (p_categorias))
          and c.codigos is null and p_codigos is null
          and (v_desde is null or d.data >= v_desde))
    );

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

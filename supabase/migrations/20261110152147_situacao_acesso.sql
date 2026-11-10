-- situacao_acesso(token): só diz se o acesso vale agora, SEM devolver dados e SEM gravar log.
-- Para a tela do médico perceber a revogação na hora (consulta a cada poucos segundos) sem encher o
-- log_acesso de leituras que não aconteceram. Ler dados continua sendo só por acessar_historico.
create or replace function situacao_acesso(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select jsonb_build_object(
       'situacao', case
         when c.revogado_em is not null then 'revogado'
         when c.expira_em <= now() then 'expirado'
         when c.status = 'pendente' then 'pendente'
         when c.status = 'recusado' then 'recusado'
         else 'ok' end,
       'expira_em', c.expira_em)
     from consentimento c where c.token = p_token),
    jsonb_build_object('situacao', 'token_invalido'));
$$;

revoke execute on function situacao_acesso(text) from public, anon, authenticated;
grant execute on function situacao_acesso(text) to anon, authenticated, service_role;

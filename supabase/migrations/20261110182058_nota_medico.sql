-- Nota do médico: recomendações que o médico revisa no painel e que voltam para o app do paciente
-- ("Revisado por Dra. X"). Só quem tem um consentimento APROVADO e válido escreve; o paciente lê pelo servidor.
create table nota_medico (
  id                uuid primary key default gen_random_uuid(),
  paciente_id       text not null references paciente(id) on delete cascade,
  consentimento_id  uuid references consentimento(id) on delete set null,
  autor_nome        text not null,
  itens             text[] not null check (cardinality(itens) between 1 and 10),
  criado_em         timestamptz not null default now()
);
create index nota_medico_paciente on nota_medico (paciente_id, criado_em desc);
alter table nota_medico enable row level security; -- sem políticas: chave pública não lê nem grava direto

create or replace function registrar_nota(p_token text, p_itens text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c consentimento;
  v_itens text[];
  n nota_medico;
begin
  select * into c from consentimento where token = p_token;
  if c.id is null then return jsonb_build_object('ok', false, 'motivo', 'token_invalido'); end if;
  if c.revogado_em is not null then return jsonb_build_object('ok', false, 'motivo', 'revogado'); end if;
  if c.expira_em <= now() then return jsonb_build_object('ok', false, 'motivo', 'expirado'); end if;
  if c.status <> 'aprovado' then return jsonb_build_object('ok', false, 'motivo', c.status); end if;

  select array_agg(left(btrim(x), 300)) into v_itens
    from unnest(coalesce(p_itens, '{}')) x where btrim(x) <> '';
  if v_itens is null then return jsonb_build_object('ok', false, 'motivo', 'vazio'); end if;

  insert into nota_medico (paciente_id, consentimento_id, autor_nome, itens)
    values (c.paciente_id, c.id, c.destinatario_nome, v_itens[1:10])
    returning * into n;
  return jsonb_build_object('ok', true, 'id', n.id, 'criado_em', n.criado_em);
end $$;

-- pública de propósito (o médico não tem login): só funciona com token de consentimento aprovado e válido
revoke execute on function registrar_nota(text, text[]) from public, anon, authenticated;
grant execute on function registrar_nota(text, text[]) to anon, authenticated, service_role;

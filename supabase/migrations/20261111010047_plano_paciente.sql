-- Plano do paciente: lista curta de passos que o paciente salva a partir do chat do app ("Criar plano").
-- É do paciente (gerado por IA a partir do histórico dele), não é a nota do médico (tabela nota_medico).
-- Só o servidor do app (service_role) lê e grava; a chave pública não alcança (RLS sem políticas).
create table plano_paciente (
  id           uuid primary key default gen_random_uuid(),
  paciente_id  text not null references paciente(id) on delete cascade,
  titulo       text not null check (char_length(titulo) between 1 and 120),
  itens        text[] not null check (cardinality(itens) between 1 and 8),
  origem       text not null default 'chat' check (origem in ('chat')),
  seguindo     boolean not null default false,
  criado_em    timestamptz not null default now()
);
create index plano_paciente_paciente on plano_paciente (paciente_id, criado_em desc);
alter table plano_paciente enable row level security; -- sem políticas: chave pública não lê nem grava direto

-- Envio de exame pelo app (PDF ou foto): o arquivo vai para o Storage, a extração fica em `envio`
-- até o paciente conferir a prévia e salvar (aí vira documento + observacao).
-- Só o servidor do app (service_role) mexe aqui: RLS sem políticas e nenhum grant para anon.

-- Bucket privado para os arquivos enviados (até 4 MB: limite do corpo na Vercel; foto é reduzida no navegador)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 4194304,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Mesmo arquivo duas vezes = mesmo hash: o app avisa em vez de duplicar o histórico
alter table documento add column sha256 text;
create unique index documento_paciente_sha256 on documento (paciente_id, sha256) where sha256 is not null;

create table envio (
  id           uuid primary key default gen_random_uuid(),
  paciente_id  text not null references paciente(id) on delete cascade,
  sha256       text not null,
  arquivo      text not null,               -- caminho no bucket 'documentos' (enviados/<id>.<ext>)
  mime         text not null,
  extracao     jsonb,                       -- ExtracaoNormalizada (extraction/src/schema.ts)
  uso          jsonb,                       -- modelo, tokens, custo, segundos
  situacao     text not null default 'lendo' check (situacao in ('lendo', 'pronto', 'salvo', 'descartado', 'erro')),
  documento_id text references documento(id) on delete set null,
  erro         text,
  criado_em    timestamptz not null default now()
);
create index on envio (paciente_id, criado_em);
alter table envio enable row level security; -- sem políticas: chave pública não lê nem grava

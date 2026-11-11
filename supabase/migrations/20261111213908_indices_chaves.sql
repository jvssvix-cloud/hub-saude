-- Índices nas chaves estrangeiras apontadas pelo advisor do Supabase e em documento.arquivo
-- (a rota /enviados/<arquivo> procura o documento pelo caminho a cada abertura).
create index if not exists envio_documento_id_idx           on public.envio (documento_id);
create index if not exists log_acesso_consentimento_id_idx  on public.log_acesso (consentimento_id);
create index if not exists nota_medico_consentimento_id_idx on public.nota_medico (consentimento_id);
create index if not exists observacao_documento_id_idx      on public.observacao (documento_id);
create index if not exists documento_arquivo_idx            on public.documento (arquivo);

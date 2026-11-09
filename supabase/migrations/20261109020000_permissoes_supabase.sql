-- No Supabase, funções novas do schema public ganham EXECUTE direto para anon e authenticated
-- (privilégio padrão do projeto), então o "revoke ... from public" das migrations anteriores não basta.
-- Sem isto, a chave pública (que vai para o navegador do médico) conseguiria criar, aprovar e revogar
-- consentimentos. Achado ao aplicar no projeto real; o teste no PGlite não pegava porque lá não há
-- esse privilégio padrão.

revoke execute on function criar_consentimento(text, text, text, interval, text[], text[], date) from anon, authenticated;
revoke execute on function revogar_consentimento(uuid) from anon, authenticated;
revoke execute on function responder_solicitacao(uuid, boolean, text[], text[], date, interval) from anon, authenticated;

-- Funções criadas daqui para frente: não dar EXECUTE automático às chaves públicas.
-- Quem precisar expor uma função para anon faz o grant explícito (como acessar_historico e solicitar_acesso).
alter default privileges in schema public revoke execute on functions from anon, authenticated;

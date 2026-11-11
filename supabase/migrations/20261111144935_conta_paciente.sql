-- Conta do paciente (11/11): liga um usuário do Supabase Auth (e-mail + senha) a um paciente.
-- Um usuário tem no máximo um paciente, e cada paciente tem no máximo um usuário.
-- O paciente só é criado no bloco 1 do check-up (nome, nascimento, sexo e telefone são obrigatórios na tabela).
-- Até lá, o usuário existe no Auth sem paciente, e o app manda essa pessoa para o check-up.
-- Apagar o usuário no Auth não apaga o histórico: o vínculo vira null (as contas de teste podem ser apagadas
-- sem perder os dados; o Roberto continua ligado à conta de demonstração ou a nenhuma).
-- A tabela continua só para o servidor (RLS ligado, sem políticas): o navegador nunca lê o paciente direto.
alter table paciente
  add column usuario_id uuid unique references auth.users (id) on delete set null;

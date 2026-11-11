-- Perfil de saúde mais detalhado (11/11, João): antecedentes pessoais (internações, cirurgias), remédios em lista,
-- médicos que acompanha e família por parente. E o progresso do "Reunir meus exames" (/reunir), área por área.
-- null = a pessoa não respondeu (pulou o bloco). Validação fina fica no servidor do app (app/checkup/acoes.ts);
-- aqui só o formato e um teto de tamanho.
alter table perfil_saude
  add column internacoes      jsonb check (internacoes is null or (jsonb_typeof(internacoes) = 'array' and jsonb_array_length(internacoes) <= 20)),
  add column cirurgias        jsonb check (cirurgias is null or (jsonb_typeof(cirurgias) = 'array' and jsonb_array_length(cirurgias) <= 20)),
  add column remedios_lista   jsonb check (remedios_lista is null or (jsonb_typeof(remedios_lista) = 'array' and jsonb_array_length(remedios_lista) <= 20)),
  add column medicos          text[] check (medicos <@ array['clinico', 'cardiologista', 'endocrinologista', 'gastroenterologista',
                                'urologista', 'ginecologista', 'nefrologista', 'pneumologista', 'geriatra', 'neurologista', 'ortopedista']),
  add column medicos_outros   text check (char_length(medicos_outros) <= 200),
  add column familia_parentes jsonb check (familia_parentes is null or jsonb_typeof(familia_parentes) = 'object'),
  add column coleta           jsonb not null default '{}' check (jsonb_typeof(coleta) = 'object');

comment on column perfil_saude.internacoes is '[{motivo, ano}]';
comment on column perfil_saude.cirurgias is '[{nome, ano}]';
comment on column perfil_saude.remedios_lista is '[{nome, dose, para_que}] (remedios em texto fica só para leitura)';
comment on column perfil_saude.familia_parentes is '{pai|mae|irmaos|avos: {condicoes: [...], cancer_qual, observacao}}; familia (array) é derivado dele';
comment on column perfil_saude.coleta is '/reunir: {area: enviado|nao_tenho|pulado}';

-- Roberto (sintético): mãe com diabetes (coerente com familia = {diabetes}), acompanha com clínico geral.
update perfil_saude
   set familia_parentes = '{"mae": {"condicoes": ["diabetes"]}}',
       medicos = '{clinico}',
       internacoes = '[]', cirurgias = '[]', remedios_lista = '[]'
 where paciente_id = 'persona-roberto';

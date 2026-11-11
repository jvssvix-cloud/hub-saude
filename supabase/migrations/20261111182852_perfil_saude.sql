-- Perfil de saúde (check-up inicial, 11/11): os dados físicos e a história que o paciente informa na primeira vez
-- que entra, base para correlações e alertas. Uma linha por paciente, criada no bloco 1 junto com os aceites.
-- Só o servidor do app (service_role) lê e grava: RLS ligado, sem políticas, como plano_paciente.
create table perfil_saude (
  paciente_id             text primary key references paciente(id) on delete cascade,

  -- aceites (bloco 1), separados e com data e hora: termos de uso e uso de dados de saúde (LGPD, dado sensível)
  termos_versao           text not null,
  termos_aceitos_em       timestamptz not null,
  dados_saude_aceitos_em  timestamptz not null,

  -- bloco 2 · corpo: altura e peso obrigatórios para concluir o check-up (o IMC é calculado, não guardado)
  altura_cm               numeric(4,1) check (altura_cm between 50 and 250),
  peso_kg                 numeric(5,1) check (peso_kg between 2 and 400),

  -- bloco 3 · hábitos (opcional)
  fumo                    text check (fumo in ('nunca', 'ex', 'atual')),
  alcool                  text check (alcool in ('nao', 'raramente', 'semanal', 'diario')),
  atividade_min_semana    integer check (atividade_min_semana between 0 and 3000),
  sono_horas              numeric(3,1) check (sono_horas between 0 and 24),

  -- bloco 4 · condições já diagnosticadas e remédios de uso contínuo (opcional)
  condicoes               text[] not null default '{}'
                          check (condicoes <@ array['diabetes', 'hipertensao', 'colesterol_alto', 'tireoide', 'coracao', 'rim']),
  condicoes_outras        text check (char_length(condicoes_outras) <= 300),
  remedios                text check (char_length(remedios) <= 500),

  -- bloco 5 · família (opcional)
  familia                 text[] not null default '{}'
                          check (familia <@ array['infarto_avc_precoce', 'diabetes', 'cancer']),
  familia_cancer          text check (char_length(familia_cancer) <= 200),

  -- bloco 6 · alergias; gestação e menopausa só para sexo F (o app só pergunta nesse caso; null = não informou)
  alergias                text check (char_length(alergias) <= 300),
  gestante                boolean,
  menopausa               boolean,

  checkup_concluido_em    timestamptz,   -- null: o app manda a pessoa de volta ao check-up
  atualizado_em           timestamptz not null default now()
);
alter table perfil_saude enable row level security; -- sem políticas: chave pública não lê nem grava

-- Roberto (demonstração, dados sintéticos) já entra com o check-up feito. Num banco novo ele ainda não existe
-- quando as migrations rodam: aí não faz nada e quem cria o perfil dele é o seed.sql.
insert into perfil_saude (
  paciente_id, termos_versao, termos_aceitos_em, dados_saude_aceitos_em,
  altura_cm, peso_kg, fumo, alcool, atividade_min_semana, sono_horas,
  condicoes, remedios, familia, alergias, checkup_concluido_em
)
select 'persona-roberto', 'v1-2026-11-11', now(), now(),
       174, 86, 'nunca', 'semanal', 60, 6,
       '{}', null, '{diabetes}', null, now()
where exists (select 1 from paciente where id = 'persona-roberto');

-- Para atualizar o banco de dados, se já tiver inicalizado antes, use o comando: 'docker compose down -v' para 
-- derrubar o container e remover os volumes, e depois 'docker compose up -d' para subir novamente o container
-- com o banco de dados atualizado.

CREATE TABLE IF NOT EXISTS users (
  id       SERIAL PRIMARY KEY,
  email    TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role     TEXT NOT NULL CHECK (role IN ('cuidador', 'profissional'))
);

CREATE TABLE IF NOT EXISTS perfil (
    id SERIAL NOT NULL,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    birth_date DATE NOT NULL,
    scholarship TEXT NOT NULL,
    medical_cond TEXT[],

    CONSTRAINT "perfil_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS routine (
    id SERIAL NOT NULL,
    perfilId INTEGER NOT NULL,
    dia TEXT NOT NULL,
    tarde TEXT NOT NULL,
    noite TEXT NOT NULL,
    extras TEXT NOT NULL,

    CONSTRAINT "routine_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS check_in (
    id SERIAL NOT NULL,
    date_actual TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    perfilId INTEGER NOT NULL,
    --Dominio Funcional
    quedas INTEGER NOT NULL, -- 2 ou mais quedas em um periodo de 1 ano é um sinal de alerta
    engasgos BOOLEAN NOT NULL, -- Abrange: Dificuldade de mastigação e/ou deglutição, engasgos e/ou tosses recorrentes.
    marcha BOOLEAN NOT NULL,
    -- Dominio Fisiologico
    perdaDePeso DOUBLE PRECISION NOT NULL, -- Perda de peso não intencional (mínimo 4,5 kg ou 5% do seu peso corporal) no último ano.
    sinalDeViolecia BOOLEAN NOT NULL,
    sono_irregular BOOLEAN NOT NULL,
    --Dominio Cognitivo
    isolamentoSocial BOOLEAN NOT NULL,
    comunicacaoFalha BOOLEAN NOT NULL,
    perdaDeMemoria BOOLEAN NOT NULL,

    CONSTRAINT "check_in_pkey" PRIMARY KEY (id)
);

-- AddForeignKey
ALTER TABLE "routine" ADD CONSTRAINT "routine_perfilId_fkey" FOREIGN KEY (perfilId) REFERENCES perfil(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_perfilId_fkey" FOREIGN KEY (perfilId) REFERENCES perfil(id) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS users (
  id       SERIAL PRIMARY KEY,
  email    TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role     TEXT NOT NULL CHECK (role IN ('cuidador', 'profissional'))
);

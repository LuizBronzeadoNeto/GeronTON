INSERT INTO users (email, password, role) VALUES
  ('cuidador@demo.com',     'senha123', 'cuidador'),
  ('profissional@demo.com', 'senha123', 'profissional')
ON CONFLICT (email) DO NOTHING;

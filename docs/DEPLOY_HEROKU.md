# Deploy no Heroku

Alternativa ao VPS descrito em `DEPLOY.md`. No Heroku não existe Caddy nem Docker Compose: um único dyno roda a API e serve o build web, e o banco é o Heroku Postgres.

## Como fica

- `Dockerfile.heroku` (na raiz) gera uma imagem com a API e o build web juntos. O build web aponta para `/api` relativo, então não depende do domínio.
- `heroku.yml` diz ao Heroku para usar essa imagem e roda `prisma migrate deploy` na fase de release. Se a migração falhar, a versão nova não entra no ar.
- A API remove o prefixo `/api` sozinha (no VPS quem faz isso é o Caddy) e, com `WEB_DIR` definido, serve o build web. As duas coisas ficam na mesma origem, então não precisa configurar CORS.

## Custo

O Heroku não tem plano gratuito. O mínimo que funciona bem:

| Recurso | Plano | Observação |
| --- | --- | --- |
| Dyno web | Basic | O Eco dorme depois de 30 min sem acesso: a primeira requisição demora e a verificação diária de check-ins atrasados deixa de rodar com regularidade. |
| Banco | Heroku Postgres Essential-0 | Suficiente para o experimento. |

Confira os preços atuais no site do Heroku. Com e-mail institucional dá para pedir o GitHub Student Developer Pack, que inclui crédito mensal no Heroku.

## Pré-requisitos

- Conta no Heroku com forma de pagamento (ou crédito do Student Pack).
- Heroku CLI instalado (`npm install -g heroku` ou o instalador do site).
- As mudanças commitadas: o Heroku faz o build a partir do Git, não da sua pasta local.

## 1. Criar o app

```bash
heroku login
heroku create NOME-DO-APP
heroku stack:set container -a NOME-DO-APP
heroku addons:create heroku-postgresql:essential-0 -a NOME-DO-APP
```

O addon do Postgres já define `DATABASE_URL` no app.

## 2. Variáveis

```bash
heroku config:set -a NOME-DO-APP \
  NODE_ENV=production \
  JWT_SECRET="$(openssl rand -base64 48)" \
  SALT_ROUNDS=12
```

`PORT` é definido pelo Heroku, não mexa. `CORS_ORIGIN` fica sem valor porque o web é servido na mesma origem.

Para notificações no navegador e no iPhone, gere as chaves VAPID (`npx web-push generate-vapid-keys`) e defina `VAPID_SUBJECT` (ex.: `mailto:alguem@exemplo.com`), `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`. Sem elas o app funciona, só não manda notificação web.

## 3. Publicar

```bash
heroku git:remote -a NOME-DO-APP
git push heroku SUA-BRANCH:main
heroku ps:type web=basic -a NOME-DO-APP
```

O primeiro build demora alguns minutos porque instala as dependências do client e do server. Para acompanhar:

```bash
heroku logs --tail -a NOME-DO-APP
```

Verifique:

```bash
curl https://NOME-DO-APP.herokuapp.com/api/health   # {"status":"ok"}
```

Abra `https://NOME-DO-APP.herokuapp.com` no navegador para usar a versão web.

## 4. Primeiro acesso

O cadastro é aberto, então basta criar as contas reais pela tela "Criar conta". Não rode a seed em produção: ela cria as contas demo com a senha `senha123`, que está publicada no README.

## 5. App Android

A URL da API vai embutida no APK. Troque `EXPO_PUBLIC_API_URL` nos perfis `preview` e `production` do `client/eas.json` para:

```
https://NOME-DO-APP.herokuapp.com/api
```

e gere o APK de novo com o EAS. Quem estiver com o APK antigo continua apontando para o VPS.

## 6. Trazer os dados do VPS (se houver)

No VPS:

```bash
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U geronton -Fc geronton > geronton.dump
```

Na sua máquina, com o dump copiado:

```bash
pg_restore --no-owner --no-acl -d "$(heroku config:get DATABASE_URL -a NOME-DO-APP)" geronton.dump
```

Faça isso antes de liberar o app para os testadores, para não misturar dados novos com a importação.

## 7. Atualizar

Commit e `git push heroku SUA-BRANCH:main` de novo. As migrações rodam na release e o dyno antigo só sai depois que o novo sobe.

## 8. Backups

```bash
heroku pg:backups:schedule DATABASE_URL --at '04:00 America/Sao_Paulo' -a NOME-DO-APP
heroku pg:backups -a NOME-DO-APP
```

Teste uma restauração antes de cadastrar testadores reais.

## Diagnóstico

- **Release falhou**: uma migração deu erro. `heroku releases -a NOME-DO-APP` e `heroku releases:output VERSAO -a NOME-DO-APP` mostram o motivo.
- **App reiniciando**: quase sempre variável ausente ou fraca. A mensagem em `heroku logs` diz qual (por exemplo, `JWT_SECRET` com menos de 32 caracteres).
- **"Network Error" no web**: confira se está abrindo pelo domínio do Heroku e não por um build antigo em cache. Recarregue sem cache.
- **429 no login**: o limite é de 10 falhas por IP a cada 15 minutos. Logins certos não contam.

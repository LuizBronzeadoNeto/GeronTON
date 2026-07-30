# Deploy do GeronTON

Runbook para colocar o backend e a versão web no ar em um VPS, atrás do Caddy com HTTPS automático.

## Topologia

Um único host roda três contêineres (`docker-compose.prod.yml`):

| Serviço | Imagem | Portas |
| --- | --- | --- |
| `caddy` | `caddy:2` | 80 e 443 (únicas expostas à internet) |
| `api` | build de `./server` | 3000, apenas na rede interna |
| `db` | `postgres:17` | 5432, apenas na rede interna |

O Caddy atende um único hostname e divide por caminho:

| Caminho | Destino |
| --- | --- |
| `/api/*` | a API Express — o prefixo `/api` é removido antes do proxy, então nenhuma rota do servidor muda |
| `/*` | o build web estático (`./web`) |

Servir os dois na mesma origem elimina qualquer questão de CORS e dá um único certificado e um único link para os testadores.

## Pré-requisitos

- Um VPS com Ubuntu 24.04 (Hetzner CX22 é suficiente).
- Um subdomínio DuckDNS gratuito apontando para o IP do VPS.

## 1. Preparar o servidor

```bash
adduser geronton && usermod -aG sudo geronton
rsync --archive --chown=geronton:geronton ~/.ssh /home/geronton
```

Em `/etc/ssh/sshd_config` defina `PasswordAuthentication no` e `PermitRootLogin no`, depois `systemctl restart ssh`.

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw enable
```

A porta 5432 nunca é liberada: o Postgres não publica portas no host e só é alcançável pela rede interna do Compose.

## 2. Instalar o Docker

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker geronton
```

Refaça o login para que o grupo passe a valer.

## 3. DNS

Crie o subdomínio em <https://www.duckdns.org> e aponte para o IP do VPS. O IP é estático, mas um cron diário evita surpresas:

```bash
echo '0 3 * * * curl -fsS "https://www.duckdns.org/update?domains=SEU-SUBDOMINIO&token=SEU-TOKEN&ip="' | crontab -
```

Confirme a propagação antes de subir o Caddy — ele só emite o certificado se o domínio já resolver para o servidor.

## 4. Código e segredos

```bash
sudo mkdir -p /srv/geronton && sudo chown geronton:geronton /srv/geronton
git clone https://github.com/LuizBronzeadoNeto/GeronTON.git /srv/geronton
cd /srv/geronton
mkdir -p web
```

Crie `/srv/geronton/.env` com permissão restrita:

```bash
touch .env && chmod 600 .env
```

Conteúdo:

```
DOMAIN=seu-subdominio.duckdns.org
POSTGRES_USER=geronton
POSTGRES_PASSWORD=<openssl rand -base64 32>
POSTGRES_DB=geronton
DATABASE_URL=postgres://geronton:<a mesma senha acima>@db:5432/geronton
JWT_SECRET=<openssl rand -base64 48>
SALT_ROUNDS=12
CORS_ORIGIN=
```

Gere cada segredo com `openssl rand -base64 48`. Nunca reaproveite os valores dos arquivos `.env.example`: a aplicação recusa iniciar em produção se o `JWT_SECRET` for curto ou for um dos valores publicados no repositório.

`CORS_ORIGIN` fica vazio porque o build web é servido na mesma origem da API. Só preencha (lista separada por vírgulas) se algum dia o front web passar a morar em outro domínio.

## 5. Subir

```bash
cd /srv/geronton
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

As migrações rodam sozinhas: o entrypoint da imagem executa `prisma migrate deploy` antes de iniciar o processo, então uma migração que falha impede o contêiner de subir em vez de deixar o schema inconsistente.

Verifique:

```bash
curl https://SEU-DOMINIO/api/health     # {"status":"ok"}
curl -I http://SEU-DOMINIO/api/health   # 308 para https
```

## 6. Primeiro acesso

Contas só podem ser criadas por um profissional, então é preciso semear a primeira:

```bash
docker compose -f docker-compose.prod.yml exec api ./node_modules/.bin/prisma db seed
```

**Troque as senhas demo imediatamente.** O `README.md` publica `senha123`, e a seed cria `cuidador@demo.com` e `profissional@demo.com`. Em produção, altere ou remova essas contas assim que criar as reais.

## 7. Publicar o build web

Na sua máquina:

```bash
cd client
npx expo export --platform web --clear
rsync -av --delete dist/ geronton@SEU-HOST:/srv/geronton/web/
```

**O `--clear` não é opcional.** `EXPO_PUBLIC_API_URL` é embutida no bundle em tempo de build, mas alterá-la **não invalida o cache do Metro**: sem `--clear`, o export reaproveita o bundle anterior, gera um arquivo idêntico (mesmo hash) e publica silenciosamente a URL antiga. O sintoma é o aplicativo abrir normalmente e falhar com "Network Error" em toda requisição.

Confirme antes de publicar que a URL correta está no bundle:

```bash
grep -c "geronton.duckdns.org" dist/_expo/static/js/web/*.js
```

Deve responder `1` ou mais. Não use `grep ... | head` para essa checagem: o `head` mascara o código de saída do `grep` e o teste passa mesmo sem nenhuma ocorrência.

O Caddy serve o diretório diretamente; não é preciso reconstruir contêiner nenhum. Esse é também o canal de atualização dos testadores de iPhone — eles recebem a versão nova no próximo carregamento.

## 8. Backups

```bash
sudo mkdir -p /srv/backups && sudo chown geronton:geronton /srv/backups
```

Cron diário:

```
0 4 * * * cd /srv/geronton && docker compose -f docker-compose.prod.yml exec -T db pg_dump -U geronton geronton | gzip > /srv/backups/geronton-$(date +\%F).sql.gz
30 4 * * * find /srv/backups -name 'geronton-*.sql.gz' -mtime +14 -delete
```

Teste a restauração uma vez antes de cadastrar testadores reais — backup não testado não é backup:

```bash
gunzip -c /srv/backups/geronton-AAAA-MM-DD.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db psql -U geronton -d geronton_restore_test
```

## 9. Atualizar

```bash
cd /srv/geronton
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

O desligamento é gracioso: a aplicação trata `SIGTERM`, para de aceitar conexões, deixa as requisições em andamento terminarem e só então fecha o pool do banco.

## 10. Diagnóstico

```bash
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.prod.yml ps
```

- **Certificado não emitido** — o domínio ainda não resolve para o servidor, ou a porta 80 está bloqueada. O Caddy precisa da 80 para o desafio HTTP-01.
- **`api` reiniciando** — quase sempre uma variável ausente ou fraca no `.env`; a mensagem de erro diz qual.
- **429 nas tentativas de login** — o limitador permite 10 falhas por IP a cada 15 minutos. Logins bem-sucedidos não contam.

# GeronTON

## Backend - `server/`

```bash
cd server
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

- `docker compose up -d` starts Postgres.
- `npm install` also runs `prisma generate` (postinstall).
- `npm run db:migrate` applies the Prisma schema (`prisma/schema.prisma`); `npm run db:seed` inserts the demo accounts.
- `npm run dev` serves the API at http://localhost:3000.
- `npm test` runs the Jest tests (Postgres must be up, migrated, and seeded).
- `npm run build` compiles to `dist/`; `npm start` runs that build.

## App - `client/`

A phone/emulator can't reach the backend over `localhost`, so set your machine's LAN IP (from `ipconfig`) in `client/.env` as `EXPO_PUBLIC_API_URL=http://<LAN-IP>:3000`. It's baked in at build time, so rebuild after changing it.

```bash
cd client
npm install
npm start
```

- `npm start` launches the Expo dev server (Expo Go or an emulator).
- `npm run android` / `npm run ios` build and install a native dev client.
- `npm run web` runs the app in the browser.
- `npm test` runs the Jest + jest-expo unit/component tests.
- `npm run test:e2e` runs the Maestro E2E flows (needs an installed build and a running emulator/device).

## Maestro setup

Install once (macOS/Linux/WSL2); `maestro studio` opens an interactive inspector.

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
```

## Demo logins

```
cuidador@demo.com      / senha123   -> cuidador
profissional@demo.com  / senha123   -> profissional
```

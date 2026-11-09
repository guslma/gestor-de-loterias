# Arquitetura

Monorepo com frontend e backend separados, comunicando via HTTP/JSON.

- **Frontend** (`frontend/`): React + TypeScript + Vite + Tailwind, SPA com
  `react-router-dom`. PWA via `vite-plugin-pwa`, com `/api/*` e `/uploads/*`
  explicitamente fora do cache (`NetworkOnly` + `navigateFallbackDenylist`) —
  dados financeiros nunca são servidos do cache do service worker.
- **Backend** (`backend/`): Express + TypeScript, validação de payload com
  zod. Serve a API em `/api/*` e, em produção, também os arquivos estáticos
  buildados do frontend (`frontend/dist`) — um único container/processo, sem
  precisar de nginx.
- **Dados**: PostgreSQL acessado via `pg` (node-postgres), sem ORM. Migrations
  são arquivos `.sql` simples em `database/migrations/`, aplicadas
  automaticamente no boot do backend (`backend/src/migrate.ts`), controladas
  por uma tabela `_migrations`.
- **Autenticação**: um único usuário, definido por `APP_USERNAME` e
  `APP_PASSWORD`. A sessão é um JWT em cookie `httpOnly`, com limite de
  tentativas no login e proteção CSRF por header (`backend/src/lib/auth.ts`).
  Para acesso de fora de casa, ver `deploy/README.md`.
- **Comprovantes**: as fotos são convertidas para WebP e criptografadas com
  AES-256-GCM antes de ir para o disco (`backend/src/lib/receipt-storage.ts`),
  e só são servidas pela API (`/api/receipts/files/:uuid`). A leitura dos
  dados do comprovante (valor, data, beneficiário, categoria) é feita por um
  modelo com visão no Ollama (`backend/src/lib/receipt-extraction.ts`).
- **Import de planilhas**: parser de balanço anual em
  `backend/src/lib/import-balanco.ts`, exposto via `POST /api/import`
  (`?dryRun=true` para pré-visualizar antes de gravar).
- **Deploy**:
  - `Dockerfile` + `docker-compose.yml` na raiz — 2 containers (app +
    postgres). O app roda como o usuário `node`, sem root. Por padrão usa a imagem publicada no GitHub
    (`ghcr.io/guslma/gestor-de-loterias`); `docker compose up -d --build` builda
    localmente a partir do `Dockerfile` em vez de baixar.
  - `docker-compose.dev.yml` — ambiente de desenvolvimento com hot-reload
    (containers separados de frontend e backend, volumes montados).
  - `deploy/` — formato específico para instalação oficial no ZimaOS/CasaOS
    (bind mounts em `/DATA/AppData/...`, porta `4783`, metadados `x-casaos`
    e o serviço `updater`, que atualiza o app a cada 6 horas). Ver
    `deploy/README.md`.

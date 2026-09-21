# PhotoApp — Backend

API self-hosted do PhotoApp (ver `../PRD.md`). Substitui o armazenamento local em
IndexedDB do frontend por persistência real: SQLite para metadados (fotos, álbuns,
tags, usuário) e arquivos de imagem no disco.

## Stack

- Node.js + Express + TypeScript
- SQLite (via `better-sqlite3`) — um único arquivo `data/photoapp.db`
- Arquivos originais e thumbnails em `data/originals/` e `data/thumbnails/`
- Autenticação por cookie httpOnly + JWT (usuário único, self-hosted)

## Rodando localmente

```bash
npm install
cp .env.example .env   # ajuste se necessário
npm run dev
```

A API sobe em `http://localhost:4000` por padrão. Na primeira execução, acesse o
frontend — ele vai pedir para criar o único usuário deste servidor (tela de setup).

## Variáveis de ambiente (`.env`)

- `PORT` — porta da API (padrão 4000)
- `JWT_SECRET` — segredo para assinar os tokens de sessão (troque em produção)
- `DATA_DIR` — onde ficam o banco SQLite e os arquivos de imagem (padrão `./data`)
- `FRONTEND_ORIGIN` — origem permitida no CORS (padrão `http://localhost:5173`)
- `COOKIE_SECURE` — `true` para exigir HTTPS no cookie de sessão (produção atrás de TLS)

## Endpoints principais

- `POST /api/auth/setup` — cria o único usuário (só funciona se nenhum existir ainda)
- `POST /api/auth/login` / `POST /api/auth/logout` / `GET /api/auth/me`
- `GET /api/photos` — lista (filtros: `albumId`, `tag`, `favorite`, `q`)
- `POST /api/photos` — upload multipart (`files`), com deduplicação por hash
- `GET /api/photos/:id/file` / `GET /api/photos/:id/thumbnail`
- `PATCH /api/photos/:id` — tags, favorito, edits (não-destrutivos)
- `POST /api/photos/:id/albums/:albumId` — associar/desassociar de um álbum
- `POST /api/photos/bulk` — ações em massa (`addToAlbum`, `addTag`, `favorite`, `delete`)
- `GET /api/photos/tags` — tags com contagem
- `GET /api/albums` / `POST /api/albums` / `DELETE /api/albums/:id`

## O que o backend NÃO faz (ainda)

- Não processa crop/rotação/filtros — isso continua no frontend (canvas), que baixa
  o arquivo original e aplica os ajustes ao vivo e na exportação.
- Não tem IA real de aprimoramento ou busca semântica — essas heurísticas locais
  continuam no frontend, como placeholder documentado no PRD.

## Scripts

- `npm run dev` — servidor com reload automático (`tsx watch`)
- `npm run build` — compila para `dist/`
- `npm run start` — roda o build de produção (`node dist/index.js`)

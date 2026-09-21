# PhotoApp — Backend

API self-hosted do PhotoApp (ver `../PRD.md`). Substitui o armazenamento local em
IndexedDB do frontend por persistência real: SQLite para metadados (fotos, álbuns,
tags, usuário) e arquivos de imagem no disco.

## Stack

- Node.js + Express + TypeScript
- SQLite (via `better-sqlite3`) — um único arquivo `data/photoapp.db`
- Arquivos originais e thumbnails em `data/originals/` e `data/thumbnails/`
- Autenticação por cookie httpOnly + JWT (usuário único, self-hosted)
- Busca semântica por IA real: modelo CLIP (`Xenova/clip-vit-base-patch32`) rodando
  localmente via `@huggingface/transformers` — sem API externa, sem enviar fotos
  para fora do servidor. Cada foto ganha um embedding no upload; a busca compara
  o embedding do texto da query com os das fotos por similaridade de cosseno.

## Rodando localmente

```bash
npm install
cp .env.example .env   # ajuste se necessário
npm run dev
```

A API sobe em `http://localhost:4000` por padrão. Na primeira execução, acesse o
frontend — ele vai pedir para criar o único usuário deste servidor (tela de setup).

> Para rodar tudo (frontend + backend) num único container, sem instalar Node
> localmente, veja o `docker-compose.yml` na raiz do projeto.

## Variáveis de ambiente (`.env`)

- `PORT` — porta da API (padrão 4000)
- `JWT_SECRET` — segredo para assinar os tokens de sessão (troque em produção)
- `DATA_DIR` — onde ficam o banco SQLite e os arquivos de imagem (padrão `./data`)
- `STATIC_DIR` — pasta com o build do frontend a servir, se existir (padrão `./public`;
  só é usada na imagem Docker — em dev essa pasta não existe e cada serviço roda solto)
- `FRONTEND_ORIGIN` — origem permitida no CORS (padrão `http://localhost:5173`;
  irrelevante quando frontend e backend são servidos juntos, como na imagem Docker)
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
- `GET /api/photos/search?q=...` — busca semântica por IA (CLIP local), retorna
  fotos ordenadas por similaridade ao texto da query
- `GET /api/albums` / `POST /api/albums` / `DELETE /api/albums/:id`

## O que o backend NÃO faz (ainda)

- Não processa crop/rotação/filtros — isso continua no frontend (canvas), que baixa
  o arquivo original e aplica os ajustes ao vivo e na exportação.
- Não tem IA real de *aprimoramento* de imagem — essa heurística local (histograma)
  continua no frontend, como placeholder documentado no PRD. A busca semântica,
  porém, já é IA real (ver acima).
- A similaridade da busca é calculada em memória a cada request (sem índice
  vetorial) — viável para bibliotecas pessoais de até dezenas de milhares de
  fotos; um volume bem maior pediria algo como sqlite-vec ou um índice dedicado.

## Recursos necessários (busca por IA)

O modelo CLIP (~600MB) é baixado uma vez e cacheado em `node_modules/@huggingface/transformers/.cache`.
Em desenvolvimento (`npm run dev`), isso acontece na primeira vez que o servidor
sobe (precisa de internet nessa primeira vez). Na imagem Docker, o modelo já vem
embutido — o build baixa e o container roda offline depois disso (ver
`scripts/warmup.mjs` e o `Dockerfile`). Rodar o modelo consome CPU/RAM extra
(algumas centenas de MB); não precisa de GPU.

## Scripts

- `npm run dev` — servidor com reload automático (`tsx watch`)
- `npm run build` — compila para `dist/`
- `npm run start` — roda o build de produção (`node dist/index.js`)

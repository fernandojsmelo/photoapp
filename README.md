# PhotoApp

Aplicativo de organização e edição de fotos, self-hosted. Ver `PRD.md` para o
documento de requisitos completo (visão, escopo, roadmap).

## Estrutura do projeto

- [`frontend/`](frontend/README.md) — React + Vite + TypeScript (interface)
- [`backend/`](backend/README.md) — Node.js + Express + SQLite (API e armazenamento)

## Rodando localmente

```bash
# terminal 1 — backend
cd backend
npm install
cp .env.example .env
npm run dev

# terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`. Na primeira execução, crie o único usuário deste
servidor self-hosted; depois disso, os dados (fotos, álbuns, tags) ficam
persistidos no backend entre sessões.

## Estado atual

- Catalogação, álbuns, tags, favoritos, busca por texto e edição não-destrutiva
  (crop, rotação, filtros) — funcionando ponta a ponta com persistência real.
- IA de aprimoramento e sugestão de tags: heurísticas locais no frontend,
  identificadas como placeholder na interface até existir um serviço de IA real.
- Busca semântica por IA: ainda não implementada (depende de um serviço de IA).
- Self-hosted single-user: sem multiusuário/compartilhamento nesta fase.

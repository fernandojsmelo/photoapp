# PhotoApp

Aplicativo de organização e edição de fotos, self-hosted. Ver `PRD.md` para o
documento de requisitos completo (visão, escopo, roadmap).

## Estrutura do projeto

- [`frontend/`](frontend/README.md) — React + Vite + TypeScript (interface)
- [`backend/`](backend/README.md) — Node.js + Express + SQLite (API e armazenamento)
- `Dockerfile` / `docker-compose.yml` — empacotam os dois num único container
  para uso self-hosted (recomendado)

## Rodando com Docker (recomendado)

```bash
cp .env.example .env
# edite .env e defina um JWT_SECRET forte (ex.: openssl rand -hex 32)

docker compose up -d --build
```

Abra `http://localhost:4000`. Frontend e API rodam juntos, num único container,
numa única porta — sem precisar instalar Node localmente. Os dados (banco SQLite
e fotos) ficam num volume Docker nomeado (`photoapp_data`), sobrevivendo a
`docker compose down` e a rebuilds da imagem (só somem com `down -v`).

Para rodar numa porta diferente, edite `PORT` no `.env`.

## Rodando sem Docker (desenvolvimento)

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

Abra `http://localhost:5173`. Nesse modo, frontend e backend rodam em processos
e portas separados (com CORS liberado entre eles) e o frontend recarrega a cada
mudança de código — mais prático para desenvolver do que reconstruir a imagem
Docker a cada alteração.

Em ambos os modos, a primeira execução pede para criar o primeiro usuário deste
servidor self-hosted (que vira administrador); depois disso, os dados (fotos,
álbuns, tags) ficam persistidos entre sessões. O administrador pode cadastrar
outras contas (ex.: família) pela tela "Usuários" dentro do app — cada pessoa
só vê as próprias fotos.

## Estado atual

- Catalogação, álbuns, tags, favoritos e edição não-destrutiva (crop, rotação,
  filtros) — funcionando ponta a ponta com persistência real.
- **Busca por IA real**: modelo CLIP rodando localmente no backend (sem API
  externa, sem enviar fotos para fora do servidor) rankeia fotos por
  significado a partir de uma descrição em texto.
- Empacotado em Docker: um único container serve frontend + API + modelo de
  IA (já embutido na imagem, roda 100% offline) — pronto para rodar num
  servidor doméstico/VPS.
- IA de *aprimoramento* de imagem e sugestão de tags: ainda heurísticas locais
  no frontend, identificadas como placeholder na interface.
- **Multiusuário administrado**: o primeiro usuário (admin) cadastra as demais
  contas pela tela "Usuários"; não há auto-registro público. Cada conta só
  enxerga suas próprias fotos e álbuns — ainda sem álbuns compartilhados entre
  contas.
- Sem HTTPS embutido: para expor na internet, coloque um reverse proxy (Caddy,
  Traefik, nginx) na frente com TLS e `COOKIE_SECURE=true`.

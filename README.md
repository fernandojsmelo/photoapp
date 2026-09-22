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

## Expondo na internet com HTTPS (self-hosted em casa)

Para acessar o PhotoApp de fora da sua rede com segurança (não só em `localhost`),
o repositório já vem com um reverse proxy [Caddy](https://caddyserver.com/) que
obtém e renova certificados HTTPS automaticamente (Let's Encrypt) — só ativa com
`--profile https`, sem afetar o uso local comum.

O Let's Encrypt exige um **domínio público** apontando para o seu servidor. Se
você está em casa com IP dinâmico e sem domínio próprio, o caminho mais simples
e gratuito é um serviço de DDNS como o [DuckDNS](https://www.duckdns.org):

1. **Crie um subdomínio grátis no DuckDNS** (ex.: `seunome.duckdns.org`) — login
   com Google/GitHub, escolha um nome, pronto. Ele já aponta para o IP atual da
   sua casa.
2. **Instale o cliente do DuckDNS** para manter o IP atualizado automaticamente
   quando ele mudar (o próprio site do DuckDNS te dá um script cron pronto para
   Linux — não faz parte deste repositório, roda à parte na máquina host, fora
   do Docker do PhotoApp).
3. **No seu roteador**, encaminhe as portas **80** e **443** (TCP) para o IP
   local da máquina onde o PhotoApp está rodando (configuração varia por
   roteador — procure por "Port Forwarding" ou "Virtual Server").
4. **No `.env`**, defina `DOMAIN` com o subdomínio do passo 1 e mude
   `COOKIE_SECURE` para `true` (agora existe HTTPS de verdade):

   ```bash
   DOMAIN=seunome.duckdns.org
   COOKIE_SECURE=true
   ```

5. **Suba com o profile `https`**:

   ```bash
   docker compose --profile https up -d --build
   ```

   Na primeira vez, o Caddy demora alguns segundos emitindo o certificado. Se
   der erro, confira: portas 80/443 realmente chegando no servidor (teste com
   `curl http://seudominio` de fora da sua rede) e que `DOMAIN` no `.env` bate
   exatamente com o domínio configurado no DuckDNS.

Se você já tem um domínio próprio (não precisa do DuckDNS), o processo é o
mesmo — só aponte o registro DNS (A/AAAA) do seu domínio para o IP público e
use esse domínio em `DOMAIN`.

> Sem domínio nenhum e só querendo testar localmente? Não precisa deste passo —
> o modo padrão (`docker compose up -d`, sem `--profile https`) já funciona
> normalmente em `http://localhost`.

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
- **HTTPS para expor na internet**: reverse proxy Caddy incluso (`docker compose
  --profile https up`), com certificado Let's Encrypt automático — só precisa
  de um domínio apontando para o servidor (ver seção acima; DuckDNS resolve
  isso de graça se você não tiver um).

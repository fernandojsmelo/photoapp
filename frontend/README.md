# PhotoApp — Frontend

Frontend do PhotoApp (ver `../PRD.md`). React + Vite + TypeScript. Consome a API do
backend (`../backend`) para persistir fotos, álbuns e tags — precisa do backend
rodando para funcionar.

## Rodando localmente

Em um terminal, suba o backend primeiro (ver `../backend/README.md`):

```bash
cd ../backend && npm install && npm run dev
```

Em outro terminal, suba o frontend:

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal (por padrão `http://localhost:5173`). Na
primeira vez, você vai ver uma tela para criar o único usuário deste servidor
self-hosted.

Se o backend não estiver em `http://localhost:4000`, configure `VITE_API_URL` em
um arquivo `.env` (veja `.env.example`).

## O que já dá para testar

- Criar conta / entrar (autenticação simples, usuário único do servidor)
- Importar fotos (botão "Importar fotos" ou arrastar e soltar na tela) — o backend
  calcula hash, lê EXIF e gera thumbnail
- Detecção de duplicatas (mesma foto importada duas vezes é ignorada)
- Organizar em álbuns e marcar com tags livres, com autocomplete de tags já usadas
- Seleção múltipla de fotos (botão "Selecionar") com ações em massa: adicionar a
  álbum (existente ou novo), adicionar tag, favoritar, excluir
- Filtrar a biblioteca por álbum ou por tag (nuvem de tags na barra lateral)
- Favoritar fotos e buscar por nome de arquivo ou tag
- Editor não-destrutivo: recorte (crop) interativo, rotação, brilho, contraste,
  saturação, exposição e presets de filtro
- "Aprimorar com IA": heurística local de auto-contraste (placeholder até um
  serviço de IA real existir, ver PRD)
- "Sugerir tags com IA": heurística local de cor dominante/luminosidade da foto
  (mesmo placeholder, não é reconhecimento de conteúdo real)
- Exportar a foto editada, já com recorte e filtros aplicados (download)
- Dados persistem no servidor: recarregar a página ou voltar depois mantém tudo

## Limitações desta versão

- Crop/rotação/filtros são aplicados no navegador (canvas), não no servidor — a
  miniatura da grade não reflete o recorte (só o visualizador e o editor refletem).
- Busca é por texto (nome/tag), não semântica — a busca por IA real depende de um
  serviço de IA que ainda não existe (ver PRD).
- "Aprimorar com IA" e "Sugerir tags com IA" são heurísticas locais (histograma e
  cor dominante), não modelos de IA reais — ficam claramente identificadas como
  tal na própria interface.

## Scripts

- `npm run dev` — servidor de desenvolvimento com hot-reload
- `npm run build` — build de produção (`tsc -b && vite build`)
- `npm run lint` — lint com oxlint
- `npm run preview` — serve o build de produção localmente

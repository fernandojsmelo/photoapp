# PhotoApp — Frontend

Primeira versão testável localmente do PhotoApp (ver `../PRD.md`), focada só em frontend.
React + Vite + TypeScript. Sem backend: fotos, álbuns e tags ficam salvos no **IndexedDB do
seu navegador** (nada sai da sua máquina nesta versão).

## Rodando localmente

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal (por padrão `http://localhost:5173`).

## O que já dá para testar

- Importar fotos (botão "Importar fotos" ou arrastar e soltar na tela)
- Detecção de duplicatas (mesma foto importada duas vezes é ignorada)
- Organizar em álbuns e marcar com tags livres, com autocomplete de tags já usadas
- Seleção múltipla de fotos (botão "Selecionar") com ações em massa: adicionar a
  álbum (existente ou novo), adicionar tag, favoritar, excluir
- Filtrar a biblioteca por álbum ou por tag (nuvem de tags na barra lateral)
- Favoritar fotos e buscar por nome de arquivo ou tag
- Editor não-destrutivo: recorte (crop) interativo, rotação, brilho, contraste,
  saturação, exposição e presets de filtro
- "Aprimorar com IA": heurística local de auto-contraste (placeholder até o backend
  de IA do PRD estar disponível)
- "Sugerir tags com IA": heurística local de cor dominante/luminosidade da foto
  (mesmo placeholder, não é reconhecimento de conteúdo real)
- Exportar a foto editada, já com recorte e filtros aplicados (download)

## Limitações desta versão

- Sem backend: nada é sincronizado entre dispositivos ou navegadores.
- Busca é por texto (nome/tag), não semântica — a busca por IA real depende do
  serviço de backend descrito no PRD.
- "Aprimorar com IA" e "Sugerir tags com IA" são heurísticas locais (histograma e
  cor dominante), não modelos de IA reais — ficam claramente identificadas como
  tal na própria interface.

## Scripts

- `npm run dev` — servidor de desenvolvimento com hot-reload
- `npm run build` — build de produção (`tsc -b && vite build`)
- `npm run lint` — lint com oxlint
- `npm run preview` — serve o build de produção localmente

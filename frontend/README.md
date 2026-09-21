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
- Organizar em álbuns e marcar com tags livres
- Favoritar fotos
- Buscar por nome de arquivo ou tag
- Editor não-destrutivo: brilho, contraste, saturação, exposição, presets, rotação
- "Aprimorar com IA": heurística local de auto-contraste (placeholder até o backend
  de IA do PRD estar disponível)
- Exportar a foto editada (download)

## Limitações desta versão

- Sem backend: nada é sincronizado entre dispositivos ou navegadores.
- Busca é por texto (nome/tag), não semântica — a busca por IA real depende do
  serviço de backend descrito no PRD.
- "Aprimorar com IA" é uma aproximação local, não um modelo de IA real.

## Scripts

- `npm run dev` — servidor de desenvolvimento com hot-reload
- `npm run build` — build de produção (`tsc -b && vite build`)
- `npm run lint` — lint com oxlint
- `npm run preview` — serve o build de produção localmente

# PRD — PhotoApp

**Documento de Requisitos do Produto** · 2026-09-21 · Autor: <fernandojsmelo@gmail.com> · Versão 0.1 · Status: rascunho

**Plataforma-alvo:** Web responsivo · **Armazenamento:** Nuvem própria (self-hosted) · **Usuários:** Single-user (MVP)

## Sumário executivo

O **PhotoApp** é um aplicativo web de organização e edição de fotos que combina um catálogo bonito e poderoso com recursos de inteligência artificial. Ele resolve a dor de acervos de fotos espalhados, difíceis de encontrar e de manter organizados, oferecendo catalogação automática, álbuns e tags flexíveis, edição não-destrutiva e busca por IA que entende o conteúdo das imagens. O MVP é pensado para um único usuário, hospedado em nuvem própria (self-hosted), acessível via navegador. A proposta é entregar, desde o começo, uma experiência que combine a curadoria visual de apps como Apple Photos/Google Photos com o controle e a privacidade de uma solução self-hosted como o Immich.

## Visão geral e problema

Fotos pessoais hoje ficam espalhadas entre câmera do celular, backups avulsos e pastas soltas no computador. O resultado é um acervo difícil de navegar: encontrar uma foto específica exige rolar centenas de miniaturas, álbuns manuais raramente são mantidos atualizados, e a edição rápida de uma foto costuma exigir abrir outro aplicativo.

O PhotoApp resolve isso reunindo catalogação, organização (álbuns e tags) e edição em um único lugar, com IA fazendo o trabalho pesado de indexar o conteúdo das fotos para busca e de aprimorar imagens automaticamente. A visão de longo prazo é um acervo pessoal que se organiza sozinho — o usuário importa fotos e o sistema cuida de identificar duplicatas, sugerir tags e deixar qualquer foto encontrável por uma descrição em linguagem natural.

## Objetivos e métricas de sucesso

| Objetivo | Métrica | Meta no MVP |
| --- | --- | --- |
| Facilitar achar uma foto | Tempo médio até encontrar uma foto específica via busca | < 15 segundos |
| Incentivar organização | % das fotos importadas que estão em pelo menos um álbum ou tag | > 60% após 30 dias de uso |
| Validar valor da IA | % de buscas realizadas usando busca semântica (vs. navegação manual) | > 30% das buscas |
| Validar aprimoramento por IA | % de fotos importadas em que o usuário aciona o enhance automático | > 20% das fotos |
| Confiabilidade do catálogo | Taxa de fotos importadas sem erro/perda de metadados | > 99% |

## Personas e usuários-alvo

O MVP atende um único perfil de conta (single-user), mas dentro dele existem três modos de uso que o produto precisa suportar bem:

- **Fotógrafo amador** — acumula milhares de fotos de câmera e celular, quer um catálogo bonito para revisitar o acervo, valoriza edição rápida sem abrir outro app. Nível técnico médio.
- **Guardião de memórias da família** — centraliza fotos de anos de celular e câmeras diferentes, prioriza organização por álbuns (viagens, datas, eventos) e busca fácil ("fotos do aniversário de 2023"). Nível técnico baixo a médio — exige interface simples.
- **Usuário avançado/entusiasta de fotografia** — quer controle fino de edição e confia no self-hosting pela privacidade dos dados. Nível técnico alto, confortável hospedando o próprio servidor.

## Escopo: MVP vs. versões futuras

| Área funcional | MVP | v2 | v3+ |
| --- | --- | --- | --- |
| Catalogação | Importação manual/pasta, EXIF, duplicatas por hash | Duplicatas por similaridade, importação de Google/Apple Photos | Sincronização automática contínua |
| Edição | Ajustes básicos, filtros, não-destrutiva, JPEG/PNG/HEIC | Suporte a RAW, curvas avançadas | Remoção de objetos por IA, camadas |
| Álbuns e tags | Álbuns em lista plana, tags livres, favoritos | Smart albums (regras automáticas) | Álbuns aninhados, colaboração |
| IA — Aprimoramento | Auto-correção de exposição/cor/nitidez | Upscaling, remoção de ruído | Estilos/presets gerados por IA |
| IA — Busca | Busca por texto livre sobre conteúdo | Busca por pessoa/rosto (opcional) | Busca por similaridade visual |
| Usuários | Single-user | — | Multiusuário e compartilhamento |

## Requisitos funcionais

### Catalogação e organização

- Importar fotos por upload manual (drag-and-drop, seleção de arquivos) e por importação de pasta.
- Ler e preservar metadados EXIF (data de captura, modelo da câmera, geolocalização) e exibi-los na visualização da foto.
- Detectar fotos duplicadas por hash exato do arquivo e avisar o usuário antes de importar novamente.
- Biblioteca central com visualização em grade (miniaturas), ordenada por data por padrão, com scroll performante mesmo com milhares de fotos.
- Suportar formatos JPEG, PNG e HEIC na importação.

### Edição de fotos

- Ajustes básicos: recorte (crop), rotação, brilho, contraste, saturação, exposição.
- Filtros e presets prontos aplicáveis com um clique.
- Edição **não-destrutiva**: o arquivo original é sempre preservado; edições ficam como uma camada reversível, com histórico simples de antes/depois.
- Exportação da versão editada mantendo o original intacto na biblioteca.
- Formatos suportados no MVP: JPEG, PNG, HEIC. Suporte a RAW fica fora do MVP (ver Perguntas em aberto e suposições).

### Álbuns e marcação (tags)

- Criação de álbuns em lista plana (sem pastas aninhadas no MVP); uma foto pode pertencer a vários álbuns ao mesmo tempo.
- Tags livres: o usuário cria e aplica qualquer tag de texto às fotos, sem taxonomia pré-definida.
- Marcar fotos como favoritas para acesso rápido.
- Filtrar a biblioteca por combinação de álbum + tag(s).

### IA — Aprimoramento (enhance)

- Botão único de "Aprimorar" que aplica auto-correção de exposição, cor e nitidez via IA no MVP.
- Processamento via API de IA em nuvem (não on-device), assumindo custo operacional por chamada a monitorar.
- Resultado do aprimoramento é reversível, consistente com a edição não-destrutiva — o usuário pode desfazer e voltar ao original.
- Evolução planejada (fora do MVP): upscaling de resolução e remoção de ruído.

### IA — Busca semântica

- Busca por texto livre descrevendo o conteúdo da cena (ex.: "praia ao pôr do sol", "cachorro no parque"), em português desde o MVP.
- Indexação assíncrona em background: cada foto importada é processada e indexada sem bloquear o uso do app.
- Resultados de busca combinam com filtros de álbum/tag já existentes.
- Evolução planejada (fora do MVP): busca por pessoa/rosto (recurso opcional, desligado por padrão por questão de privacidade) e busca por similaridade visual ("fotos parecidas com esta").

## Requisitos não-funcionais

- **Performance**: navegação fluida na biblioteca mesmo com dezenas de milhares de fotos (carregamento incremental/paginado de miniaturas).
- **Privacidade e segurança**: fotos são dado pessoal sensível (podem conter rostos e localização); acesso protegido por autenticação; dados enviados a serviços de IA externos (aprimoramento/busca) devem ser explícitos ao usuário nos termos de uso.
- **Armazenamento**: self-hosted em nuvem própria, com opção de backup local do acervo original.
- **Acessibilidade**: navegação por teclado e contraste adequado na interface do catálogo e do editor.
- **Idioma**: português como idioma principal da interface e da busca semântica desde o MVP.

## Considerações técnicas de alto nível

Sem prescrever uma stack específica neste documento, o produto vai precisar de:

- Armazenamento de arquivos de imagem (originais + versões editadas) em infraestrutura self-hosted.
- Um índice de metadados (EXIF, álbuns, tags) separado dos arquivos, para buscas e filtros rápidos.
- Integração com um serviço de IA externo (via API) para aprimoramento de imagem e para gerar embeddings/índices de busca semântica.
- Um pipeline de processamento assíncrono para indexar fotos recém-importadas sem travar a experiência de upload.

Quando a implementação técnica começar, a estrutura de pastas do repositório (ex.: `/frontend` e `/backend`, ou `/client` e `/server`) será definida separadamente, antes de iniciar o código.

## Fluxos-chave de UX

1. **Importar**: o usuário arrasta fotos ou seleciona uma pasta; o app confere duplicatas e começa a indexar em background.
2. **Organizar**: o usuário cria álbuns e aplica tags às fotos recém-importadas ou já existentes.
3. **Buscar**: o usuário digita uma descrição em linguagem natural e recebe as fotos correspondentes, podendo refinar com álbum/tag.
4. **Editar**: a partir do resultado da busca ou da biblioteca, o usuário abre uma foto, aplica ajustes ou aciona o aprimoramento por IA.
5. **Exportar**: o usuário baixa a versão editada, mantendo o original preservado na biblioteca.

## Riscos e dependências

- **Custo operacional de IA**: processamento em nuvem para aprimoramento e indexação de busca tem custo por foto/chamada, que cresce com o tamanho do acervo do usuário.
- **Dependência de serviços externos**: indisponibilidade ou mudança de preço/política do provedor de IA afeta diretamente os recursos de aprimoramento e busca.
- **Privacidade de reconhecimento facial**: caso o recurso opcional de busca por pessoa seja ativado no futuro, exige tratamento cuidadoso de dado biométrico e consentimento explícito.
- **Performance em acervos grandes**: acervos com dezenas de milhares de fotos podem degradar tempo de carregamento e indexação se não houver paginação/processamento incremental adequados.

## Fora de escopo (MVP)

- Edição ou organização de vídeos.
- Impressão física de fotos ou integração com serviços de impressão.
- Compartilhamento social público (feed, curtidas, comentários de terceiros).
- Multiusuário e colaboração entre contas (adiado para fase futura, ver Roadmap).

## Roadmap e fases

```mermaid
flowchart LR
  F0["Fase 0<br/>Importação e<br/>catalogação básica"] --> F1["Fase 1<br/>Álbuns/tags e<br/>edição básica"]
  F1 --> F2["Fase 2<br/>IA de<br/>aprimoramento"]
  F2 --> F3["Fase 3<br/>IA de busca<br/>semântica"]
  F3 --> F4["Fase 4+<br/>Multiusuário e<br/>compartilhamento"]
```

As Fases 0–3 compõem o MVP completo descrito neste documento. A Fase 4+ só avança se houver demanda validada por uso multiusuário.

## Perguntas em aberto e suposições

Já confirmado com o usuário: plataforma web responsiva, armazenamento em nuvem própria (self-hosted) e modelo single-user no MVP.

As suposições abaixo foram assumidas como ponto de partida razoável para não travar o documento, e devem ser revisadas:

| Suposição a validar | Justificativa |
| --- | --- |
| Edição é não-destrutiva | Padrão esperado em qualquer app de fotos "avançado" (Lightroom, Apple Photos) |
| Sem suporte a RAW no MVP | Processamento de RAW é pesado e caro; adiar reduz risco técnico inicial |
| Reconhecimento facial desligado por padrão | Dado biométrico exige cuidado extra de privacidade; opcional evita bloquear o MVP |
| Álbuns em lista plana (sem aninhamento) | Simplifica o modelo de dados inicial; smart albums cobrem parte da necessidade depois |
| Modelo/serviço de IA específico ainda não escolhido | Decisão técnica de arquitetura, não de produto — fica para a fase de implementação |
| Detecção de duplicata por hash exato | Baixo risco de implementação; similaridade perceptual fica como melhoria futura |
| Importação de Google Photos/Apple Photos fica para depois | Não bloqueia o valor central do MVP (catalogar o que já está no dispositivo) |
| Busca semântica em português desde o MVP | Idioma primário do usuário-alvo |

## Glossário

- **Busca semântica**: busca que entende o conteúdo/significado da imagem (não só o nome do arquivo), permitindo procurar por descrições em linguagem natural.
- **Edição não-destrutiva**: forma de editar em que o arquivo original nunca é sobrescrito; as alterações ficam como uma camada reversível.
- **EXIF**: metadados embutidos no arquivo de imagem, como data de captura, modelo da câmera e geolocalização.
- **Smart album**: álbum cujo conteúdo é gerado automaticamente por regras (ex.: "todas as fotos com a tag praia"), em vez de montado manualmente.

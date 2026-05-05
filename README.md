# YGO Proxies

Projeto mobile-first para pesquisar cartas no YGOPRODeck, montar proxies com os assets do YGOCarder e exportar um PDF A4 pronto para impressao.

## Como rodar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Fluxo

- Busca cartas no endpoint `https://db.ygoprodeck.com/api/v7/cardinfo.php`, com suporte a `pt` e `en`.
- Usa sempre `card_images[0]`, preferindo `image_url_cropped`.
- Baixa a arte da carta somente para a requisicao atual.
- Renderiza a proxy em memoria com `sharp`, sem gravar PNGs em `public/`.
- Gera o PDF no navegador com 9 cartas por pagina, em grade 3x3, cada carta com 59 mm x 86 mm.

## Vercel

O projeto esta preparado para deploy na Vercel sem persistir cartas geradas no filesystem da funcao. As pastas locais `public/cache/` e `public/generated/` continuam ignoradas para evitar que sobras de desenvolvimento sejam publicadas.

Os assets usados pela geracao ficam em:

- `public/assets/ygocarder/asset/image`
- `public/assets/ygocarder/asset/font`

As posicoes de renderizacao ficam centralizadas em `src/config/card-layout.ts`.

# Auto Empire Tycoon — Alpha 0.4

Versão web experimental do jogo para iPhone. Código HTML/JS com garagem isométrica em Canvas, mercado, negociações, vistorias, reparos, vendas, relógio e salvamento no navegador.

## Publicar no GitHub Pages

1. Entre em https://github.com/new e crie um repositório público, por exemplo `auto-empire-tycoon`.
2. Envie **o conteúdo desta pasta** (index.html, manifest.webmanifest, sw.js e pasta icons) para a raiz do repositório, usando **Add file → Upload files**. Não envie apenas o ZIP.
3. Em **Settings → Pages**, escolha **Deploy from a branch**, branch **main**, pasta **/(root)** e clique **Save**.
4. Após a publicação, acesse `https://SEU-USUARIO.github.io/auto-empire-tycoon/` no Safari. O endereço real depende do usuário e do nome do repositório.
5. No Safari, use **Compartilhar → Adicionar à Tela de Início**.

A primeira visita exige internet; depois de carregado e armazenado pelo navegador, o app pode funcionar offline. Salvamentos são locais a cada origem/navegador, não são sincronizados e podem ser apagados pelo iOS.

## Testar no computador

Execute `python3 -m http.server 8000` nesta pasta e abra http://localhost:8000.

A interface Motor District abre pela página inicial e está em `/preview/`, com showroom, seis sprites de veículos e galeria em `/preview/galeria/`. A entrada principal usa `?campaign=main` para continuar os salvamentos `autoempire_v02` da versão antiga; a prévia mantém sua campanha separada em `autoempire_preview_v06`. A galeria preserva essa escolha ao voltar ao jogo.

Para validar a prévia com Node 18 ou superior:

```sh
node tests/economy-smoke.test.js
node tests/runtime-performance.test.js
node tests/trading-identity.test.js
node tests/corporate-banking.test.js
node tests/visual-smoke.test.js
node tests/publication-smoke.test.js
```

Os testes de negociação, banco, visual e publicação usam Playwright e Chromium. No ambiente preparado, ambos estão disponíveis; em outra máquina, instale Playwright fora do repositório e configure `NODE_PATH` se necessário. `AE_CHROMIUM_PATH` permite escolher o executável do Chromium. Os testes visual e de publicação iniciam e encerram seus próprios servidores. A revisão visual cobre 320, 390, 430 e 1440 pixels e salva capturas em `/tmp/auto-empire-review` (`AE_REVIEW_DIR` altera esse destino).

Os sprites compartilham um atlas WebP sem perda em `preview/assets/fleet-atlas.webp`. Os seis recortes e nomes acessíveis ficam em `preview/js/vehicle-sprites.js`, usado pelo jogo e pela galeria. O atlas é carregado uma vez pelo navegador; os recortes preservam a proporção e não expõem carros vizinhos. A interface não depende de fontes ou imagens externas.

O módulo `runtime-performance.js` atualiza o relógio sem reconstruir os cartões quando somente o tempo muda. Ações, mudanças de dia e alterações na campanha continuam provocando a atualização completa. A economia e o formato dos salvamentos foram preservados.

O service worker registra a versão `motor-district-5101`, atualiza arquivos pela rede e mantém a interface completa em cache para uso offline. O cache antigo do jogo é substituído sem apagar o armazenamento das campanhas. O workflow `Validate game` verifica a interface e as regressões em novos pushes; o sincronizador antigo que sobrescrevia a prévia foi retirado. A publicação continua pelo GitHub Pages, branch `main`, raiz do repositório.

## Limitações

Isto é um web app instalável na tela inicial, **não** um app nativo publicado na App Store. A arte e o balanceamento ainda são provisórios. Não houve teste real no Safari do iPhone.

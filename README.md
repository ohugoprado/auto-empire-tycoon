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

## Limitações

Isto é um web app instalável na tela inicial, **não** um app nativo publicado na App Store. A arte e o balanceamento ainda são provisórios. Não houve teste real no Safari do iPhone.

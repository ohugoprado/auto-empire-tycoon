# Auto Empire Tycoon — Motor District

Jogo web experimental de gestão automotiva para iPhone, com showroom, mercado, negociações, vistorias, reparos, vendas e salvamento local. Safari e instalação pela tela inicial são os alvos prioritários; a validação em aparelho real ainda está pendente.

Consulte o [roadmap atual para iPhone](ROADMAP.md) e o [roteiro de teste em aparelhos reais](docs/TESTE-IPHONE.md). O arquivo `ROADMAP-100.md` é um backlog histórico, com estados que precisam ser reavaliados.

## Publicar no GitHub Pages

Site deste repositório: https://ohugoprado.github.io/auto-empire-tycoon/.

1. Execute as verificações antes de enviar alterações para `main`.
2. Mantenha `index.html`, `manifest.webmanifest`, `sw.js`, os ícones da raiz e toda a pasta `preview/`, incluindo scripts, estilos, imagens e galeria.
3. A configuração do repositório é **Settings → Pages → Deploy from a branch → main → /(root)**. O envio para `main` dispara a publicação automática; acompanhe o workflow de Pages e `Validate game`.
4. Após a publicação, abra o endereço acima no Safari. Para instalar, use **Compartilhar → Adicionar à Tela de Início**.

A primeira visita exige internet; depois de carregado e armazenado pelo navegador, o app pode funcionar offline. Salvamentos são locais a cada origem/navegador, não são sincronizados e podem ser apagados pelo iOS.

## Testar no computador

Execute `python3 -m http.server 8000` nesta pasta e abra http://localhost:8000.

A interface Motor District abre pela página inicial e está em `/preview/`, com showroom, seis sprites de veículos e galeria em `/preview/galeria/`. A entrada principal usa `?campaign=main` para continuar os salvamentos `autoempire_v02` da versão antiga; a prévia mantém sua campanha separada em `autoempire_preview_v06`. A galeria preserva essa escolha ao voltar ao jogo.

Para validar a prévia com Node 20 ou superior (CI usa Node 24):

```sh
node tests/economy-smoke.test.js
node tests/runtime-performance.test.js
node tests/trading-identity.test.js
node tests/corporate-banking.test.js
node tests/staff-system.test.js
node tests/backup-restore.test.js
AE_BROWSER=webkit node tests/backup-restore.test.js
node tests/visual-smoke.test.js
node tests/publication-smoke.test.js
node tests/iphone-webkit.test.js
```

Os testes de navegador usam Playwright 1.62.1. Instale-o fora do repositório, configure `NODE_PATH` se necessário e instale os motores oficiais com `playwright install --with-deps chromium webkit`. `AE_CHROMIUM_PATH` e `AE_WEBKIT_PATH` permitem selecionar os executáveis; preserve `PLAYWRIGHT_BROWSERS_PATH` se usar um cache próprio. Os testes com o app iniciam e encerram seus próprios servidores. A revisão visual do Chromium cobre 320, 390, 430 e 1440 pixels e salva capturas em `/tmp/auto-empire-review` (`AE_REVIEW_DIR` altera esse destino).

O teste WebKit usa toque emulado em cinco perfis, começando pelo iPhone 17 Pro Max oficial do Playwright: viewport 440 × 763, tela 440 × 956, escala 3. As larguras auxiliares são 320, 375, 390 e 430 pixels. Capturas e relatório ficam em `/tmp/auto-empire-webkit` (`AE_WEBKIT_REVIEW_DIR` altera o destino). O relatório distingue emulação e aparelho real. Neste ambiente WPE, a recarga offline tem exclusão explícita após reproduzir erro interno em uma página mínima independente; cache e service worker do jogo são conferidos. Offline continua testado no Chromium e pendente no iPhone real.

Eventos e Ferramentas usam `save-backups.js` para exportar/importar na campanha ativa. Antes da substituição, uma cópia recuperável fica disponível nos dois menus, com opções para restaurar ou exportar a versão anterior. Os dois formatos de JSON existentes são aceitos; cancelamentos e falhas de gravação têm regressões nos dois motores. O perfil da empresa continua compartilhado entre as campanhas, enquanto dinheiro, veículos e progresso usam chaves separadas.

A equipe usa apenas `s.empire.staff`. A migração soma as contratações dos dois sistemas antigos sem cobrar novamente, mantém benefícios comprados e preserva funcionários acima do limite atual de cinco por função. A folha única é mensal, a cada 30 dias simulados; descontos e bônus de vendedor não acumulam a mesma vantagem duas vezes.

Os sprites compartilham um atlas WebP sem perda em `preview/assets/fleet-atlas.webp`. Os seis recortes e nomes acessíveis ficam em `preview/js/vehicle-sprites.js`, usado pelo jogo e pela galeria. O atlas é carregado uma vez pelo navegador; os recortes preservam a proporção e não expõem carros vizinhos. A interface não depende de fontes ou imagens externas.

O módulo `runtime-performance.js` atualiza o relógio sem reconstruir os cartões quando somente o tempo muda. Ações, mudanças de dia e alterações na campanha continuam provocando a atualização completa. A economia e o formato dos salvamentos foram preservados.

O service worker registra a versão `motor-district-5200`, atualiza arquivos pela rede e mantém a interface completa em cache, incluindo os módulos de backup e equipe. O cache antigo do jogo é substituído sem apagar o armazenamento das campanhas. O workflow `Validate game` verifica a interface e as regressões em Chromium e WebKit nos novos pushes; o sincronizador antigo que sobrescrevia a prévia foi retirado. A publicação continua pelo GitHub Pages, branch `main`, raiz do repositório.

## Limitações

Isto é um web app instalável na tela inicial, **não** um app nativo publicado na App Store. A arte e o balanceamento ainda são provisórios. O alvo principal informado é o iPhone 17 Pro Max, com versão do iOS desconhecida. Não houve teste físico no Safari ou na versão instalada do iPhone.

# Auto Empire Tycoon — Motor District

Jogo web experimental de gestão automotiva para iPhone, com showroom, mercado, negociações, vistorias, reparos, vendas e salvamento local. Safari e instalação pela tela inicial são os alvos prioritários; a validação em aparelho real ainda está pendente.

Consulte o [mapa da empresa e suas próximas etapas](docs/MAPA-DA-EMPRESA.md), o [plano de retenção e conveniências conquistadas](docs/RETENCAO-E-PROGRESSAO.md), o [roadmap atual para iPhone](ROADMAP.md) e o [roteiro de teste em aparelhos reais](docs/TESTE-IPHONE.md). O arquivo `ROADMAP-100.md` é um backlog histórico, com estados que precisam ser reavaliados.

## Publicar no GitHub Pages

Site deste repositório: https://ohugoprado.github.io/auto-empire-tycoon/.

1. Execute as verificações antes de enviar alterações para `main`.
2. Mantenha `index.html`, `manifest.webmanifest`, `sw.js`, os ícones da raiz e toda a pasta `preview/`, incluindo scripts, estilos, imagens e galeria.
3. A configuração do repositório é **Settings → Pages → Deploy from a branch → main → /(root)**. O envio para `main` dispara a publicação automática; acompanhe o workflow de Pages e `Validate game`.
4. Após a publicação, abra o endereço acima no Safari. Para instalar, use **Compartilhar → Adicionar à Tela de Início**.

A primeira visita exige internet; depois de carregado e armazenado pelo navegador, o app pode funcionar offline. Salvamentos são locais a cada origem/navegador, não são sincronizados e podem ser apagados pelo iOS.

## Testar no computador

Execute `python3 -m http.server 8000` nesta pasta e abra http://localhost:8000.

A interface Motor District abre pela página inicial e está em `/preview/`, com showroom e galeria em `/preview/galeria/`. O catálogo tem 32 modelos, cada um com cinco imagens de pintura próprias; a galeria oferece busca, filtro por categoria e zoom. A entrada principal usa `?campaign=main` para continuar os salvamentos `autoempire_v02` da versão antiga; a prévia mantém sua campanha separada em `autoempire_preview_v06`. A galeria preserva essa escolha ao voltar ao jogo.

Para validar a prévia com Node 20 ou superior (CI usa Node 24):

```sh
node tests/economy-smoke.test.js
node tests/runtime-performance.test.js
node tests/trading-identity.test.js
node tests/corporate-banking.test.js
node tests/staff-system.test.js
node tests/commerce-campaign.test.js
AE_BROWSER=webkit node tests/commerce-campaign.test.js
node tests/auction-purchase.test.js
AE_BROWSER=webkit node tests/auction-purchase.test.js
node tests/operations-map.test.js
AE_BROWSER=webkit node tests/operations-map.test.js
node tests/factory-production.test.js
AE_BROWSER=webkit node tests/factory-production.test.js
node tests/backup-restore.test.js
AE_BROWSER=webkit node tests/backup-restore.test.js
node tests/visual-smoke.test.js
node tests/publication-smoke.test.js
node tests/vehicle-collection.test.js
AE_BROWSER=webkit node tests/vehicle-collection.test.js
node tests/first-sale-guide.test.js
AE_BROWSER=webkit node tests/first-sale-guide.test.js
node tests/iphone-webkit.test.js
```

Os testes de navegador usam Playwright 1.62.1. Instale-o fora do repositório, configure `NODE_PATH` se necessário e instale os motores oficiais com `playwright install --with-deps chromium webkit`. `AE_CHROMIUM_PATH` e `AE_WEBKIT_PATH` permitem selecionar os executáveis; preserve `PLAYWRIGHT_BROWSERS_PATH` se usar um cache próprio. Os testes com o app iniciam e encerram seus próprios servidores. A revisão visual do Chromium cobre 320, 390, 430 e 1440 pixels e salva capturas em `/tmp/auto-empire-review` (`AE_REVIEW_DIR` altera esse destino).

O teste WebKit usa toque emulado em cinco perfis, começando pelo iPhone 17 Pro Max oficial do Playwright: viewport 440 × 763, tela 440 × 956, escala 3. As larguras auxiliares são 320, 375, 390 e 430 pixels. Capturas e relatório ficam em `/tmp/auto-empire-webkit` (`AE_WEBKIT_REVIEW_DIR` altera o destino). O relatório distingue emulação e aparelho real. Neste ambiente WPE, a recarga offline tem exclusão explícita após reproduzir erro interno em uma página mínima independente; cache e service worker do jogo são conferidos. Offline continua testado no Chromium e pendente no iPhone real.

No CI, o Chromium vem da origem oficial do Google Chrome for Testing, na versão indicada pelo Playwright fixado; o WebKit usa o espelho oficial da Microsoft. Essa configuração contorna um certificado de hostname incorreto no CDN padrão, preservando a verificação HTTPS.

Eventos e Ferramentas usam `save-backups.js` para exportar/importar na campanha ativa. Antes da substituição, uma cópia recuperável fica disponível nos dois menus, com opções para restaurar ou exportar a versão anterior. Os dois formatos de JSON existentes são aceitos; cancelamentos e falhas de gravação têm regressões nos dois motores. O perfil da empresa continua compartilhado entre as campanhas, enquanto dinheiro, veículos e progresso usam chaves separadas.

A equipe usa apenas `s.empire.staff`. A migração soma as contratações dos dois sistemas antigos sem cobrar novamente, mantém benefícios comprados e preserva funcionários acima do limite atual de cinco por função. A folha única é mensal, a cada 30 dias simulados; descontos e bônus de vendedor não acumulam a mesma vantagem duas vezes.

Os 32 modelos do catálogo têm carrocerias distintas e cinco pinturas: Branco Polar, Azul Oceano, Vermelho Rubi, Grafite e Amarelo Solar. São 160 imagens geradas, reunidas nos atlases WebP sem perda `fleet-models-a.webp` até `fleet-models-h.webp` (pasta `preview/assets/`). A conversão preserva os pixels dos PNGs originais e evita 160 downloads separados. Os recortes e nomes acessíveis ficam em `preview/js/vehicle-sprites.js`, compartilhado pelo jogo e pela galeria. Não são filtros de cor sobre uma imagem única. A interface não depende de fontes ou imagens externas.

`vehicle-appearance.js` mantém modelo e pintura com o veículo durante compra, estoque, negociação e recarga. Os carros antigos recebem uma referência estável, preservando os dados da campanha; modelos personalizados da fábrica usam a carroceria de referência da categoria, identificada como ilustrativa. As 32 carrocerias exclusivas correspondem aos 32 modelos fixos do catálogo, não a qualquer nome criado pelo jogador.

O guia da primeira venda é opcional, pode ser pausado e retomado em Eventos e salva seu progresso na campanha ativa. Preparar/reparar continua opcional; avançar um dia exige uma ação explícita. O painel de progressão consulta oito marcos reais da empresa, sem duplicar recompensas; a campanha não avança enquanto está fechada. O estoque e os diálogos mostram compra, despesas registradas no veículo, investimento e lucro bruto estimado; tributos e despesas da empresa ficam separados.

A coleção passou por 1.713 verificações em cada motor (Chromium e WebKit), incluindo pixels dos 160 recortes, cores, enquadramento, filtros, zoom e migração de pinturas antigas. O fluxo industrial (pesquisa, homologação, fundação, lote, entrega e recarga) passou por 177 verificações por motor; o guia passou por 220 verificações por motor; o comércio integrado, por 163; os backups, por 175. O leilão tem 163 verificações por motor para arremate único, toques rápidos, botões antigos, recarga, renovação e campanhas separadas. Esses resultados são automatizados.

O módulo `runtime-performance.js` atualiza o relógio sem reconstruir os cartões quando somente o tempo muda. Ações, mudanças de dia e alterações na campanha continuam provocando a atualização completa. O formato dos salvamentos foi preservado, incluindo os sistemas de progressão, clientes e indústria adicionados em paralelo.

O mapa operacional da garagem abre estoque, fundação/produção e projetos com um toque. As três construções têm imagens próprias e indicadores reais de propostas, vagas, reservas, homologações e próxima entrega da fábrica principal. É um distrito esquemático; não atribui cidades às plantas nem inventa prazos de transporte. Os menus anteriores continuam disponíveis.

O leilão regional mantém um único veículo por lote de dois dias simulados. Carro e cotação ficam congelados na campanha; o primeiro arremate consome o lote e desativa o botão. Cliques repetidos, atualização do mercado e recarga não permitem comprar o mesmo lote outra vez. Caixa insuficiente, falência ou falta de vaga impedem a aquisição sem consumir a oferta. Salvamentos antigos e carros já adquiridos são preservados.

O service worker registra a versão `motor-district-9100`, atualiza arquivos pela rede e mantém a interface completa em cache, incluindo mapa, guia, progressão e as 160 imagens. O cache antigo do jogo é substituído sem apagar o armazenamento das campanhas. O workflow `Validate game` verifica a interface e as regressões em Chromium e WebKit nos novos pushes; o sincronizador antigo que sobrescrevia a prévia foi retirado. A publicação continua pelo GitHub Pages, branch `main`, raiz do repositório.

## Abrir a fabricante e produzir

1. Entre em **Garagem → Gestão → Fabricante → Fundação e gestão da fabricante**.
2. Toque em **Abrir fabricante**. A fundação custa 110.000 CR na inflação inicial; o valor atualizado e o capital que falta aparecem nessa seção. Confirme o nome e a despesa.
3. Abra **Projetos e desenvolvimento** e localize o projeto em **Projetos homologados**. Homologar salva o projeto, mas não funda a fabricante.
4. Toque em **Produzir** no projeto, escolha fábrica, pintura e quantidade e confirme o custo. O pedido precisa de caixa, linha disponível e vaga no estoque; conflitos ou falta de suprimentos também podem impedir a produção.
5. Deixe a simulação avançar pelos dias indicados. A campanha não avança fechada nem pausada; o veículo terminado aparece no estoque.

## Limitações

Isto é um web app instalável na tela inicial, **não** um app nativo publicado na App Store. A arte e o balanceamento ainda são provisórios. O alvo principal informado é o iPhone 17 Pro Max, com versão do iOS desconhecida. Não houve teste físico no Safari ou na versão instalada do iPhone.

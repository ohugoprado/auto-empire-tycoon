# Auto Empire Tycoon — roadmap para iPhone

Revisão: 23/10/2026. Alvo principal informado: iPhone 17 Pro Max; versão do iOS ainda não informada. Prioridade: tela vertical, Safari e jogo instalado pela tela inicial. A ordem das etapas representa dependências, sem promessa de prazo.

## Objetivo do jogo

Transformar uma pequena garagem em uma empresa automotiva por meio de decisões compreensíveis: encontrar um carro, avaliar o risco, negociar, preparar, anunciar, vender e reinvestir. A evolução precisa aparecer na garagem e nas possibilidades de negócio.

A próxima entrega deve tornar esse ciclo confiável e agradável no iPhone. O aumento de conteúdo vem depois da validação dessa experiência.

## Nova prioridade — conveniências conquistadas e retenção

O [plano de retenção e progressão](docs/RETENCAO-E-PROGRESSAO.md) propõe transformar a carreira existente em uma trilha de novas ferramentas: comparador, consultas salvas, ações comerciais em lote, gerentes e políticas por filial. Coleção permanente e mudanças na garagem acompanham as conquistas. Requisitos e custos são hipóteses de balanceamento, ainda não implementadas.

O primeiro incremento recomendado é um comparador de dois veículos após cinco vendas, com desbloqueio permanente e uma mudança visual da fachada. Ferramentas atuais e qualidade básica permanecem disponíveis. A automação avançada fica para uma etapa posterior, com orçamento, limites e histórico.

O [mapa da empresa](docs/MAPA-DA-EMPRESA.md) já tem três construções interativas, com imagens próprias: garagem, fabricante e projetos. Os indicadores consultam estoque, propostas, reservas, P&D e fila reais. Escritório, rede e evolução das fachadas continuam propostos.

## Situação atual e limites da validação

| Área | O que existe | O que ainda falta comprovar |
| --- | --- | --- |
| Visual | Visual navy/azul/mint, 32 carrocerias e cinco pinturas por modelo, mapa operacional de três construções e galeria interativa | Legibilidade, toque, teclado e recortes no Safari de aparelhos reais |
| Comércio | Compra até venda, guia opcional, custos comparáveis e regressão integrada com folha/dívida/tributos | Campanhas longas e experiência completa em iPhone físico |
| Compradores | Arquétipos, compatibilidade, histórico, fidelidade, clientes e indicações persistidos | Balanceamento de retorno, preferências e indicações em campanhas longas |
| Banco | Empréstimos, parcelas, amortização, carência e score; regressão dedicada | Integração econômica de longo prazo e uso pelo Safari |
| Equipe | Quadro único, migração dos dois sistemas antigos e folha mensal única | Balanceamento de campanhas longas e conferência no Safari real |
| Indústria | Projetos, P&D, fornecedores, fila, produção e previsão de capacidade | Campanha industrial completa, custos e balanceamento |
| Expansão | Cidades, subsidiárias, mercado ativo e transporte básico | Custos por unidade, progressão e consequências financeiras |
| Persistência | Importação na campanha ativa, dois formatos de backup e recuperação anterior nos dois menus | Exportação, compartilhamento e restauração pelo sistema de arquivos do iOS |
| PWA | Cache da interface, atualização e navegação offline | Instalação, retomada, atualização e armazenamento no iOS real |

O Chromium cobre economia, banco, ordenação, campanhas, interface e recarga offline. O WebKit 26.5 passou por 647 verificações de toque emulado, layout, compra, anúncio, persistência, sprites e galeria, em cinco perfis: iPhone 17 Pro Max (viewport 440 × 763; tela 440 × 956) e larguras auxiliares de 320, 375, 390 e 430 pixels. Backups também têm regressões nos dois motores. Isso complementa a validação física; não homologa Safari/iOS.

A recarga offline no WebKit/WPE deste ambiente apresenta um erro interno também em uma página mínima independente com service worker ativo e arquivos em cache. O teste registra uma exclusão explícita desse cenário. O cache do jogo foi verificado, mas navegação offline no WebKit e no iPhone permanece pendente.

## Etapa 1 — confiabilidade no iPhone · P0

**Resultado esperado:** continuar uma campanha com segurança no Safari e na versão instalada.

- [x] Corrigir as duas rotas de importação para usar a campanha ativa, preservando a outra; testar formatos antigo e atual em Chromium e WebKit.
- [x] Guardar recuperação antes da troca, permitir restaurá-la/exportá-la nos menus e testar cancelamento, arquivo inválido e falhas de armazenamento com reversão.
- [x] Unificar `s.staff` e `s.empire.staff`, com migração idempotente, benefícios antigos preservados e uma única folha a cada 30 dias simulados. Funcionários pagos acima do limite novo são mantidos; não há nova taxa de contratação na migração.
- [x] Automatizar WebKit com toque e o perfil oficial do iPhone 17 Pro Max, registrando separadamente o limite de navegação offline do ambiente.
- [ ] Validar Safari e tela inicial em aparelhos reais, seguindo [o roteiro de teste do iPhone](docs/TESTE-IPHONE.md), começando pelo iPhone 17 Pro Max informado.
- [x] Testar um ciclo completo de revenda, incluindo vistorias, reparo, anúncio, propostas da simulação, venda, tributos, folha, dívida e recarga, em Chromium e WebKit.
- [x] Impedir arremates repetidos do mesmo lote, persistindo consumo e cotação na campanha; testar toques rápidos, botões antigos, recarga, renovação, caixa e vagas nos dois motores.
- [x] Cobrir pesquisa, homologação, fundação, produção por lote, pintura, entrega e recarga com regressão em Chromium e WebKit. A abertura fica em Gestão → Fabricante, com requisitos visíveis.
- [ ] Testar uma campanha industrial completa, incluindo projeto, insumos, produção, entrega, venda e custos por período.
- [ ] Reduzir os estilos e as sobrescritas de funções antigos por partes, preservando o comportamento com testes de regressão.

**Critérios de conclusão:** importar/exportar não troca nem sobrescreve a campanha errada; compras e vendas sobrevivem à reabertura; os fluxos essenciais passam em Safari e tela inicial em iPhone pequeno e em modelo com recorte superior; não há controles encobertos pelo teclado, barra inferior ou indicador Home. Registrar modelo, versão do iOS e resultado. Sem esses registros, a compatibilidade permanece pendente.

## Etapa 2 — uma primeira venda que ensina · P1

**Resultado esperado:** o jogador entender seu primeiro negócio e conseguir escolher o próximo.

- [x] Guia opcional e retomável: comparar, comprar, avaliar preparação, anunciar, aguardar e analisar propostas. Usa ações reais e salva por campanha.
- [x] Próximo passo contextual e indicação de simulação pausada/em andamento. Avançar um dia é explícito e mantém despesas e riscos normais.
- [x] Compra, despesas no veículo, investimento, preço e lucro bruto estimado juntos. Tributos e despesas operacionais são indicados à parte.
- [x] Painel de oito marcos reais, com progresso visível e acesso à ação correspondente. Não há sequência diária nem penalidade por ausência.
- [ ] Trocar os `prompt()` restantes de ações frequentes por formulários adequados ao toque, com teclado numérico, validação e confirmação do custo.
- [ ] Consolidar alertas de propostas e tarefas úteis, agrupados e sem interromper a negociação.
- [ ] Ampliar o feedback de compra, reparo e venda, com opções de animação e som. A redução de movimento já é respeitada pelo novo visual.

**Meta proposta:** observar cinco novos jogadores e buscar que pelo menos quatro concluam uma primeira venda sem ajuda externa em até 15 minutos. Este é um objetivo a medir, não um resultado alcançado. Ajustar a progressão se o tempo de espera dominar a sessão.

## Etapa 3 — comércio com decisões melhores · P1

**Resultado esperado:** escolher e preparar um veículo ter mais importância que repetir cliques.

- Aprofundar as vistorias com pistas sobre o histórico e custos possíveis; comunicar os riscos antes da confirmação.
- Oferecer preparações diferentes: reparo essencial, revisão familiar e restauração premium. Cada escolha precisa ter custo, público e retorno próprios.
- Validar os clientes recorrentes e indicações já existentes em campanhas longas; aprofundar preferências e memória das negociações.
- Melhorar as contrapropostas existentes com poucas rodadas, razões compreensíveis e consequências proporcionais para confiança e preço.
- Transformar o arremate atual em leilões curtos por rodadas, com teto de compra escolhido pelo jogador e rivais fictícios.
- Criar encomendas opcionais com orçamento e requisitos de carro. Prazos usam dias simulados; ficar offline não deve causar punição.

**Critérios de conclusão:** nenhuma preparação garante lucro; custo total e risco são legíveis; recusar um negócio é uma opção válida; cancelamentos e valores inválidos não alteram dinheiro nem estoque; propostas, reparos e vendas têm regressões dedicadas.

## Etapa 4 — crescimento visível da concessionária · P2

**Resultado esperado:** reconhecer a evolução da empresa ao voltar ao jogo.

- Estágios visuais da garagem: espaço inicial, loja de bairro, showroom e rede. Vincular cada mudança a um marco e a uma capacidade útil.
- Base entregue: 32 modelos exclusivos, cinco pinturas por modelo e identidade preservada entre mercado, estoque e ficha. Próximo aprofundamento: estados visuais de conservação e acabamentos, com custos e efeitos claros.
- Especializações com vantagens e custos: usados econômicos, utilitários, esportivos ou restauração. Evitar uma escolha claramente superior em todas as campanhas.
- Treinamento e funções de equipe após a consolidação da etapa 1; mostrar o custo e o efeito de cada contratação.
- Objetivos alternativos: reputação, eficiência, coleção ou expansão. As conquistas atuais devem ser ampliadas e balanceadas.
- Relatório de fim de período com vendas, despesas, capital imobilizado e resultado. Usar definições financeiras consistentes.

**Critérios de conclusão:** marcos preservados em saves antigos; evolução reconhecível sem depender de textos; configurações visuais continuam leves no iPhone; objetivos não exigem acesso diário.

## Etapa 5 — indústria e rede com profundidade · P2/P3

**Resultado esperado:** os sistemas industriais e de expansão existentes formarem uma segunda etapa do jogo.

- Consolidar custos e efeitos dos sistemas atuais de fábrica, projetos, fornecedores, planejamento e concorrentes.
- Mostrar fila de produção e entregas em uma visão compreensível, com capacidade, prazo e custo antes da confirmação.
- Testar qualidade de lotes, garantia e possíveis recalls antes de ampliar a variedade de peças e modelos.
- Introduzir gestão por filial com responsabilidades e resultados claros; acrescentar logística avançada apenas quando o transporte básico estiver estável.
- Fazer a concorrência existente afetar escolhas comerciais de forma explicável e testável.
- Simular campanhas de diferentes dificuldades, começando por cenários pequenos e reproduzíveis; aumentar para centenas de sementes quando o núcleo puder rodar sem depender da interface.

**Critérios de conclusão:** uma cadeia completa de projeto, compra de insumos, fabricação, entrega e venda é testada; nenhuma combinação gera dinheiro infinito ou falência inevitável; ampliar a empresa acrescenta escolhas sem multiplicar tarefas repetitivas.

## Cinco ideias que podem dar identidade ao jogo

| Ideia | Exemplo de experiência | Primeira versão pequena |
| --- | --- | --- |
| Clientes que voltam | Quem comprou um compacto retorna buscando um carro para a família | Aprofundar os clientes e indicações já existentes, com orçamento e memória comercial |
| Carros com história | Uma vistoria revela uso intenso, documentação ou reparo anterior | Uma pista e uma consequência econômica por veículo |
| Oficina com estratégia | Preparar para economia ou acabamento muda o público interessado | Duas opções de preparação com custos claros |
| Leilão com limite | O jogador define o máximo que pode pagar e acompanha a disputa | Até três rodadas, um veículo e poucos rivais |
| Garagem como registro da campanha | A primeira grande venda transforma parte do showroom | Uma melhoria visual associada a um marco existente |

## O que adiar

- Multiplayer, contas, mercado entre jogadores e sincronização em nuvem: exigem segurança, infraestrutura e regras próprias. Não são necessários para validar a campanha individual.
- Marcas e modelos reais: trabalhar primeiro com o catálogo fictício e sua identidade visual.
- Mundo 3D livre, dezenas de moedas e muitas filiais simultâneas: custo alto antes de comprovar a diversão do comércio e a estabilidade do iPhone.
- Monetização e publicação na App Store: decidir depois da validação no Safari e como PWA. Um app para a loja exigirá um projeto próprio de distribuição, testes e políticas.

## Próxima entrega recomendada

Na versão `motor-district-9001`, o foco passou a ser uma primeira venda compreensível, progressão visível, layout móvel compacto e catálogo de 160 pinturas. As correções de backup, diálogos e equipe da entrega anterior continuam cobertas por regressões.

A próxima validação externa é executar o roteiro de Safari e tela inicial no iPhone 17 Pro Max real, registrar a versão do iOS e corrigir os bloqueadores encontrados. Em paralelo, iniciar a primeira conquista prática e visual do plano de retenção, completar o cenário industrial e observar novos jogadores para calibrar o ritmo. A meta de quatro entre cinco jogadores concluindo uma primeira venda ainda não foi medida.

## Relação com o backlog antigo

[ROADMAP-100.md](ROADMAP-100.md) permanece como fonte histórica de ideias. Seu estado não representa a versão atual: banco com amortização, contrapropostas, parte dos clientes, testes, otimização e CI já existem. Itens antigos devem ser reavaliados como consolidação, aprofundamento ou cobertura de testes, em vez de reiniciados como funcionalidades novas.

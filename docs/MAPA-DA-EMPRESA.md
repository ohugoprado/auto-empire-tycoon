# Mapa da empresa e imagens que orientam o jogador

Proposta visual · 23/10/2026. A imagem abaixo é um conceito gerado, não uma captura de uma funcionalidade implementada. O mapa interativo ainda não está no jogo.

![Conceito de distrito automotivo com garagem, concessionária, fabricante, oficina, projetos e área de expansão](assets/operations-map-concept.webp)

## Primeira versão útil

Um painel visual da operação com três construções grandes: **garagem, fabricante e centro de projetos**. Tocar numa construção abre a tela real correspondente. Depois entram escritório e rede industrial. O mapa complementa os menus atuais.

| Ponto tocável | Informação útil | Ação |
| --- | --- | --- |
| Garagem / showroom | Estoque, vagas e propostas pendentes | Abrir estoque ou analisar propostas |
| Fabricante | Aberta ou não, linhas ocupadas e próxima entrega | Abrir fundação ou ordens de produção |
| Projetos | Pontos P&D e modelos homologados | Abrir desenvolvimento e escolher projeto |
| Escritório | Caixa, reputação e alertas financeiros | Abrir Gestão / Finanças |
| Rede industrial | Plantas e ordens por unidade | Selecionar unidade e administrar produção |

Cada prédio mostra um estado legível: **a construir, disponível, trabalhando ou precisa de atenção**. Ícone e texto acompanham a cor. Exemplos: “Estoque cheio”, “2/4 linhas ocupadas”, “Entrega em 3 dias”. Uma fábrica ainda fechada mostra o custo de fundação ao toque, em vez de deixar o jogador procurar o botão em outro menu.

No iPhone, os alvos têm pelo menos 44 × 44 pontos. O toque abre um painel inferior com uma ação principal. Nomes, sinais e números importantes devem ser elementos da interface; a ilustração serve de cenário. Animações são discretas, opcionais e respeitam a redução de movimento. O mapa só atualiza quando estoque, fila ou estado da empresa muda.

## Outras imagens que ajudam a jogar

- **Fábrica por dentro:** visão em corte com os veículos do lote e uma barra do prazo total. A cena trabalha apenas quando há ordens; informa quando falta vaga ou a produção está suspensa. Etapas detalhadas de montagem exigem uma mecânica própria antes de serem apresentadas como reais.
- **Fluxo visual do veículo:** cartões e setas ligando projeto homologado, ordem, produção e estoque. Cada etapa leva ao próximo comando e explica o requisito que falta.
- **Álbum de modelos e pinturas:** aproveitar as 160 imagens para registrar conquistas e histórico de posse. Completar famílias rende exposição, placas e decoração. O catálogo atual continua acessível.
- **Clientes reconhecíveis:** retratos, preferências e pequenos objetivos para os compradores existentes. O retorno de um cliente conecta uma história a uma nova decisão comercial.
- **Garagem que cresce:** fachada, piso, iluminação, escritório, equipe e troféus mudam com os marcos. O jogador reconhece o que conquistou ao voltar.

O conceito inclui uma oficina e um terreno de expansão como possibilidades visuais futuras. Isso não significa que já existam prédios independentes ou novas capacidades no jogo.

## Separar operação e geografia

O primeiro mapa é esquemático: mostra a organização da empresa. A rede geográfica pode ser uma segunda visão, apoiada nas 16 cidades e nas filiais existentes.

Hoje a fabricante principal e até cinco plantas adicionais compartilham fila e estoque. `plantId` identifica a unidade, mas as plantas não têm cidade ou coordenadas persistidas. A entrega ocorre no avanço dos dias; não existe percurso de caminhão com prazo próprio. Antes de posicionar fábricas num mapa mundial, precisamos definir localização da fábrica, destino da ordem e regras de transporte. Os saves antigos precisam de uma migração explícita.

## Evolução junto da campanha

Começo: garagem pequena e silhueta da futura fabricante. Primeiras conquistas: letreiro, exposição e decoração. Meio de jogo: showroom, escritório e primeiras unidades. Late game: campus industrial, visão da rede e controles avançados dos gerentes conquistados.

Prioridade: **usar a imagem para encontrar e executar uma ação**. A primeira entrega deve provar que as pessoas conseguem abrir a fabricante e acompanhar uma ordem pelo mapa; depois ampliamos o cenário.

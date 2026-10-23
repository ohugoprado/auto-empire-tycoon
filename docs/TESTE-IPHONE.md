# Validação do Auto Empire Tycoon no iPhone

## Estado atual

Pendente: teste físico no Safari e na versão instalada pela tela inicial. Chromium em janelas pequenas e WebKit automatizado não comprovam, sozinhos, funcionamento em iPhone. Não registrar aprovação sem executar os cenários no aparelho indicado.

O app atual é uma PWA. Instalar pela tela inicial não equivale a publicar um app na App Store.

O usuário informou **iPhone 17 Pro Max**; a versão do iOS ainda não foi informada. Esse é o alvo principal do roteiro físico.

Na versão `motor-district-9001`, o WebKit 26.5 passou por 647 verificações automatizadas em cinco perfis móveis, incluindo o descriptor oficial do iPhone 17 Pro Max (viewport 440 × 763 e tela 440 × 956, escala 3). Foram exercitados toque, criação de empresa, compra, anúncio, recarga, filtros, campanhas separadas, sprites e galeria de 32 modelos. O ciclo de revenda com folha, tributos e dívida tem regressão nos dois motores, incluindo consistência da proposta ao cancelar, reabrir e recarregar. Guia e coleção têm testes adicionais; nenhum resultado automatizado equivale a uma sessão humana no iPhone.

Uma verificação de navegação offline foi excluída explicitamente: o WebKit/WPE deste ambiente falha com erro interno também em uma página mínima independente, já controlada por service worker e com arquivos em cache. O cache do jogo foi conferido; recarga offline continua sem aprovação nesse motor. O teste offline do Chromium permanece obrigatório. Não extrapolar nenhum desses resultados para instalação, teclado, compartilhamento, áreas seguras ou retomada do iOS real.

## Matriz inicial

| Perfil | Ambiente | Foco |
| --- | --- | --- |
| **iPhone 17 Pro Max do usuário; iOS a registrar** | Safari e tela inicial | Alvo principal, Dynamic Island, áreas seguras, teclado e retomada |
| iPhone pequeno, por exemplo SE de 2020/2022 | Safari e tela inicial | Espaço reduzido, teclado, formulários e barra inferior |
| iPhone com notch ou Dynamic Island | Safari e tela inicial | Recorte superior, áreas seguras e indicador Home |
| iPhone de tela grande, quando disponível | Safari e tela inicial | Proporções, alcance dos controles e tipografia |

Registrar modelo exato e versão instalada do iOS. A meta inicial é validar versões recentes do iOS; a política oficial de versões suportadas só deve ser definida após os testes. Não prometer suporte a todos os modelos de iPhone.

## Preparação

1. Usar uma campanha de teste sem substituir o progresso pessoal. Exportar um backup antes de testar migrações ou importações.
2. Abrir o endereço público por HTTPS, anotar a versão do jogo e testar com rede disponível.
3. Criar uma campanha na entrada principal e outra na prévia, com nomes e saldos distinguíveis.
4. Depois do primeiro carregamento completo, repetir os cenários indicados sem conexão.
5. Repetir no app adicionado à tela inicial; não presumir que seus dados estarão compartilhados com a sessão do Safari. Verificar esse comportamento no aparelho.

## Cenários obrigatórios

| ID | Procedimento | Resultado esperado |
| --- | --- | --- |
| IP-01 | Abrir, criar empresa e visitar garagem, mercado, finanças e eventos | Sem erro visível, tela vazia ou rolagem horizontal |
| IP-02 | Ver showroom, 32 modelos da galeria, cinco cores de cada um e zoom | Cada modelo e cor têm imagem própria, completa e sem partes de carros vizinhos; o veículo mantém sua pintura após compra e recarga |
| IP-03 | Focar todos os campos da criação de empresa e negociação | Campo e ação principal alcançáveis com teclado aberto; sem zoom automático inesperado |
| IP-04 | Navegar usando apenas toque | Controles essenciais com área de pelo menos 44 × 44 pontos e separados adequadamente |
| IP-05 | Abrir e rolar diálogos longos | Conteúdo e botão de fechar acessíveis; barra de endereço e indicador Home não encobrem ações |
| IP-06 | Comprar, vistoriar, reparar, anunciar e vender um carro | Valores e estoque corretos; custo e confirmação claros; progresso persiste após reabrir |
| IP-07 | Ordenar e filtrar mercado e estoque | Categoria, nome, margem, preço e ação pertencem ao mesmo veículo |
| IP-08 | Contratar e amortizar um empréstimo; avançar dias | Valores finitos, juros identificados por período e parcelas coerentes |
| IP-09 | Migrar save antigo, contratar equipe e avançar até o dia 30 | Funcionários e benefícios preservados; uma única folha mensal; nenhum desconto ou bônus duplicado |
| IP-10 | Criar projeto, iniciar produção e acompanhar entrega | Insumos, prazo, caixa e vagas consistentes; sem necessidade de digitar códigos de cidade para tarefas comuns após a melhoria prevista |
| IP-11 | Salvar, sair do Safari, bloquear e desbloquear o aparelho | Retomada mantém dinheiro, veículos e anúncios; pausa do tempo é compreensível |
| IP-12 | Encerrar o app e voltar; repetir após pressão de memória quando possível | Sem redefinição silenciosa de campanha; registrar qualquer perda ou falha de armazenamento |
| IP-13 | Exportar backup pelo Safari e pela tela inicial | Arquivo recuperável pelo sistema de arquivos ou compartilhamento do iOS |
| IP-14 | Importar pelos dois menus, em principal e prévia; restaurar/exportar a versão anterior | Só a campanha escolhida é substituída; a outra permanece intacta; recuperação disponível. O perfil da empresa é global e compartilhado, podendo mudar nas duas entradas |
| IP-15 | Tentar importar arquivo inválido e cancelar a confirmação | Nenhuma campanha é alterada; erro apresentado de forma compreensível |
| IP-16 | Após carregar, ativar modo avião e reabrir | Interface, sprites, galeria e campanha disponíveis; ausência de rede comunicada quando necessário |
| IP-17 | Voltar à rede e carregar uma atualização do jogo | Nova versão aparece sem apagar nem misturar campanhas |
| IP-18 | Aumentar texto e ativar redução de movimento | Conteúdo essencial continua acessível e não depende de animação |
| IP-19 | Jogar uma sessão de 15 minutos | Sem travamentos; registrar aquecimento, lentidão, toques perdidos e tempo excessivo de espera |
| IP-20 | Iniciar, pausar, retomar e concluir o guia da venda | Etapa salva na campanha correta; preparação opcional; avanço de um dia apenas por toque; custos e lucro estimado compreensíveis |
| IP-21 | Concluir um marco e voltar ao painel | Progresso acompanha a campanha real, sem recompensa duplicada; guia e painel não apresentam ações conflitantes |
| IP-22 | Abrir Gestão → Fabricante, pesquisar, homologar, fundar e produzir duas unidades com cor escolhida | Fundação mostra custo e capital faltante; homologação não funda automaticamente; cancelamentos não cobram; linhas, caixa, vagas e crises têm motivos visíveis; carros chegam após os dias simulados e permanecem após recarga |

O defeito da chave fixa na importação por ferramentas foi corrigido. As duas rotas usam o mesmo serviço de backup da campanha ativa. Cancelamento, arquivo inválido e falhas nas etapas de gravação têm testes com preservação da campanha; o seletor de arquivos, download e compartilhamento ainda precisam ser exercitados no aparelho.

## Como registrar

Copiar a ficha por ambiente testado:

```text
Data:
Versão/commit do jogo:
Modelo do iPhone:
Versão do iOS:
Modo: Safari / tela inicial
Rede: online / offline / troca de rede
Cenário:
Resultado: passou / falhou / não executado
Passos e resultado observado:
Evidência:
```

## Critério para declarar suporte

Aprovar os fluxos essenciais em Safari e tela inicial, em aparelho pequeno e aparelho com recorte superior, sem defeitos abertos de perda de progresso, importação na campanha errada, impossibilidade de compra/venda ou controles encobertos. Cada ambiente pendente precisa permanecer identificado como não testado.

Resultados automatizados complementam esse registro. Não substituir observações de teclado, gestos, compartilhamento, armazenamento e retomada do iOS por testes de viewport.

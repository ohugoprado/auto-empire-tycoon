# Pacote Alpha 0.8 — Aprovação industrial assistida

## Diagnóstico confirmado no código
- `preview/js/industrial-planning.js` mostra botão "Programar novo lote" e aciona `data-ae-order` no estúdio.
- `preview/js/production-orders.js` já possui diálogo, cálculo de capacidade, vagas, custo e confirmação, e cria `industrialOrders`.
- O fluxo atual confere saldo total, mas não incorpora explicitamente a reserva financeira da política assistida. Não criar um segundo motor de fabricação.

## Escopo de implementação
1. Expor uma ação "Aprovar lote sugerido" por modelo no planejamento; encaminhar ao diálogo existente, preenchendo a quantidade sugerida, sem disparar confirmação automática.
2. Recalcular no clique final: modelo ainda homologado/ativo, fábrica compatível, capacidade, lote ativo, crise, vagas, custo, saldo e reserva de caixa. Bloquear se saldo após compra ficar abaixo da reserva.
3. Tratar duplo clique: bloquear o botão enquanto a transação ocorre; gerar uma única ordem e um único débito.
4. Revalidar o modelo e a fábrica depois do diálogo de confirmação, pois o estado pode mudar.
5. Manter custos e regras no motor de produção existente, sem duplicação no dashboard.
6. UX iPhone: resumo de investimento, reserva restante, motivos do bloqueio, botões com alvo mínimo de 44 px, contraste grafite/dourado e mensagens acessíveis.
7. Não alterar partidas salvas existentes nem publicar antes da validação.

## Testes de aceitação
- Lote aprovado: um débito, uma ordem, quantidade correta.
- Duplo toque: nenhuma duplicação.
- Caixa insuficiente ou reserva violada: nenhuma mutação.
- Capacidade esgotada, fábrica incompatível, modelo aposentado, crise ativa: bloqueio.
- Mudança de saldo entre sugestão e confirmação: cotação recalculada.
- Estoque lotado: regra existente preservada.
- Exportação/importação e recarga no Safari do iPhone: ordem e política persistem.
- Layout do diálogo em viewport de iPhone: sem sobreposição, rolagem e foco utilizáveis.

## Critério de publicação
Testes automatizados, revisão manual no iPhone, PR e merge apenas após validação; publicação somente com autorização do usuário.

export const ORDEM = ['AGUARDANDO_PAGAMENTO', 'PAGO', 'EM_PREPARO', 'CONFERIDO', 'SAIU_PARA_ENTREGA', 'ENTREGUE'];
export const CANAIS = ['WHATSAPP', 'INSTAGRAM', 'IFOOD', '99FOOD'];

// Função pura: devolve a mensagem de erro (texto) ou null quando a transição é válida.
export function validarTransicao(pedido, para, { motivo, checklistCompleto } = {}) {
  const de = pedido.status;
  if (de === 'CANCELADO' || de === 'ENTREGUE') return 'Este pedido já foi finalizado.';
  if (para === 'CANCELADO') {
    if (!motivo) return 'Informe o motivo do cancelamento.';
    if (ORDEM.indexOf(de) > ORDEM.indexOf('CONFERIDO')) return 'Depois de conferido, o pedido não pode mais ser cancelado.';
    return null;
  }
  if (!ORDEM.includes(para)) return 'Status inválido.';
  if (para === 'PAGO') return 'Use a confirmação de pagamento para marcar o pedido como pago.';
  if (ORDEM.indexOf(para) !== ORDEM.indexOf(de) + 1) return `Não é possível ir de ${de} para ${para}.`;
  if (para === 'EM_PREPARO' && pedido.pagamentoStatus !== 'CONFIRMADO') return 'O pagamento ainda não foi confirmado.';
  if (para === 'CONFERIDO' && !checklistCompleto) return 'Complete o checklist de conferência antes de continuar.';
  return null;
}

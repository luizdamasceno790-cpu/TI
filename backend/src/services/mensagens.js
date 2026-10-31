import { all, get } from '../db.js';
import { dinheiro } from './util.js';

export const TIPOS = ['CARDAPIO', 'VALOR_E_PIX', 'PEDIDO_CONFIRMADO', 'SAIU_PARA_ENTREGA', 'RECEBIMENTO', 'PAGAMENTO_NAO_CONFIRMADO'];
export const MODELOS_PADRAO = {
  CARDAPIO: 'Olá! Este é o cardápio da {{negocio}}:\n\n{{itens}}\n\nPara pedir, é só responder aqui.',
  VALOR_E_PIX: 'Olá, {{nome}}! Seu pedido #{{numero}}:\n{{itens}}\n\nTotal: R$ {{total}}\nChave Pix: {{pix}}\n\nAssim que o pagamento for confirmado, começamos o preparo.',
  PEDIDO_CONFIRMADO: 'Pagamento confirmado, {{nome}}! Seu pedido #{{numero}} está confirmado. Prazo previsto: {{prazo}}.',
  SAIU_PARA_ENTREGA: 'Olá, {{nome}}! Seu pedido #{{numero}} está pronto e o entregador já pode retirá-lo.',
  RECEBIMENTO: 'Olá, {{nome}}! O pedido #{{numero}} chegou direitinho? Se puder, conte para nós o que achou. Obrigada!',
  PAGAMENTO_NAO_CONFIRMADO: 'Olá, {{nome}}. Não localizamos o pagamento do pedido #{{numero}}. Pode conferir? Sem a confirmação, o pedido será cancelado.',
};

export function renderizar(texto, vars) {
  return texto.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : ''));
}
export const config = () => get('SELECT * FROM configuracao WHERE id=1') || {};

export function textoCardapio() {
  const c = config();
  const modelo = get("SELECT texto FROM modelos_mensagem WHERE tipo='CARDAPIO'")?.texto || MODELOS_PADRAO.CARDAPIO;
  const itens = all('SELECT nome, preco FROM produtos WHERE ativo=1 ORDER BY nome').map((p) => `• ${p.nome} - R$ ${dinheiro(p.preco)}`).join('\n');
  return renderizar(modelo, { negocio: c.nomeNegocio || 'Doces da Lice', itens: itens || '(sem produtos cadastrados)', nome: '' });
}
export function textoPedido(tipo, pedido) {
  const c = config();
  const modelo = get('SELECT texto FROM modelos_mensagem WHERE tipo=?', tipo)?.texto || MODELOS_PADRAO[tipo];
  return renderizar(modelo, {
    nome: String(pedido.cliente.nome).split(' ')[0], numero: pedido.numero, total: dinheiro(pedido.total), pix: c.chavePix || '',
    prazo: pedido.prazoPrevisto || 'a combinar', negocio: c.nomeNegocio || 'Doces da Lice',
    itens: pedido.itens.map((i) => `${i.quantidade}x ${i.produtoNome}${i.observacao ? ` (${i.observacao})` : ''}`).join('\n'),
  });
}

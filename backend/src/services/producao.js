import { all, get, run } from '../db.js';

// Chamar dentro de uma transação. Marca cada item como PRONTA_ENTREGA ou MONTAGEM.
export function separarItensProntos(pedidoId) {
  for (const it of all('SELECT * FROM itens_pedido WHERE pedidoId=?', pedidoId)) {
    const p = get('SELECT estoquePronto FROM produtos WHERE id=?', it.produtoId);
    if (p && p.estoquePronto >= it.quantidade) {
      run('UPDATE produtos SET estoquePronto = estoquePronto - ? WHERE id=?', it.quantidade, it.produtoId);
      run("UPDATE itens_pedido SET origem='PRONTA_ENTREGA' WHERE id=?", it.id);
    } else {
      run("UPDATE itens_pedido SET origem='MONTAGEM' WHERE id=?", it.id);
    }
  }
}

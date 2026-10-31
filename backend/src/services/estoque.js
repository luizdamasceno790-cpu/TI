import { all, get, run, agora } from '../db.js';
import { erro404, erro409 } from '../errors.js';
import { arredonda } from './util.js';

export function registrarMovimento(ingredienteId, tipo, quantidade, motivo, ctx = {}) {
  run('INSERT INTO movimentos_estoque (ingredienteId, tipo, quantidade, motivo, producaoId, compraId, criadoEm) VALUES (?,?,?,?,?,?,?)',
    ingredienteId, tipo, quantidade, motivo ?? null, ctx.producaoId ?? null, ctx.compraId ?? null, agora());
}
function ingrediente(id) {
  const ing = get('SELECT * FROM ingredientes WHERE id=?', id);
  if (!ing) throw erro404('Ingrediente não encontrado.');
  return ing;
}
// Chamar dentro de uma transação quando houver mais de uma baixa.
export function baixarIngrediente(id, quantidade, ctx = {}) {
  const ing = ingrediente(id);
  if (ing.estoqueAtual < quantidade) {
    throw erro409(`Estoque insuficiente de ${ing.nome}.`, { ingredienteId: id, disponivel: ing.estoqueAtual, necessario: quantidade });
  }
  run('UPDATE ingredientes SET estoqueAtual = estoqueAtual - ? WHERE id=?', quantidade, id);
  registrarMovimento(id, 'SAIDA', quantidade, ctx.motivo || 'Baixa de estoque', ctx);
}
export function entradaIngrediente(id, quantidade, validade, ctx = {}) {
  const ing = ingrediente(id);
  run('UPDATE ingredientes SET estoqueAtual = estoqueAtual + ? WHERE id=?', quantidade, id);
  if (validade && (!ing.validadeMaisProxima || validade < ing.validadeMaisProxima)) {
    run('UPDATE ingredientes SET validadeMaisProxima=? WHERE id=?', validade, id);
  }
  registrarMovimento(id, 'ENTRADA', quantidade, ctx.motivo || 'Entrada de estoque', ctx);
}
export function ajusteIngrediente(id, quantidade, motivo) {
  const ing = ingrediente(id);
  if (ing.estoqueAtual + quantidade < 0) throw erro409('O ajuste deixaria o estoque negativo.');
  run('UPDATE ingredientes SET estoqueAtual = estoqueAtual + ? WHERE id=?', quantidade, id);
  registrarMovimento(id, 'AJUSTE', quantidade, motivo);
}

// itens: [{ produtoId, quantidade }]
export function calcularNecessidades(itens) {
  const totais = new Map();
  const produtosSemReceita = [];
  for (const it of itens) {
    const receita = get('SELECT * FROM receitas WHERE produtoId=?', it.produtoId);
    if (!receita) {
      const p = get('SELECT nome FROM produtos WHERE id=?', it.produtoId);
      produtosSemReceita.push(p ? p.nome : `Produto ${it.produtoId}`);
      continue;
    }
    for (const ri of all('SELECT * FROM receita_itens WHERE receitaId=?', receita.id)) {
      totais.set(ri.ingredienteId, (totais.get(ri.ingredienteId) || 0) + (ri.quantidade * it.quantidade) / receita.rendimento);
    }
  }
  const lista = [...totais].map(([id, necessario]) => {
    const ing = get('SELECT * FROM ingredientes WHERE id=?', id);
    const nec = arredonda(necessario);
    return { ingredienteId: id, nome: ing.nome, unidade: ing.unidade, necessario: nec, disponivel: ing.estoqueAtual, faltante: Math.max(0, arredonda(nec - ing.estoqueAtual)) };
  });
  return { suficiente: produtosSemReceita.length === 0 && lista.every((i) => i.faltante === 0), produtosSemReceita, itens: lista };
}

import { Router } from 'express';
import { all, get, run, tx, agora, bool } from '../db.js';
import { erro400, erro404, erro409, exigir, numero } from '../errors.js';
import { CANAIS, validarTransicao } from '../services/status.js';
import { separarItensProntos } from '../services/producao.js';
import { TIPOS, textoPedido } from '../services/mensagens.js';

const r = Router();

function completo(id) {
  const p = get(`SELECT p.*, c.nome AS clienteNome, c.telefone AS clienteTelefone, c.endereco AS clienteEndereco FROM pedidos p JOIN clientes c ON c.id=p.clienteId WHERE p.id=?`, id);
  if (!p) throw erro404('Pedido não encontrado.');
  p.cliente = { id: p.clienteId, nome: p.clienteNome, telefone: p.clienteTelefone, endereco: p.clienteEndereco };
  delete p.clienteNome; delete p.clienteTelefone; delete p.clienteEndereco;
  p.itens = all('SELECT i.*, pr.nome AS produtoNome FROM itens_pedido i JOIN produtos pr ON pr.id=i.produtoId WHERE i.pedidoId=? ORDER BY i.id', id);
  const ck = get('SELECT * FROM checklists WHERE pedidoId=?', id) || {};
  p.checklist = { itensOk: !!ck.itensOk, saboresOk: !!ck.saboresOk, quantidadeOk: !!ck.quantidadeOk, nomeClienteOk: !!ck.nomeClienteOk, conferidoEm: ck.conferidoEm ?? null };
  p.historico = all('SELECT * FROM historico_status WHERE pedidoId=? ORDER BY id', id);
  p.promocao = p.promocaoId ? get('SELECT id, titulo FROM promocoes WHERE id=?', p.promocaoId) : null;
  return p;
}
const registrar = (pedidoId, de, para, motivo = null) =>
  run('INSERT INTO historico_status (pedidoId, de, para, em, motivo) VALUES (?,?,?,?,?)', pedidoId, de, para, agora(), motivo);
const checklistCompleto = (id) => {
  const c = get('SELECT * FROM checklists WHERE pedidoId=?', id);
  return !!(c && c.itensOk && c.saboresOk && c.quantidadeOk && c.nomeClienteOk);
};

r.get('/', (req, res) => {
  const { status, busca, de, ate } = req.query;
  let sql = `SELECT p.id, p.numero, p.status, p.total, p.canal, p.criadoEm, p.pagamentoStatus, p.promocaoId, c.nome AS clienteNome
             FROM pedidos p JOIN clientes c ON c.id=p.clienteId WHERE 1=1`;
  const ps = [];
  if (status) { sql += ' AND p.status=?'; ps.push(status); }
  if (busca) { sql += ' AND (c.nome LIKE ? OR CAST(p.numero AS TEXT)=?)'; ps.push(`%${busca}%`, String(busca).replace('#', '')); }
  if (de) { sql += ' AND date(p.criadoEm) >= date(?)'; ps.push(de); }
  if (ate) { sql += ' AND date(p.criadoEm) <= date(?)'; ps.push(ate); }
  const itens = all(sql + ' ORDER BY p.id DESC', ...ps);
  res.json({ itens, total: itens.length });
});

r.post('/', (req, res) => {
  const b = req.body || {};
  exigir(b, ['clienteId', 'canal']);
  if (!CANAIS.includes(b.canal)) throw erro400(`canal deve ser um destes: ${CANAIS.join(', ')}.`);
  if (!get('SELECT id FROM clientes WHERE id=?', b.clienteId)) throw erro400('Cliente não encontrado.');
  if (!Array.isArray(b.itens) || b.itens.length === 0) throw erro400('Inclua pelo menos um item no pedido.');
  if (b.promocaoId && !get('SELECT id FROM promocoes WHERE id=?', b.promocaoId)) throw erro400('Promoção não encontrada.');
  const itens = b.itens.map((it) => {
    const quantidade = numero(it.quantidade, 'quantidade', { min: 1, inteiro: true });
    const prod = get('SELECT * FROM produtos WHERE id=?', it.produtoId);
    if (!prod || !prod.ativo) throw erro400(`Produto ${it.produtoId} não existe ou está inativo.`);
    return { produtoId: prod.id, quantidade, preco: prod.preco, observacao: it.observacao || null };
  });
  const total = Math.round(itens.reduce((s, i) => s + i.preco * i.quantidade, 0) * 100) / 100;
  const id = tx(() => {
    const numeroPedido = get('SELECT COALESCE(MAX(numero),0)+1 AS n FROM pedidos').n;
    const { id: pid } = run(`INSERT INTO pedidos (numero, clienteId, canal, status, total, pagamentoStatus, prazoPrevisto, observacoes, promocaoId, criadoEm)
      VALUES (?,?,?,?,?,?,?,?,?,?)`, numeroPedido, b.clienteId, b.canal, 'AGUARDANDO_PAGAMENTO', total, 'PENDENTE', b.prazoPrevisto || null, b.observacoes ?? null, b.promocaoId || null, agora());
    for (const i of itens) run('INSERT INTO itens_pedido (pedidoId, produtoId, quantidade, precoUnitario, observacao) VALUES (?,?,?,?,?)', pid, i.produtoId, i.quantidade, i.preco, i.observacao);
    run('INSERT INTO checklists (pedidoId) VALUES (?)', pid);
    registrar(pid, null, 'AGUARDANDO_PAGAMENTO');
    return pid;
  });
  res.status(201).json(completo(id));
});

r.get('/:id', (req, res) => res.json(completo(req.params.id)));

r.patch('/:id', (req, res) => {
  completo(req.params.id);
  run('UPDATE pedidos SET prazoPrevisto=COALESCE(?,prazoPrevisto), observacoes=COALESCE(?,observacoes) WHERE id=?', req.body?.prazoPrevisto ?? null, req.body?.observacoes ?? null, req.params.id);
  res.json(completo(req.params.id));
});

r.patch('/:id/status', (req, res) => {
  const { para, motivo } = req.body || {};
  exigir(req.body, ['para']);
  tx(() => {
    const p = completo(req.params.id);
    const erroMsg = validarTransicao(p, para, { motivo, checklistCompleto: checklistCompleto(p.id) });
    if (erroMsg) throw erro409(erroMsg);
    if (para === 'EM_PREPARO') separarItensProntos(p.id);
    run('UPDATE pedidos SET status=?, motivoCancelamento=? WHERE id=?', para, para === 'CANCELADO' ? motivo : p.motivoCancelamento, p.id);
    registrar(p.id, p.status, para, para === 'CANCELADO' ? motivo : null);
  });
  res.json(completo(req.params.id));
});

r.post('/:id/pagamento/confirmar', (req, res) => {
  tx(() => {
    const p = completo(req.params.id);
    if (p.status !== 'AGUARDANDO_PAGAMENTO') throw erro409('Este pedido não está aguardando pagamento.');
    run("UPDATE pedidos SET pagamentoStatus='CONFIRMADO', pagamentoConfirmadoEm=?, status='PAGO' WHERE id=?", agora(), p.id);
    registrar(p.id, p.status, 'PAGO');
  });
  res.json(completo(req.params.id));
});
r.post('/:id/pagamento/recusar', (req, res) => {
  tx(() => {
    const p = completo(req.params.id);
    if (p.status !== 'AGUARDANDO_PAGAMENTO') throw erro409('Este pedido não está aguardando pagamento.');
    run("UPDATE pedidos SET pagamentoStatus='RECUSADO', status='CANCELADO', motivoCancelamento='pagamento não confirmado' WHERE id=?", p.id);
    registrar(p.id, p.status, 'CANCELADO', 'pagamento não confirmado');
  });
  res.json(completo(req.params.id));
});

r.put('/:id/checklist', (req, res) => {
  const p = completo(req.params.id);
  if (!['EM_PREPARO', 'CONFERIDO'].includes(p.status)) throw erro409('O checklist só pode ser preenchido durante o preparo.');
  const b = req.body || {};
  const todos = !!(b.itensOk && b.saboresOk && b.quantidadeOk && b.nomeClienteOk);
  run('UPDATE checklists SET itensOk=?, saboresOk=?, quantidadeOk=?, nomeClienteOk=?, conferidoEm=? WHERE pedidoId=?',
    bool(b.itensOk), bool(b.saboresOk), bool(b.quantidadeOk), bool(b.nomeClienteOk), todos ? agora() : null, p.id);
  res.json(completo(p.id));
});

r.get('/:id/etiqueta', (req, res) => {
  const p = completo(req.params.id);
  res.json({ numero: p.numero, nomeCliente: p.cliente.nome, itens: p.itens.map((i) => ({ nome: i.produtoNome, quantidade: i.quantidade, observacao: i.observacao })) });
});

r.get('/:id/mensagens/:tipo', (req, res) => {
  if (!TIPOS.includes(req.params.tipo)) throw erro404('Tipo de mensagem inexistente.');
  const p = completo(req.params.id);
  const texto = textoPedido(req.params.tipo, p);
  res.json({ texto, whatsappUrl: `https://wa.me/${p.cliente.telefone}?text=${encodeURIComponent(texto)}` });
});
export default r;

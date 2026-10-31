import { Router } from 'express';
import { all, get } from '../db.js';
import { ORDEM } from '../services/status.js';
import { hojeISO, maisDias } from '../services/util.js';

const r = Router();
r.get('/resumo', (_q, res) => {
  const porStatus = Object.fromEntries([...ORDEM, 'CANCELADO'].map((s) => [s, 0]));
  for (const x of all('SELECT status, COUNT(*) AS n FROM pedidos GROUP BY status')) porStatus[x.status] = x.n;
  res.json({
    pedidosPorStatus: porStatus,
    pedidosHoje: get('SELECT COUNT(*) AS n FROM pedidos WHERE date(criadoEm)=date(?)', hojeISO()).n,
    entreguesHoje: get("SELECT COUNT(*) AS n FROM historico_status WHERE para='ENTREGUE' AND date(em)=date(?)", hojeISO()).n,
    aguardandoPagamento: porStatus.AGUARDANDO_PAGAMENTO,
    ingredientesAbaixoDoMinimo: all('SELECT * FROM ingredientes WHERE estoqueAtual < estoqueMinimo ORDER BY nome'),
    validadesProximas: all('SELECT * FROM ingredientes WHERE validadeMaisProxima IS NOT NULL AND validadeMaisProxima <= ? ORDER BY validadeMaisProxima', maisDias(7)),
  });
});
r.get('/promocoes', (req, res) => {
  const { de, ate } = req.query;
  let filtro = "p.status != 'CANCELADO'"; const ps = [];
  if (de) { filtro += ' AND date(p.criadoEm) >= date(?)'; ps.push(de); }
  if (ate) { filtro += ' AND date(p.criadoEm) <= date(?)'; ps.push(ate); }
  const itens = all(`SELECT pr.id AS promocaoId, pr.titulo, COUNT(p.id) AS pedidos, COALESCE(SUM(p.total),0) AS total
    FROM promocoes pr LEFT JOIN pedidos p ON p.promocaoId=pr.id AND ${filtro} GROUP BY pr.id ORDER BY pedidos DESC, pr.titulo`, ...ps);
  const sem = get(`SELECT COUNT(p.id) AS pedidos, COALESCE(SUM(p.total),0) AS total FROM pedidos p WHERE p.promocaoId IS NULL AND ${filtro}`, ...ps);
  res.json({ itens, semPromocao: sem });
});
export default r;

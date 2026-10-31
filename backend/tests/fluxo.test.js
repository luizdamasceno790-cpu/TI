import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'teste';
const { criarApp } = await import('../src/app.js');

let servidor, base, token;
const chamar = async (metodo, caminho, corpo) => {
  const res = await fetch(base + '/api/v1' + caminho, {
    method: metodo, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: res.status, corpo: await res.json() };
};
before(async () => {
  servidor = criarApp().listen(0);
  base = `http://localhost:${servidor.address().port}`;
});
after(() => servidor.close());

test('exige login', async () => {
  assert.equal((await chamar('GET', '/pedidos')).status, 401);
  const r = await chamar('POST', '/auth/login', { email: 'admin@doces.com', senha: 'errada' });
  assert.equal(r.status, 401);
  const ok = await chamar('POST', '/auth/login', { email: 'admin@doces.com', senha: 'admin123' });
  assert.equal(ok.status, 200);
  token = ok.corpo.token;
});

let clienteId, produtoId, promocaoId;
test('cadastros básicos', async () => {
  const c = await chamar('POST', '/clientes', { nome: 'Ana Souza', telefone: '(31) 98888-7777' });
  assert.equal(c.status, 201); assert.equal(c.corpo.telefone, '5531988887777'); clienteId = c.corpo.id;
  const p = await chamar('POST', '/produtos', { nome: 'Brigadeiro', preco: 10 });
  assert.equal(p.status, 201); produtoId = p.corpo.id;
  const pr = await chamar('POST', '/promocoes', { titulo: 'Promo Teste', condicao: '10% off', inicio: '2026-10-28', fim: '2026-11-05' });
  assert.equal(pr.status, 201); promocaoId = pr.corpo.id;
  const t = await chamar('GET', `/promocoes/${promocaoId}/texto`);
  assert.match(t.corpo.texto, /Promo Teste/); assert.match(t.corpo.whatsappUrl, /^https:\/\/wa\.me\/\?text=/);
});

test('pedido do início ao fim, com regras de status', async () => {
  const novo = await chamar('POST', '/pedidos', { clienteId, canal: 'IFOOD', promocaoId, itens: [{ produtoId, quantidade: 2, observacao: 'sem granulado' }] });
  assert.equal(novo.status, 201);
  const id = novo.corpo.id;
  assert.equal(novo.corpo.total, 20); assert.equal(novo.corpo.numero, 1); assert.equal(novo.corpo.status, 'AGUARDANDO_PAGAMENTO');

  assert.equal((await chamar('POST', '/pedidos', { clienteId, canal: 'TELEGRAM', itens: [{ produtoId, quantidade: 1 }] })).status, 400);
  assert.equal((await chamar('PATCH', `/pedidos/${id}/status`, { para: 'EM_PREPARO' })).status, 409);
  assert.equal((await chamar('PATCH', `/pedidos/${id}/status`, { para: 'PAGO' })).status, 409);

  const msg = await chamar('GET', `/pedidos/${id}/mensagens/VALOR_E_PIX`);
  assert.match(msg.corpo.texto, /R\$ 20,00/); assert.match(msg.corpo.texto, /chave-pix-ficticia/);
  assert.match(msg.corpo.whatsappUrl, /^https:\/\/wa\.me\/5531988887777\?text=/);

  assert.equal((await chamar('POST', `/pedidos/${id}/pagamento/confirmar`)).corpo.status, 'PAGO');
  assert.equal((await chamar('PATCH', `/pedidos/${id}/status`, { para: 'EM_PREPARO' })).status, 200);
  assert.equal((await chamar('PATCH', `/pedidos/${id}/status`, { para: 'CONFERIDO' })).status, 409);
  const ck = await chamar('PUT', `/pedidos/${id}/checklist`, { itensOk: true, saboresOk: true, quantidadeOk: true, nomeClienteOk: true });
  assert.equal(ck.corpo.checklist.itensOk, true);
  assert.equal((await chamar('PATCH', `/pedidos/${id}/status`, { para: 'CONFERIDO' })).status, 200);
  assert.equal((await chamar('PATCH', `/pedidos/${id}/status`, { para: 'SAIU_PARA_ENTREGA' })).status, 200);
  assert.equal((await chamar('PATCH', `/pedidos/${id}/status`, { para: 'CANCELADO', motivo: 'x' })).status, 409);
  assert.equal((await chamar('PATCH', `/pedidos/${id}/status`, { para: 'ENTREGUE' })).corpo.status, 'ENTREGUE');
  const hist = await chamar('GET', `/pedidos/${id}`);
  assert.equal(hist.corpo.historico.length, 6);
  const et = await chamar('GET', `/pedidos/${id}/etiqueta`);
  assert.equal(et.corpo.nomeCliente, 'Ana Souza');
});

test('cancelamento e pagamento recusado', async () => {
  const novo = await chamar('POST', '/pedidos', { clienteId, canal: 'WHATSAPP', itens: [{ produtoId, quantidade: 1 }] });
  const rec = await chamar('POST', `/pedidos/${novo.corpo.id}/pagamento/recusar`);
  assert.equal(rec.corpo.status, 'CANCELADO'); assert.equal(rec.corpo.motivoCancelamento, 'pagamento não confirmado');
});

test('estoque, produção, compra e pronta entrega', async () => {
  const ing = await chamar('POST', '/ingredientes', { nome: 'Chocolate', unidade: 'g', estoqueMinimo: 50, estoqueAtual: 100 });
  assert.equal(ing.corpo.estoqueAtual, 100);
  const receita = await chamar('PUT', `/receitas/${produtoId}`, { rendimento: 10, itens: [{ ingredienteId: ing.corpo.id, quantidade: 50 }] });
  assert.equal(receita.status, 200);
  assert.equal((await chamar('PUT', `/receitas/${produtoId}`, { rendimento: 10, itens: [{ ingredienteId: ing.corpo.id, quantidade: 5 }, { ingredienteId: ing.corpo.id, quantidade: 5 }] })).status, 400);

  const prod = await chamar('POST', '/producoes', { data: '2026-10-30', itens: [{ produtoId, quantidade: 30 }] });
  const nec = await chamar('GET', `/producoes/${prod.corpo.id}/necessidades`);
  assert.equal(nec.corpo.suficiente, false); assert.equal(nec.corpo.itens[0].necessario, 150); assert.equal(nec.corpo.itens[0].faltante, 50);

  const lib = await chamar('POST', `/producoes/${prod.corpo.id}/liberar`);
  assert.equal(lib.status, 409);
  assert.equal((await chamar('GET', `/producoes/${prod.corpo.id}`)).corpo.status, 'AGUARDANDO_COMPRA');
  assert.equal((await chamar('GET', `/ingredientes/${ing.corpo.id}`)).corpo.estoqueAtual, 100);

  const lista = await chamar('POST', '/compras/gerar-lista', { producaoId: prod.corpo.id });
  assert.equal(lista.status, 201); assert.equal(lista.corpo.itens[0].quantidadePedida, 50);
  const parcial = await chamar('POST', `/compras/${lista.corpo.id}/receber`, { itens: [{ ingredienteId: ing.corpo.id, quantidadeRecebida: 20 }] });
  assert.equal(parcial.corpo.status, 'INCOMPLETA');
  const resto = await chamar('POST', `/compras/${lista.corpo.id}/receber`, { itens: [{ ingredienteId: ing.corpo.id, quantidadeRecebida: 30, validade: '2027-01-01' }] });
  assert.equal(resto.corpo.status, 'RECEBIDA');
  assert.equal((await chamar('GET', `/ingredientes/${ing.corpo.id}`)).corpo.estoqueAtual, 150);

  assert.equal((await chamar('POST', `/producoes/${prod.corpo.id}/liberar`)).corpo.status, 'LIBERADA');
  assert.equal((await chamar('GET', `/ingredientes/${ing.corpo.id}`)).corpo.estoqueAtual, 0);
  assert.equal((await chamar('POST', `/producoes/${prod.corpo.id}/concluir`)).corpo.status, 'CONCLUIDA');
  assert.equal((await chamar('GET', '/produtos')).corpo.itens.find((p) => p.id === produtoId).estoquePronto, 30);

  const ped = await chamar('POST', '/pedidos', { clienteId, canal: 'WHATSAPP', itens: [{ produtoId, quantidade: 2 }] });
  await chamar('POST', `/pedidos/${ped.corpo.id}/pagamento/confirmar`);
  const prep = await chamar('PATCH', `/pedidos/${ped.corpo.id}/status`, { para: 'EM_PREPARO' });
  assert.equal(prep.corpo.itens[0].origem, 'PRONTA_ENTREGA');
  assert.equal((await chamar('GET', '/produtos')).corpo.itens.find((p) => p.id === produtoId).estoquePronto, 28);
});

test('painel e pedidos por promoção', async () => {
  const r = await chamar('GET', '/dashboard/resumo');
  assert.equal(r.status, 200); assert.ok(r.corpo.pedidosPorStatus.CANCELADO >= 1);
  const pr = await chamar('GET', '/dashboard/promocoes');
  assert.equal(pr.corpo.itens.find((x) => x.titulo === 'Promo Teste').pedidos, 1);
  const al = await chamar('GET', '/estoque/alertas');
  assert.equal(al.status, 200);
});

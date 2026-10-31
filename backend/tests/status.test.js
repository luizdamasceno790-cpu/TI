import test from 'node:test';
import assert from 'node:assert/strict';
import { validarTransicao } from '../src/services/status.js';

const ped = (status, pagamentoStatus = 'PENDENTE') => ({ status, pagamentoStatus });

test('fluxo válido passo a passo', () => {
  assert.equal(validarTransicao(ped('PAGO', 'CONFIRMADO'), 'EM_PREPARO'), null);
  assert.equal(validarTransicao(ped('EM_PREPARO', 'CONFIRMADO'), 'CONFERIDO', { checklistCompleto: true }), null);
  assert.equal(validarTransicao(ped('CONFERIDO', 'CONFIRMADO'), 'SAIU_PARA_ENTREGA'), null);
  assert.equal(validarTransicao(ped('SAIU_PARA_ENTREGA', 'CONFIRMADO'), 'ENTREGUE'), null);
});
test('não pula etapas', () => {
  assert.ok(validarTransicao(ped('AGUARDANDO_PAGAMENTO'), 'EM_PREPARO'));
  assert.ok(validarTransicao(ped('PAGO', 'CONFIRMADO'), 'CONFERIDO', { checklistCompleto: true }));
});
test('PAGO só pela confirmação de pagamento', () => {
  assert.ok(validarTransicao(ped('AGUARDANDO_PAGAMENTO'), 'PAGO'));
});
test('EM_PREPARO exige pagamento confirmado', () => {
  assert.ok(validarTransicao(ped('PAGO', 'PENDENTE'), 'EM_PREPARO'));
});
test('CONFERIDO exige checklist completo', () => {
  assert.ok(validarTransicao(ped('EM_PREPARO', 'CONFIRMADO'), 'CONFERIDO', { checklistCompleto: false }));
});
test('cancelamento exige motivo e só vale até CONFERIDO', () => {
  assert.ok(validarTransicao(ped('PAGO', 'CONFIRMADO'), 'CANCELADO'));
  assert.equal(validarTransicao(ped('CONFERIDO', 'CONFIRMADO'), 'CANCELADO', { motivo: 'desistiu' }), null);
  assert.ok(validarTransicao(ped('SAIU_PARA_ENTREGA', 'CONFIRMADO'), 'CANCELADO', { motivo: 'x' }));
});
test('pedido finalizado não muda mais', () => {
  assert.ok(validarTransicao(ped('ENTREGUE', 'CONFIRMADO'), 'CANCELADO', { motivo: 'x' }));
  assert.ok(validarTransicao(ped('CANCELADO'), 'PAGO'));
});

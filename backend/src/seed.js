import './env.js';
import { all, get, run } from './db.js';
import { garantirPadroes } from './padroes.js';
import { entradaIngrediente } from './services/estoque.js';
import { hojeISO, maisDias } from './services/util.js';

garantirPadroes();
if (get('SELECT COUNT(*) AS n FROM produtos').n > 0) {
  console.log('O banco já tem dados. Para recomeçar, apague o arquivo backend/data/doces.db e rode o seed de novo.');
  process.exit(0);
}
const prod = {};
for (const [nome, preco, pronto, desc] of [
  ['Brigadeiro', 4.5, 40, 'Brigadeiro tradicional'], ['Beijinho', 4.5, 20, 'Beijinho de coco'],
  ['Cajuzinho', 4.5, 0, 'Cajuzinho de amendoim'], ['Bolo de pote', 12, 0, 'Bolo de pote 200 ml'], ['Brownie', 7, 0, 'Brownie unitário'],
]) prod[nome] = run('INSERT INTO produtos (nome, descricao, preco, ativo, estoquePronto) VALUES (?,?,?,1,?)', nome, desc, preco, pronto).id;

const ing = {};
for (const [nome, un, qtd, min, validade] of [
  ['Leite condensado', 'un', 6, 4, maisDias(120)], ['Chocolate em pó', 'g', 800, 500, maisDias(200)], ['Creme de leite', 'un', 2, 4, maisDias(60)],
  ['Manteiga', 'g', 300, 200, maisDias(30)], ['Coco ralado', 'g', 150, 200, maisDias(5)], ['Farinha de trigo', 'g', 2000, 1000, maisDias(180)],
  ['Açúcar', 'g', 1500, 1000, null], ['Ovos', 'un', 12, 12, maisDias(15)], ['Granulado', 'g', 400, 200, null],
]) {
  ing[nome] = run('INSERT INTO ingredientes (nome, unidade, estoqueAtual, estoqueMinimo) VALUES (?,?,0,?)', nome, un, min).id;
  entradaIngrediente(ing[nome], qtd, validade, { motivo: 'Estoque inicial' });
}
const receita = (produto, rendimento, itens) => {
  const rid = run('INSERT INTO receitas (produtoId, rendimento) VALUES (?,?)', prod[produto], rendimento).id;
  for (const [n, q] of itens) run('INSERT INTO receita_itens (receitaId, ingredienteId, quantidade) VALUES (?,?,?)', rid, ing[n], q);
};
receita('Brigadeiro', 30, [['Leite condensado', 1], ['Chocolate em pó', 50], ['Manteiga', 20], ['Granulado', 100]]);
receita('Beijinho', 30, [['Leite condensado', 1], ['Coco ralado', 100], ['Manteiga', 20], ['Açúcar', 50]]);
receita('Brownie', 8, [['Açúcar', 200], ['Chocolate em pó', 100], ['Manteiga', 150], ['Farinha de trigo', 100], ['Ovos', 3]]);

run('INSERT INTO promocoes (titulo, descricao, condicao, inicio, fim, ativa) VALUES (?,?,?,?,?,1)',
  'Semana do Brigadeiro', 'Brigadeiros fresquinhos para a sua festa.', 'Leve 25 por R$ 100', hojeISO(), maisDias(7));
run('INSERT INTO clientes (nome, telefone, endereco, observacoes, criadoEm) VALUES (?,?,?,?,?)', 'Maria Exemplo', '5531999990001', 'Rua Exemplo, 100 - Palmeiras', 'Cliente fictícia', new Date().toISOString());
run('INSERT INTO clientes (nome, telefone, endereco, observacoes, criadoEm) VALUES (?,?,?,?,?)', 'João Exemplo', '5531999990002', 'Rua Teste, 200 - Barreiro', 'Cliente fictício', new Date().toISOString());
console.log('Dados de exemplo criados. Login: admin@doces.com / admin123');
console.log(`Produtos: ${all('SELECT id FROM produtos').length}, ingredientes: ${all('SELECT id FROM ingredientes').length}`);

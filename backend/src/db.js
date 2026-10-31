import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const caminho = process.env.DB_PATH || path.join(aqui, '..', 'data', 'doces.db');
if (caminho !== ':memory:') fs.mkdirSync(path.dirname(caminho), { recursive: true });

export const db = new DatabaseSync(caminho);
db.exec('PRAGMA foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, email TEXT UNIQUE NOT NULL, senhaHash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS configuracao (id INTEGER PRIMARY KEY CHECK (id = 1), nomeNegocio TEXT, chavePix TEXT, telefoneNegocio TEXT);
CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, telefone TEXT NOT NULL, endereco TEXT, observacoes TEXT, criadoEm TEXT);
CREATE TABLE IF NOT EXISTS produtos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, descricao TEXT, preco REAL NOT NULL, ativo INTEGER NOT NULL DEFAULT 1, estoquePronto INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS promocoes (id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT NOT NULL, descricao TEXT, condicao TEXT, inicio TEXT, fim TEXT, ativa INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS pedidos (id INTEGER PRIMARY KEY AUTOINCREMENT, numero INTEGER UNIQUE NOT NULL, clienteId INTEGER NOT NULL REFERENCES clientes(id), canal TEXT NOT NULL, status TEXT NOT NULL, total REAL NOT NULL, pagamentoStatus TEXT NOT NULL DEFAULT 'PENDENTE', pagamentoConfirmadoEm TEXT, prazoPrevisto TEXT, motivoCancelamento TEXT, observacoes TEXT, promocaoId INTEGER REFERENCES promocoes(id), criadoEm TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS itens_pedido (id INTEGER PRIMARY KEY AUTOINCREMENT, pedidoId INTEGER NOT NULL REFERENCES pedidos(id), produtoId INTEGER NOT NULL REFERENCES produtos(id), quantidade INTEGER NOT NULL, precoUnitario REAL NOT NULL, observacao TEXT, origem TEXT);
CREATE TABLE IF NOT EXISTS checklists (pedidoId INTEGER PRIMARY KEY REFERENCES pedidos(id), itensOk INTEGER NOT NULL DEFAULT 0, saboresOk INTEGER NOT NULL DEFAULT 0, quantidadeOk INTEGER NOT NULL DEFAULT 0, nomeClienteOk INTEGER NOT NULL DEFAULT 0, conferidoEm TEXT);
CREATE TABLE IF NOT EXISTS historico_status (id INTEGER PRIMARY KEY AUTOINCREMENT, pedidoId INTEGER NOT NULL REFERENCES pedidos(id), de TEXT, para TEXT NOT NULL, em TEXT NOT NULL, motivo TEXT);
CREATE TABLE IF NOT EXISTS modelos_mensagem (tipo TEXT PRIMARY KEY, texto TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ingredientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, unidade TEXT NOT NULL, estoqueAtual REAL NOT NULL DEFAULT 0, estoqueMinimo REAL NOT NULL DEFAULT 0, validadeMaisProxima TEXT);
CREATE TABLE IF NOT EXISTS movimentos_estoque (id INTEGER PRIMARY KEY AUTOINCREMENT, ingredienteId INTEGER NOT NULL REFERENCES ingredientes(id), tipo TEXT NOT NULL, quantidade REAL NOT NULL, motivo TEXT, producaoId INTEGER, compraId INTEGER, criadoEm TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS receitas (id INTEGER PRIMARY KEY AUTOINCREMENT, produtoId INTEGER UNIQUE NOT NULL REFERENCES produtos(id), rendimento REAL NOT NULL);
CREATE TABLE IF NOT EXISTS receita_itens (id INTEGER PRIMARY KEY AUTOINCREMENT, receitaId INTEGER NOT NULL REFERENCES receitas(id), ingredienteId INTEGER NOT NULL REFERENCES ingredientes(id), quantidade REAL NOT NULL);
CREATE TABLE IF NOT EXISTS producoes (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL, status TEXT NOT NULL, criadoEm TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS producao_itens (id INTEGER PRIMARY KEY AUTOINCREMENT, producaoId INTEGER NOT NULL REFERENCES producoes(id), produtoId INTEGER NOT NULL REFERENCES produtos(id), quantidade INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS compras (id INTEGER PRIMARY KEY AUTOINCREMENT, status TEXT NOT NULL, fornecedor TEXT, observacoes TEXT, criadoEm TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS compra_itens (id INTEGER PRIMARY KEY AUTOINCREMENT, compraId INTEGER NOT NULL REFERENCES compras(id), ingredienteId INTEGER NOT NULL REFERENCES ingredientes(id), quantidadePedida REAL NOT NULL, quantidadeRecebida REAL NOT NULL DEFAULT 0, precoUnitario REAL);
`);

const limpar = (r) => (r ? { ...r } : null);
export const all = (sql, ...p) => db.prepare(sql).all(...p).map(limpar);
export const get = (sql, ...p) => limpar(db.prepare(sql).get(...p));
export const run = (sql, ...p) => {
  const r = db.prepare(sql).run(...p);
  return { changes: Number(r.changes), id: Number(r.lastInsertRowid) };
};
// Não aninhar transações: chame tx() só no nível mais externo.
export function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}
export const agora = () => new Date().toISOString();
export const bool = (v) => (v ? 1 : 0);

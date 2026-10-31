import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import api from './routes/index.js';
import { garantirPadroes } from './padroes.js';

export function criarApp() {
  garantirPadroes();
  const app = express();
  app.use(cors({ origin: process.env.FRONTEND_URL || true }));
  app.use(express.json());
  app.get('/saude', (_q, res) => res.json({ ok: true }));
  app.use('/api/v1', api);
  // Se o front já foi compilado (npm run build em frontend/), a API também serve as telas.
  const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'frontend', 'dist');
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist));
    app.get(/^\/(?!api\/).*/, (_q, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.use((_q, res) => res.status(404).json({ erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Rota inexistente.' } }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _q, res, _next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    const mensagem = status >= 500 ? 'Erro interno do servidor.' : err.type === 'entity.parse.failed' ? 'JSON inválido.' : err.message;
    res.status(status).json({ erro: { codigo: err.codigo || (status === 400 ? 'DADOS_INVALIDOS' : 'ERRO_INTERNO'), mensagem, detalhes: err.detalhes } });
  });
  return app;
}

import './env.js';
import { criarApp } from './app.js';

const porta = Number(process.env.PORT || 3000);
criarApp().listen(porta, () => console.log(`API da Doces da Lice rodando em http://localhost:${porta}`));

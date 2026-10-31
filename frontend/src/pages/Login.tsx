import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api';
import { Campo, Erro } from '../ui';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  async function entrar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true); setErro('');
    try {
      const r = await api('POST', '/auth/login', { email, senha });
      setToken(r.token);
      nav('/');
    } catch (err: any) { setErro(err.message); } finally { setEnviando(false); }
  }
  return (
    <div className="login">
      <div className="card">
        <h2>🍬 Doces da Lice</h2>
        <p className="muted">Entre para gerenciar pedidos, estoque e divulgação.</p>
        <form onSubmit={entrar}>
          <Campo rotulo="E-mail"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></Campo>
          <Campo rotulo="Senha"><input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required /></Campo>
          <Erro texto={erro} />
          <button className="btn principal" style={{ width: '100%', marginTop: '.5rem' }} disabled={enviando}>{enviando ? 'Entrando...' : 'Entrar'}</button>
        </form>
      </div>
    </div>
  );
}

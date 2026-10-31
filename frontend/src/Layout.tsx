import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { getToken, setToken } from './api';

const LINKS = [
  ['/', 'Painel'], ['/pedidos', 'Pedidos'], ['/clientes', 'Clientes'], ['/cardapio', 'Cardápio'], ['/promocoes', 'Divulgação'],
  ['/estoque', 'Estoque'], ['/receitas', 'Receitas'], ['/producao', 'Produção'], ['/compras', 'Compras'], ['/configuracoes', 'Configurações'],
];
export default function Layout() {
  const nav = useNavigate();
  if (!getToken()) return <Navigate to="/login" replace />;
  return (
    <>
      <header className="topo">
        <div className="topo-linha">
          <div className="marca">🍬 Doces da Lice<span>gestão de pedidos</span></div>
          <button className="btn pequeno" onClick={() => { setToken(null); nav('/login'); }}>Sair</button>
        </div>
        <nav className="menu">
          {LINKS.map(([to, nome]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'ativo' : '')}>{nome}</NavLink>)}
        </nav>
      </header>
      <main className="conteudo"><Outlet /></main>
    </>
  );
}

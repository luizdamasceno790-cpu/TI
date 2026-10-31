import { Route, Routes } from 'react-router-dom';
import Layout from './Layout';
import Login from './pages/Login';
import Painel from './pages/Painel';
import Pedidos from './pages/Pedidos';
import NovoPedido from './pages/NovoPedido';
import PedidoDetalhe from './pages/PedidoDetalhe';
import Etiqueta from './pages/Etiqueta';
import Clientes from './pages/Clientes';
import Cardapio from './pages/Cardapio';
import Promocoes from './pages/Promocoes';
import Estoque from './pages/Estoque';
import Receitas from './pages/Receitas';
import Producao from './pages/Producao';
import Compras from './pages/Compras';
import Configuracoes from './pages/Configuracoes';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Painel />} />
        <Route path="/pedidos" element={<Pedidos />} />
        <Route path="/pedidos/novo" element={<NovoPedido />} />
        <Route path="/pedidos/:id" element={<PedidoDetalhe />} />
        <Route path="/pedidos/:id/etiqueta" element={<Etiqueta />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/cardapio" element={<Cardapio />} />
        <Route path="/promocoes" element={<Promocoes />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/receitas" element={<Receitas />} />
        <Route path="/producao" element={<Producao />} />
        <Route path="/compras" element={<Compras />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Route>
    </Routes>
  );
}

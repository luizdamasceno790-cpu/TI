import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, brl, CANAIS, useDados } from '../api';
import { Campo, Carregando, Erro, Modal, Tela } from '../ui';

interface Linha { produtoId: string; quantidade: string; observacao: string }

export default function NovoPedido() {
  const nav = useNavigate();
  const clientes = useDados('/clientes');
  const produtos = useDados('/produtos?ativo=true');
  const promocoes = useDados('/promocoes?ativa=true');
  const [clienteId, setClienteId] = useState('');
  const [canal, setCanal] = useState('WHATSAPP');
  const [promocaoId, setPromocaoId] = useState('');
  const [prazo, setPrazo] = useState('');
  const [obs, setObs] = useState('');
  const [linhas, setLinhas] = useState<Linha[]>([{ produtoId: '', quantidade: '1', observacao: '' }]);
  const [erro, setErro] = useState('');
  const [novoCliente, setNovoCliente] = useState(false);
  const [nc, setNc] = useState({ nome: '', telefone: '', endereco: '' });

  if (!clientes.dados || !produtos.dados || !promocoes.dados) return <Carregando />;
  const preco = (id: string) => produtos.dados.itens.find((p: any) => String(p.id) === id)?.preco || 0;
  const total = linhas.reduce((s, l) => s + preco(l.produtoId) * (Number(l.quantidade) || 0), 0);
  const mudar = (i: number, campo: keyof Linha, v: string) => setLinhas(linhas.map((l, j) => (j === i ? { ...l, [campo]: v } : l)));

  async function salvarCliente(e: FormEvent) {
    e.preventDefault();
    try {
      const c = await api('POST', '/clientes', nc);
      clientes.recarregar(); setClienteId(String(c.id)); setNovoCliente(false); setNc({ nome: '', telefone: '', endereco: '' });
    } catch (err: any) { setErro(err.message); }
  }
  async function salvar(e: FormEvent) {
    e.preventDefault(); setErro('');
    const itens = linhas.filter((l) => l.produtoId).map((l) => ({ produtoId: Number(l.produtoId), quantidade: Number(l.quantidade), observacao: l.observacao || undefined }));
    try {
      const p = await api('POST', '/pedidos', { clienteId: Number(clienteId), canal, promocaoId: promocaoId ? Number(promocaoId) : undefined, prazoPrevisto: prazo || undefined, observacoes: obs || undefined, itens });
      nav(`/pedidos/${p.id}`);
    } catch (err: any) { setErro(err.message); }
  }
  return (
    <Tela titulo="Novo pedido">
      <form onSubmit={salvar}>
        <div className="card">
          <div className="linha">
            <Campo rotulo="Cliente">
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
                <option value="">Selecione...</option>
                {clientes.dados.itens.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <button type="button" className="btn pequeno" onClick={() => setNovoCliente(true)}>+ Novo cliente</button>
            </Campo>
            <Campo rotulo="Canal do pedido"><select value={canal} onChange={(e) => setCanal(e.target.value)}>{CANAIS.map((c) => <option key={c.v} value={c.v}>{c.r}</option>)}</select></Campo>
            <Campo rotulo="Promoção (opcional)">
              <select value={promocaoId} onChange={(e) => setPromocaoId(e.target.value)}>
                <option value="">Sem promoção</option>
                {promocoes.dados.itens.map((p: any) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Prazo previsto" dica="Aparece na mensagem de confirmação."><input value={prazo} onChange={(e) => setPrazo(e.target.value)} placeholder="ex.: sábado, 15h" /></Campo>
          </div>
        </div>
        <div className="card">
          <h3>Itens</h3>
          {linhas.map((l, i) => (
            <div key={i}>
              <div className="linha-item">
                <Campo rotulo={i === 0 ? 'Produto' : ''}>
                  <select value={l.produtoId} onChange={(e) => mudar(i, 'produtoId', e.target.value)} required>
                    <option value="">Selecione...</option>
                    {produtos.dados.itens.map((p: any) => <option key={p.id} value={p.id}>{p.nome} - {brl(p.preco)}</option>)}
                  </select>
                </Campo>
                <Campo rotulo={i === 0 ? 'Qtd' : ''}><input type="number" min="1" value={l.quantidade} onChange={(e) => mudar(i, 'quantidade', e.target.value)} required /></Campo>
                <button type="button" className="btn perigo pequeno" style={{ marginBottom: '.75rem' }} disabled={linhas.length === 1} onClick={() => setLinhas(linhas.filter((_, j) => j !== i))}>Remover</button>
              </div>
              <Campo rotulo=""><input placeholder="Observação (sabor, detalhe)" value={l.observacao} onChange={(e) => mudar(i, 'observacao', e.target.value)} /></Campo>
            </div>
          ))}
          <button type="button" className="btn" onClick={() => setLinhas([...linhas, { produtoId: '', quantidade: '1', observacao: '' }])}>+ Adicionar item</button>
          <Campo rotulo="Observações do pedido"><textarea value={obs} onChange={(e) => setObs(e.target.value)} /></Campo>
          <h3>Total: {brl(total)}</h3>
          <Erro texto={erro} />
          <button className="btn principal">Criar pedido</button>
        </div>
      </form>
      {novoCliente && (
        <Modal titulo="Novo cliente" onFechar={() => setNovoCliente(false)}>
          <form onSubmit={salvarCliente}>
            <Campo rotulo="Nome"><input value={nc.nome} onChange={(e) => setNc({ ...nc, nome: e.target.value })} required /></Campo>
            <Campo rotulo="Telefone com DDD"><input value={nc.telefone} onChange={(e) => setNc({ ...nc, telefone: e.target.value })} required /></Campo>
            <Campo rotulo="Endereço"><input value={nc.endereco} onChange={(e) => setNc({ ...nc, endereco: e.target.value })} /></Campo>
            <button className="btn principal">Salvar cliente</button>
          </form>
        </Modal>
      )}
    </Tela>
  );
}

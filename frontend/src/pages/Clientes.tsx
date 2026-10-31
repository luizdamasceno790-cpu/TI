import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useDados } from '../api';
import { Campo, Carregando, Erro, Modal, Tela, Vazio } from '../ui';

const VAZIO = { nome: '', telefone: '', endereco: '', observacoes: '' };
export default function Clientes() {
  const [busca, setBusca] = useState('');
  const { dados, erro, carregando, recarregar } = useDados(`/clientes?busca=${encodeURIComponent(busca)}`);
  const [edit, setEdit] = useState<any>(null);
  const [erroForm, setErroForm] = useState('');
  async function salvar(e: FormEvent) {
    e.preventDefault(); setErroForm('');
    try {
      if (edit.id) await api('PUT', `/clientes/${edit.id}`, edit); else await api('POST', '/clientes', edit);
      setEdit(null); recarregar();
    } catch (err: any) { setErroForm(err.message); }
  }
  return (
    <Tela titulo="Clientes" acoes={<button className="btn principal" onClick={() => { setErroForm(''); setEdit({ ...VAZIO }); }}>Novo cliente</button>}>
      <div className="card"><input placeholder="Buscar por nome ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
      <Erro texto={erro} />
      <div className="card">
        {carregando && !dados && <Carregando />}
        {dados && dados.itens.length === 0 && <Vazio texto="Nenhum cliente cadastrado." />}
        {dados?.itens.map((c: any) => (
          <div className="item-lista" key={c.id}>
            <div><b>{c.nome}</b><div className="muted" style={{ fontSize: '.88rem' }}>{c.telefone} · {c.endereco || 'sem endereço'}</div></div>
            <button className="btn pequeno" onClick={() => { setErroForm(''); setEdit(c); }}>Editar</button>
          </div>
        ))}
      </div>
      {edit && (
        <Modal titulo={edit.id ? 'Editar cliente' : 'Novo cliente'} onFechar={() => setEdit(null)}>
          <form onSubmit={salvar}>
            <Campo rotulo="Nome"><input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} required /></Campo>
            <Campo rotulo="Telefone com DDD" dica="Só números; o sistema coloca o 55 do Brasil."><input value={edit.telefone} onChange={(e) => setEdit({ ...edit, telefone: e.target.value })} required /></Campo>
            <Campo rotulo="Endereço"><input value={edit.endereco || ''} onChange={(e) => setEdit({ ...edit, endereco: e.target.value })} /></Campo>
            <Campo rotulo="Observações"><textarea value={edit.observacoes || ''} onChange={(e) => setEdit({ ...edit, observacoes: e.target.value })} /></Campo>
            <Erro texto={erroForm} />
            <button className="btn principal">Salvar</button>
          </form>
        </Modal>
      )}
    </Tela>
  );
}

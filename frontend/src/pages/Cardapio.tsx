import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, brl, useDados } from '../api';
import { Campo, Carregando, Erro, Modal, Tela, TextoPronto, Vazio } from '../ui';

export default function Cardapio() {
  const { dados, erro, carregando, recarregar } = useDados('/produtos');
  const [edit, setEdit] = useState<any>(null);
  const [texto, setTexto] = useState<string | null>(null);
  const [erroForm, setErroForm] = useState('');
  async function salvar(e: FormEvent) {
    e.preventDefault(); setErroForm('');
    try {
      const corpo = { nome: edit.nome, descricao: edit.descricao, preco: Number(edit.preco), ativo: edit.ativo };
      if (edit.id) await api('PUT', `/produtos/${edit.id}`, corpo); else await api('POST', '/produtos', corpo);
      setEdit(null); recarregar();
    } catch (err: any) { setErroForm(err.message); }
  }
  const pronta = (p: any, delta: number) => api('PATCH', `/produtos/${p.id}/pronta-entrega`, { quantidade: Math.max(0, p.estoquePronto + delta) }).then(recarregar);
  const copiarCardapio = async () => setTexto((await api('GET', '/cardapio/texto')).texto);
  return (
    <Tela titulo="Cardápio" acoes={<><button className="btn" onClick={copiarCardapio}>Texto do cardápio</button><button className="btn principal" onClick={() => { setErroForm(''); setEdit({ nome: '', descricao: '', preco: '', ativo: true }); }}>Novo produto</button></>}>
      <Erro texto={erro} />
      <div className="card">
        {carregando && !dados && <Carregando />}
        {dados && dados.itens.length === 0 && <Vazio texto="Nenhum produto cadastrado." />}
        {dados?.itens.map((p: any) => (
          <div className="item-lista" key={p.id}>
            <div>
              <b>{p.nome}</b> {!p.ativo && <span className="selo cinza">Inativo</span>}
              <div className="muted" style={{ fontSize: '.88rem' }}>{brl(p.preco)}{p.descricao ? ` · ${p.descricao}` : ''}</div>
            </div>
            <div className="acoes">
              <span className="muted" style={{ fontSize: '.85rem' }}>Pronta entrega:</span>
              <button className="btn pequeno" onClick={() => pronta(p, -1)}>−</button><b>{p.estoquePronto}</b><button className="btn pequeno" onClick={() => pronta(p, 1)}>+</button>
              <button className="btn pequeno" onClick={() => { setErroForm(''); setEdit(p); }}>Editar</button>
            </div>
          </div>
        ))}
      </div>
      <p className="muted">O texto do cardápio serve para colar na resposta automática do WhatsApp Business (configurada no próprio aplicativo).</p>
      {texto && <TextoPronto titulo="Cardápio em texto" texto={texto} onFechar={() => setTexto(null)} />}
      {edit && (
        <Modal titulo={edit.id ? 'Editar produto' : 'Novo produto'} onFechar={() => setEdit(null)}>
          <form onSubmit={salvar}>
            <Campo rotulo="Nome"><input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} required /></Campo>
            <Campo rotulo="Descrição"><input value={edit.descricao || ''} onChange={(e) => setEdit({ ...edit, descricao: e.target.value })} /></Campo>
            <Campo rotulo="Preço (R$)"><input type="number" step="0.01" min="0" value={edit.preco} onChange={(e) => setEdit({ ...edit, preco: e.target.value })} required /></Campo>
            <label style={{ display: 'flex', gap: '.5rem', marginBottom: '.75rem' }}><input type="checkbox" checked={edit.ativo} onChange={(e) => setEdit({ ...edit, ativo: e.target.checked })} /> Produto ativo (aparece no cardápio e nos pedidos)</label>
            <Erro texto={erroForm} />
            <button className="btn principal">Salvar</button>
          </form>
        </Modal>
      )}
    </Tela>
  );
}

import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, dataBR, useDados } from '../api';
import { Campo, Carregando, Erro, Modal, Tela, TextoPronto, Vazio } from '../ui';

export default function Promocoes() {
  const { dados, erro, carregando, recarregar } = useDados('/promocoes');
  const [edit, setEdit] = useState<any>(null);
  const [texto, setTexto] = useState<any>(null);
  const [erroForm, setErroForm] = useState('');
  async function salvar(e: FormEvent) {
    e.preventDefault(); setErroForm('');
    try {
      if (edit.id) await api('PUT', `/promocoes/${edit.id}`, edit); else await api('POST', '/promocoes', edit);
      setEdit(null); recarregar();
    } catch (err: any) { setErroForm(err.message); }
  }
  return (
    <Tela titulo="Divulgação" acoes={<button className="btn principal" onClick={() => { setErroForm(''); setEdit({ titulo: '', descricao: '', condicao: '', inicio: '', fim: '', ativa: true }); }}>Nova promoção</button>}>
      <p className="muted">Crie a promoção, gere o texto pronto e envie pelo WhatsApp ou copie para o Instagram. Ao criar um pedido, escolha a promoção para acompanhar os resultados no Painel.</p>
      <Erro texto={erro} />
      <div className="card">
        {carregando && !dados && <Carregando />}
        {dados && dados.itens.length === 0 && <Vazio texto="Nenhuma promoção cadastrada." />}
        {dados?.itens.map((p: any) => (
          <div className="item-lista" key={p.id}>
            <div>
              <b>{p.titulo}</b> <span className={`selo ${p.ativa ? 'verde' : 'cinza'}`}>{p.ativa ? 'Ativa' : 'Encerrada'}</span>
              <div className="muted" style={{ fontSize: '.88rem' }}>{p.condicao || 'sem condição'} · {dataBR(p.inicio)} a {dataBR(p.fim)}</div>
            </div>
            <div className="acoes">
              <button className="btn pequeno principal" onClick={async () => setTexto(await api('GET', `/promocoes/${p.id}/texto`))}>Gerar texto</button>
              <button className="btn pequeno" onClick={() => { setErroForm(''); setEdit(p); }}>Editar</button>
            </div>
          </div>
        ))}
      </div>
      {texto && <TextoPronto titulo="Texto de divulgação" texto={texto.texto} whatsappUrl={texto.whatsappUrl} onFechar={() => setTexto(null)} />}
      {edit && (
        <Modal titulo={edit.id ? 'Editar promoção' : 'Nova promoção'} onFechar={() => setEdit(null)}>
          <form onSubmit={salvar}>
            <Campo rotulo="Título"><input value={edit.titulo} onChange={(e) => setEdit({ ...edit, titulo: e.target.value })} required /></Campo>
            <Campo rotulo="Descrição"><textarea value={edit.descricao || ''} onChange={(e) => setEdit({ ...edit, descricao: e.target.value })} /></Campo>
            <Campo rotulo="Condição" dica="Ex.: Leve 25 por R$ 100"><input value={edit.condicao || ''} onChange={(e) => setEdit({ ...edit, condicao: e.target.value })} /></Campo>
            <div className="linha">
              <Campo rotulo="Início"><input type="date" value={edit.inicio || ''} onChange={(e) => setEdit({ ...edit, inicio: e.target.value })} /></Campo>
              <Campo rotulo="Fim"><input type="date" value={edit.fim || ''} onChange={(e) => setEdit({ ...edit, fim: e.target.value })} /></Campo>
            </div>
            <label style={{ display: 'flex', gap: '.5rem', marginBottom: '.75rem' }}><input type="checkbox" checked={!!edit.ativa} onChange={(e) => setEdit({ ...edit, ativa: e.target.checked })} /> Promoção ativa</label>
            <Erro texto={erroForm} />
            <button className="btn principal">Salvar</button>
          </form>
        </Modal>
      )}
    </Tela>
  );
}

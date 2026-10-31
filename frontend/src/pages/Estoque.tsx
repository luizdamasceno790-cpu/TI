import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, dataBR, dataHoraBR, hoje, num, useDados } from '../api';
import { Campo, Carregando, Erro, Modal, Tela, Vazio } from '../ui';

function cor(i: any) {
  if (i.estoqueAtual < i.estoqueMinimo) return 'vermelho';
  if (i.estoqueAtual <= i.estoqueMinimo * 1.25) return 'amarelo';
  return 'verde';
}
export default function Estoque() {
  const [so, setSo] = useState(false);
  const { dados, erro, carregando, recarregar } = useDados(`/ingredientes${so ? '?abaixoDoMinimo=true' : ''}`);
  const [modal, setModal] = useState<{ tipo: string; ing: any } | null>(null);
  const [form, setForm] = useState<any>({});
  const [erroForm, setErroForm] = useState('');
  const [hist, setHist] = useState<any[]>([]);

  function abrir(tipo: string, ing: any) {
    setErroForm(''); setModal({ tipo, ing });
    if (tipo === 'novo') setForm({ nome: '', unidade: 'g', estoqueMinimo: '0', estoqueAtual: '0', validade: '' });
    if (tipo === 'editar') setForm({ nome: ing.nome, unidade: ing.unidade, estoqueMinimo: String(ing.estoqueMinimo) });
    if (tipo === 'entrada') setForm({ quantidade: '', validade: '' });
    if (tipo === 'ajuste') setForm({ quantidade: '', motivo: '' });
    if (tipo === 'historico') api('GET', `/ingredientes/${ing.id}/movimentos`).then((r) => setHist(r.itens));
  }
  async function salvar(e: FormEvent) {
    e.preventDefault(); setErroForm('');
    if (!modal) return;
    try {
      const { tipo, ing } = modal;
      if (tipo === 'novo') await api('POST', '/ingredientes', { nome: form.nome, unidade: form.unidade, estoqueMinimo: Number(form.estoqueMinimo), estoqueAtual: Number(form.estoqueAtual), validade: form.validade || undefined });
      if (tipo === 'editar') await api('PUT', `/ingredientes/${ing.id}`, { nome: form.nome, unidade: form.unidade, estoqueMinimo: Number(form.estoqueMinimo) });
      if (tipo === 'entrada') await api('POST', `/ingredientes/${ing.id}/entrada`, { quantidade: Number(form.quantidade), validade: form.validade || undefined });
      if (tipo === 'ajuste') await api('POST', `/ingredientes/${ing.id}/ajuste`, { quantidade: Number(form.quantidade), motivo: form.motivo });
      setModal(null); recarregar();
    } catch (err: any) { setErroForm(err.message); }
  }
  const alerta = (iso: string | null) => iso && iso < hoje() ? 'selo vermelho' : iso && iso <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) ? 'selo amarelo' : 'muted';
  return (
    <Tela titulo="Estoque" acoes={<><label className="barra"><input type="checkbox" checked={so} onChange={(e) => setSo(e.target.checked)} /> só abaixo do mínimo</label><button className="btn principal" onClick={() => abrir('novo', null)}>Novo ingrediente</button></>}>
      <Erro texto={erro} />
      <div className="card">
        {carregando && !dados && <Carregando />}
        {dados && dados.itens.length === 0 && <Vazio texto="Nenhum ingrediente encontrado." />}
        {dados?.itens.map((i: any) => (
          <div className="item-lista" key={i.id} style={{ alignItems: 'flex-start' }}>
            <div>
              <div className="barra"><span className={`cor ${cor(i)}`} /><b>{i.nome}</b></div>
              <div className="muted" style={{ fontSize: '.88rem' }}>
                Estoque: <b>{num(i.estoqueAtual)} {i.unidade}</b> · mínimo {num(i.estoqueMinimo)} {i.unidade}
                {i.validadeMaisProxima && <> · validade <span className={alerta(i.validadeMaisProxima)}>{dataBR(i.validadeMaisProxima)}</span></>}
              </div>
            </div>
            <div className="acoes" style={{ justifyContent: 'flex-end' }}>
              <button className="btn pequeno" onClick={() => abrir('entrada', i)}>Entrada</button>
              <button className="btn pequeno" onClick={() => abrir('ajuste', i)}>Ajuste</button>
              <button className="btn pequeno" onClick={() => abrir('historico', i)}>Histórico</button>
              <button className="btn pequeno" onClick={() => abrir('editar', i)}>Editar</button>
            </div>
          </div>
        ))}
      </div>
      {modal && modal.tipo === 'historico' && (
        <Modal titulo={`Histórico - ${modal.ing.nome}`} onFechar={() => setModal(null)}>
          {hist.length === 0 ? <Vazio texto="Sem movimentações." /> : (
            <div className="tabela-rolavel"><table><thead><tr><th>Quando</th><th>Tipo</th><th>Qtd</th><th>Motivo</th></tr></thead>
              <tbody>{hist.map((m) => <tr key={m.id}><td>{dataHoraBR(m.criadoEm)}</td><td>{m.tipo}</td><td>{num(m.quantidade)}</td><td>{m.motivo}</td></tr>)}</tbody></table></div>
          )}
        </Modal>
      )}
      {modal && modal.tipo !== 'historico' && (
        <Modal titulo={{ novo: 'Novo ingrediente', editar: `Editar ${modal.ing?.nome}`, entrada: `Entrada - ${modal.ing?.nome}`, ajuste: `Ajuste - ${modal.ing?.nome}` }[modal.tipo] || ''} onFechar={() => setModal(null)}>
          <form onSubmit={salvar}>
            {(modal.tipo === 'novo' || modal.tipo === 'editar') && <>
              <Campo rotulo="Nome"><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></Campo>
              <div className="linha">
                <Campo rotulo="Unidade"><select value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })}><option value="g">g</option><option value="ml">ml</option><option value="un">un</option></select></Campo>
                <Campo rotulo="Estoque mínimo"><input type="number" min="0" step="any" value={form.estoqueMinimo} onChange={(e) => setForm({ ...form, estoqueMinimo: e.target.value })} /></Campo>
              </div>
            </>}
            {modal.tipo === 'novo' && <div className="linha">
              <Campo rotulo="Estoque inicial"><input type="number" min="0" step="any" value={form.estoqueAtual} onChange={(e) => setForm({ ...form, estoqueAtual: e.target.value })} /></Campo>
              <Campo rotulo="Validade (opcional)"><input type="date" value={form.validade} onChange={(e) => setForm({ ...form, validade: e.target.value })} /></Campo>
            </div>}
            {modal.tipo === 'entrada' && <>
              <Campo rotulo={`Quantidade (${modal.ing.unidade})`}><input type="number" min="0.001" step="any" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} required autoFocus /></Campo>
              <Campo rotulo="Validade (opcional)"><input type="date" value={form.validade} onChange={(e) => setForm({ ...form, validade: e.target.value })} /></Campo>
            </>}
            {modal.tipo === 'ajuste' && <>
              <Campo rotulo={`Quantidade (${modal.ing.unidade})`} dica="Use número negativo para tirar do estoque."><input type="number" step="any" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} required /></Campo>
              <Campo rotulo="Motivo"><input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} required placeholder="ex.: perda, contagem" /></Campo>
            </>}
            <Erro texto={erroForm} />
            <button className="btn principal">Salvar</button>
          </form>
        </Modal>
      )}
    </Tela>
  );
}

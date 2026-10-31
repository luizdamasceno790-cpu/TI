import { useEffect, useState } from 'react';
import { api, useDados } from '../api';
import { Campo, Carregando, Erro, Tela } from '../ui';

const NOMES: Record<string, string> = {
  CARDAPIO: 'Cardápio', VALOR_E_PIX: 'Valor e Pix', PEDIDO_CONFIRMADO: 'Pedido confirmado', SAIU_PARA_ENTREGA: 'Pedido pronto para o entregador',
  RECEBIMENTO: 'Confirmação de recebimento', PAGAMENTO_NAO_CONFIRMADO: 'Pagamento não confirmado',
};
export default function Configuracoes() {
  const cfg = useDados('/configuracao');
  const modelos = useDados('/modelos-mensagem');
  const [c, setC] = useState<any>(null);
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  useEffect(() => { if (cfg.dados) setC(cfg.dados); }, [cfg.dados]);
  useEffect(() => { if (modelos.dados) setTextos(Object.fromEntries(modelos.dados.itens.map((m: any) => [m.tipo, m.texto]))); }, [modelos.dados]);
  if (!c || !modelos.dados) return <Carregando />;

  async function salvarConfig() {
    setErro(''); setMsg('');
    try { await api('PUT', '/configuracao', c); setMsg('Configurações salvas.'); } catch (e: any) { setErro(e.message); }
  }
  async function salvarModelo(tipo: string) {
    setErro(''); setMsg('');
    try { await api('PUT', `/modelos-mensagem/${tipo}`, { texto: textos[tipo] }); setMsg(`Mensagem "${NOMES[tipo]}" salva.`); } catch (e: any) { setErro(e.message); }
  }
  return (
    <Tela titulo="Configurações">
      {msg && <p className="ok">{msg}</p>}
      <Erro texto={erro} />
      <div className="card">
        <h3>Dados do negócio</h3>
        <Campo rotulo="Nome do negócio"><input value={c.nomeNegocio || ''} onChange={(e) => setC({ ...c, nomeNegocio: e.target.value })} /></Campo>
        <Campo rotulo="Chave Pix" dica="Aparece na mensagem de valor e Pix."><input value={c.chavePix || ''} onChange={(e) => setC({ ...c, chavePix: e.target.value })} /></Campo>
        <Campo rotulo="Telefone do negócio" dica="Usado no texto de divulgação."><input value={c.telefoneNegocio || ''} onChange={(e) => setC({ ...c, telefoneNegocio: e.target.value })} /></Campo>
        <button className="btn principal" onClick={salvarConfig}>Salvar dados</button>
      </div>
      <div className="card">
        <h3>Mensagens padrão</h3>
        <p className="muted">Variáveis disponíveis: {modelos.dados.variaveis.map((v: string) => `{{${v}}}`).join('  ')}</p>
        {modelos.dados.itens.map((m: any) => (
          <div key={m.tipo}>
            <Campo rotulo={NOMES[m.tipo] || m.tipo}><textarea value={textos[m.tipo] || ''} onChange={(e) => setTextos({ ...textos, [m.tipo]: e.target.value })} /></Campo>
            <button className="btn pequeno" style={{ marginBottom: '1rem' }} onClick={() => salvarModelo(m.tipo)}>Salvar esta mensagem</button>
          </div>
        ))}
      </div>
    </Tela>
  );
}

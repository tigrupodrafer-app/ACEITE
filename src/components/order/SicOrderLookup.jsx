import React, { useState } from 'react';
import { consultarPedidoSic } from '@/lib/sicPedidoApi';

/** Consulta somente leitura; não cria pedido, aceite, token ou documento. */
export default function SicOrderLookup() {
  const [numero, setNumero] = useState('');
  const [pedido, setPedido] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const moeda = n => typeof n === 'number'
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n) : '—';

  async function consultar(event) {
    event.preventDefault();
    setCarregando(true); setErro(''); setPedido(null);
    try { setPedido(await consultarPedidoSic(numero)); }
    catch (e) { setErro(e.message || 'Não foi possível consultar o pedido.'); }
    finally { setCarregando(false); }
  }

  return <section className="space-y-4 rounded-lg border bg-white p-5">
    <h2 className="text-xl font-bold">Consultar pedido no SIC</h2>
    <p className="text-sm text-slate-600">Prévia de homologação em modo somente leitura. Nenhum aceite é gerado.</p>
    <form onSubmit={consultar} className="flex gap-2">
      <input aria-label="Número do pedido" inputMode="numeric" pattern="[0-9]{1,12}"
        value={numero} onChange={e => setNumero(e.target.value)}
        className="min-w-0 flex-1 rounded border p-2" placeholder="Número do pedido" required />
      <button disabled={carregando} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
        {carregando ? 'Consultando…' : 'Consultar'}
      </button>
    </form>
    {erro && <p role="alert" className="text-red-700">{erro}</p>}
    {pedido && <div className="space-y-3 text-sm">
      <div><strong>Pedido:</strong> {pedido.numeroPedido} · <strong>Empresa:</strong> {pedido.empresa.razaoSocial}</div>
      <div><strong>Cliente:</strong> {pedido.cliente.nome} · <strong>Documento:</strong> {pedido.cliente.documento || 'Não cadastrado'}</div>
      <div><strong>Endereço cadastral:</strong> {pedido.enderecoCadastral || 'Não informado'}</div>
      {!pedido.enderecoEntregaConfirmado && <p className="text-amber-800">Endereço de entrega não confirmado no SIC.</p>}
      <div className="overflow-x-auto"><table className="w-full text-left">
        <thead><tr><th className="p-2">Item</th><th className="p-2">Descrição</th><th className="p-2">Qtd.</th><th className="p-2">Un.</th><th className="p-2">Total</th></tr></thead>
        <tbody>{pedido.itens.map((item, i) => <tr key={i} className="border-t">
          <td className="p-2">{item.item}</td><td className="p-2">{item.descricao}</td>
          <td className="p-2">{item.quantidade}</td><td className="p-2">{item.unidade}</td>
          <td className="p-2">{moeda(item.valorTotal)}</td>
        </tr>)}</tbody>
      </table></div>
      <div><strong>Subtotal:</strong> {moeda(pedido.valores.subtotal)} · <strong>Desconto:</strong> {moeda(pedido.valores.desconto)} · <strong>Total:</strong> {moeda(pedido.valores.total)}</div>
      {pedido.pendencias.length > 0
        ? <div className="rounded border border-amber-300 p-3"><strong>Pendências — emissão jurídica bloqueada:</strong>
            <ul className="list-disc pl-5">{pedido.pendencias.map((v,i) => <li key={i}>{v}</li>)}</ul></div>
        : <p className="text-green-800">Pré-validação de dados aprovada. Aceite ainda depende das regras de negócio e autorização.</p>}
    </div>}
  </section>;
}

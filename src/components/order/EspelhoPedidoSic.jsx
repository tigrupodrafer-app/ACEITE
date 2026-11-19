import React from 'react';

/**
 * Espelho comercial para conferência (não é documento fiscal).
 * Recebe somente dados normalizados do SIC; nunca inventa campos ausentes.
 * A versão definitiva deve ser homologada contra a impressão oficial do SIC.
 */
export default function EspelhoPedidoSic({ pedido }) {
  if (!pedido) return null;
  const fmt = value => value == null || value === '' ? '—' : String(value);
  const moeda = value => typeof value === 'number'
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) : '—';
  const numero = value => typeof value === 'number'
    ? new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(value) : '—';
  const pecas = pedido.itens.every(item => typeof item.quantidadePecas === 'number')
    ? pedido.itens.reduce((total, item) => total + item.quantidadePecas, 0) : null;
  const peso = pedido.itens.every(item => typeof item.pesoBrutoKg === 'number')
    ? pedido.itens.reduce((total, item) => total + item.pesoBrutoKg, 0) : null;

  return (
    <article aria-label={`Espelho do pedido ${pedido.numeroPedido}`} className="bg-white text-slate-900 border border-slate-500 p-5 text-sm print:border-black print:p-3">
      <header className="border-b border-slate-500 pb-3 text-center">
        <div className="text-xs tracking-widest">PEDIDO COMERCIAL</div>
        <h2 className="text-xl font-bold">Pedido nº {fmt(pedido.numeroPedido)}</h2>
        <p className="text-xs">{fmt(pedido.empresa.razaoSocial)}</p>
      </header>
      <section className="grid grid-cols-1 gap-2 border-b border-slate-400 py-3 sm:grid-cols-2">
        <p><strong>Cliente:</strong> {fmt(pedido.cliente.nome)}</p>
        <p><strong>CPF/CNPJ:</strong> {fmt(pedido.cliente.documento)}</p>
        <p><strong>Data do pedido:</strong> {fmt(pedido.dataPedido)}</p>
        <p><strong>Vendedor (código):</strong> {fmt(pedido.codigoVendedor)}</p>
        <p><strong>Tipo de venda:</strong> {fmt(pedido.tipoVenda)}</p>
        <p><strong>Previsão de entrega:</strong> {fmt(pedido.dataEntregaPrevista)}</p>
        <p className="sm:col-span-2"><strong>Endereço cadastral:</strong> {fmt(pedido.enderecoCadastral)}</p>
        <p className="sm:col-span-2"><strong>Local de entrega:</strong> {pedido.enderecoEntregaConfirmado
          ? 'Confirmado no SIC; detalhamento sujeito à homologação'
          : 'Não confirmado no SIC'}</p>
      </section>
      <div className="overflow-x-auto py-3">
        <table className="w-full min-w-[580px] text-left">
          <thead><tr className="border-b border-slate-500">
            <th className="p-1">Código</th><th className="p-1">Descrição</th>
            <th className="p-1">Unid.</th><th className="p-1 text-right">Qtde.</th>
            <th className="p-1 text-right">Qtde KG</th><th className="p-1 text-right">Valor</th>
          </tr></thead>
          <tbody>{pedido.itens.map((item, index) => <tr key={`${item.item ?? index}-${index}`} className="border-b border-slate-200">
            <td className="p-1">{fmt(item.codigoComercial ?? item.codigo)}</td>
            <td className="p-1">{fmt(item.descricao)}</td>
            <td className="p-1">{fmt(item.unidade)}</td>
            <td className="p-1 text-right">{numero(item.quantidade)}</td>
            <td className="p-1 text-right">{numero(item.pesoBrutoKg)}</td>
            <td className="p-1 text-right">{moeda(item.valorTotal)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <footer className="mt-6 border-t border-slate-500 pt-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div><p><strong>Quantidade de peças:</strong> {numero(pecas)}</p>
            <p><strong>Peso bruto total (kg):</strong> {numero(peso)}</p></div>
          <div className="sm:text-right"><p><strong>Subtotal:</strong> {moeda(pedido.valores.subtotal)}</p>
            <p><strong>Desconto:</strong> {moeda(pedido.valores.desconto)}</p>
            <p className="text-lg font-bold">Total do pedido: {moeda(pedido.valores.total)}</p></div>
        </div>
        <p className="mt-3 text-xs text-slate-600">Espelho de conferência — dados do pedido comercial SIC. Não substitui a impressão oficial homologada.</p>
      </footer>
    </article>
  );
}

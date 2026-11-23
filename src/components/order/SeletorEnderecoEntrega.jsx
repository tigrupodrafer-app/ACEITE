import React, { useEffect, useMemo, useState } from 'react';

/**
 * Escolha explícita do endereço de entrega. Esta interface NÃO confirma
 * endereço no servidor e NÃO habilita emissão/assinatura por conta própria.
 *
 * Contrato esperado da API (após homologação):
 * opcoes: [{ sequencia, origem: 'ARQCADEND', ativo: true,
 *            principal: boolean, endereco, numero, bairro, cep, cidade, uf }]
 * cadastral: { endereco, numero, bairro, cep, cidade, uf }
 *
 * onSelectionChange recebe null ou { origem, sequencia }. A confirmação
 * definitiva deve ser feita pelo backend com reconsulta ao SIC e snapshot.
 */
export default function SeletorEnderecoEntrega({
  pedidoNumero,
  opcoes = [],
  cadastral = null,
  disabled = false,
  onSelectionChange,
}) {
  const [selected, setSelected] = useState('');
  const [reviewed, setReviewed] = useState(false);

  const validOptions = useMemo(() => (
    Array.isArray(opcoes)
      ? opcoes.filter(item => item?.origem === 'ARQCADEND' &&
          item.ativo === true && Number.isSafeInteger(Number(item.sequencia)) &&
          Number(item.sequencia) > 0)
      : []
  ), [opcoes]);

  const hasRegistered = validOptions.length > 0;
  const cadastralAvailable = Boolean(cadastral?.endereco && cadastral?.cidade);
  const options = validOptions.map(item => ({
    key: 'ARQCADEND:' + item.sequencia,
    value: { origem: 'ARQCADEND', sequencia: Number(item.sequencia) },
    data: item,
  }));

  if (!hasRegistered && cadastralAvailable) {
    options.push({
      key: 'ARQCAD',
      value: { origem: 'ARQCAD', sequencia: null },
      data: cadastral,
    });
  }

  const chosen = options.find(item => item.key === selected);
  const selection = reviewed && chosen && !disabled ? chosen.value : null;

  useEffect(() => {
    setSelected('');
    setReviewed(false);
  }, [pedidoNumero, opcoes, cadastral]);

  useEffect(() => {
    onSelectionChange?.(selection);
  }, [selection?.origem, selection?.sequencia, onSelectionChange]);

  const formatAddress = item => [
    [item.endereco, item.numero].filter(Boolean).join(', '),
    item.bairro,
    [item.cidade, item.uf].filter(Boolean).join(' / '),
    item.cep && 'CEP ' + item.cep,
  ].filter(Boolean).join(' — ');

  return (
    <fieldset disabled={disabled} className="border rounded-lg p-4 space-y-3">
      <legend className="font-semibold px-1">Endereço de entrega — seleção do vendedor</legend>
      <p className="text-sm text-amber-900">
        O endereço principal é apenas uma sugestão. Nenhuma opção é confirmada automaticamente.
      </p>
      {!hasRegistered && <p role="status" className="text-sm text-amber-900">
        Não há locais de entrega ativos retornados pelo SIC.
        O endereço cadastral, quando disponível, exige confirmação expressa.
      </p>}
      {options.length === 0 && <p role="alert" className="text-sm text-red-700">
        Nenhum endereço elegível foi disponibilizado. Regularize o cadastro antes de prosseguir.
      </p>}
      <div className="space-y-2">
        {options.map(option => (
          <label key={option.key} className="flex gap-3 border rounded p-3 cursor-pointer">
            <input type="radio" name={'entrega-' + pedidoNumero}
              checked={selected === option.key}
              onChange={() => { setSelected(option.key); setReviewed(false); }}
              className="mt-1" />
            <span className="text-sm">
              <strong>{option.key === 'ARQCAD'
                ? 'Usar endereço cadastral (sem local de entrega específico)'
                : 'Local SIC nº ' + option.value.sequencia}</strong>
              {option.data.principal === true && <span> — principal (não confirmado)</span>}
              <span className="block mt-1">{formatAddress(option.data)}</span>
            </span>
          </label>
        ))}
      </div>
      <label className="flex gap-2 items-start text-sm">
        <input type="checkbox" className="mt-1" checked={reviewed}
          disabled={!chosen} onChange={event => setReviewed(event.target.checked)} />
        <span>Conferi com o cliente o endereço selecionado e solicito seu registro
          para este pedido. Sei que a confirmação final depende da validação no servidor.</span>
      </label>
      <p className="text-xs text-slate-600" role="status">
        {selection ? 'Seleção revisada; aguardando validação do servidor.' :
          'Selecione um endereço e marque a conferência para continuar.'}
      </p>
    </fieldset>
  );
}

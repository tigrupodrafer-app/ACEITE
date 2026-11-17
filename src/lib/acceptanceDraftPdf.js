/**
 * Gera exclusivamente uma MINUTA PARA REVISAO INTERNA.
 * Nao cria aceite nem token, nao altera SIC/Supabase e nao confirma elegibilidade.
 * Texto baseado nas secoes do TermoGarantia.jsx da versao legada Base44.
 */
export async function exportAcceptanceDraft({ pedido, itens, validacao }) {
  if (!pedido || !Array.isArray(itens) || !validacao) {
    throw new Error('Pedido sem dados completos para gerar minuta');
  }

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageHeight = doc.internal.pageSize.getHeight();
  const width = doc.internal.pageSize.getWidth();
  const margin = 17;
  let y = 24;

  const normalize = (v) => String(v ?? 'Nao informado')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\r\n\t]/g, ' ').slice(0, 350);
  const brl = (v) => Number.isFinite(Number(v))
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v))
    : 'Nao informado';

  function datePt(value) {
    if (!value) return 'Nao informada';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return normalize(value);
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(date);
  }

  function pageHeader() {
    doc.setTextColor(160, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('MINUTA - NAO ASSINAR / NAO ENVIAR AO CLIENTE', margin, 12);
    doc.setDrawColor(160, 0, 0);
    doc.line(margin, 15, width - margin, 15);
    doc.setTextColor(20, 20, 20);
  }

  function paragraph(value, opts = {}) {
    const { size = 10, bold = false, after = 3 } = opts;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(normalize(value), width - margin * 2);
    for (const line of lines) {
      if (y > pageHeight - 25) {
        doc.addPage();
        pageHeader();
        y = 25;
      }
      doc.text(line, margin, y);
      y += size > 11 ? 7.3 : 5.6;
    }
    y += after;
  }

  pageHeader();
  paragraph('ACEITE DRAFER - TERMO DE ACEITE DE PEDIDO E AUTORIZACAO DE FABRICACAO', { size: 13, bold: true });
  paragraph('Versao preliminar para conferencia interna - sem validade como instrumento de aceite.', { bold: true });
  paragraph('ORIGEM: Consulta ao sistema SIC SupraSYS. Minuta gerada no navegador, nao armazenada nem assinada.');
  paragraph('Pedido SIC: ' + normalize(pedido.numero), { bold: true });
  paragraph('Empresa SIC: ' + normalize(pedido.empresa));
  paragraph('Cliente: ' + normalize(pedido.cliente?.nome));
  paragraph('Codigo do cliente: ' + normalize(pedido.cliente?.codigo));
  paragraph('Situacao original SIC: ' + normalize(pedido.situacao) + ' | Liberado: ' + normalize(pedido.liberado));
  paragraph('Data do pedido: ' + datePt(pedido.dataPedido));
  paragraph('Previsao de entrega: ' + datePt(pedido.dataEntrega));

  paragraph('1. MATERIAIS DO PEDIDO', { size: 12, bold: true });
  itens.forEach((item, i) => {
    paragraph((i + 1) + '. ' + normalize(item.descricao));
    paragraph('Codigo comercial (cadastro SIC): ' + normalize(item.codigoProdutoComercial));
    paragraph('Sequencia interna: ' + normalize(item.codigoProdutoInterno ?? item.codigoProduto));
    paragraph('Quantidade retornada pela API: ' + normalize(item.quantidade) +
      ' | Unidade retornada: ' + normalize(item.unidade));
    paragraph('Valor unitario retornado: ' + brl(item.valorUnitario) +
      ' (base de medida a confirmar no SIC) | Total: ' + brl(item.valorTotal));
    if (item.referenciaFornecedor != null) paragraph('Referencia do fornecedor: ' + normalize(item.referenciaFornecedor));
    if (item.pesoLiquidoKg != null) paragraph('Peso liquido (ARQES15.PESO_LIQUIDO): ' + normalize(item.pesoLiquidoKg) + ' kg');
    if (item.pesoBrutoKg != null) paragraph('Peso bruto (ARQES15.PESO_BRUTO): ' + normalize(item.pesoBrutoKg) + ' kg');
    if (item.quantidadePecas != null) paragraph('Quantidade de pecas (ARQES15.QTDE_PC): ' + normalize(item.quantidadePecas));
    if (item.valorUnitarioPeca != null) paragraph('Valor unitario/peca (ARQES15.VUNIT_PC): ' + brl(item.valorUnitarioPeca));
  });
  paragraph('Subtotal: ' + brl(pedido.valores?.subtotal));
  paragraph('Desconto: ' + brl(pedido.valores?.desconto));
  paragraph('Total: ' + brl(pedido.valores?.total), { bold: true });
  paragraph('Conferencia aritmetica da API SIC: ' +
    (validacao.valido === true ? 'APROVADA' : 'NAO APROVADA'));

  paragraph('2. DECLARACOES PROPOSTAS - SUJEITAS A REVISAO JURIDICA', { size: 12, bold: true });
  paragraph('2.1 O cliente devera conferir os produtos, especificacoes, quantidades e informacoes do pedido antes de eventual autorizacao de fabricacao.');
  paragraph('2.2 Materiais fabricados sob medida poderao exigir condicoes especificas de alteracao, cancelamento ou devolucao. O alcance dessas condicoes depende da legislacao e da aprovacao juridica do Grupo Drafer.');
  paragraph('2.3 Procedimentos de transporte, recebimento, armazenagem, manuseio e instalacao devem observar as orientacoes tecnicas aplicaveis ao material fornecido.');
  paragraph('2.4 As condicoes de garantia, prazo, limitacoes e responsabilidades devem ser aquelas constantes da versao juridicamente aprovada do Termo de Garantia, Armazenagem, Manuseio e Instalacao de Telhas.');
  paragraph('2.5 O aceite juridico somente podera ocorrer apos o documento final aprovado ser exibido integralmente ao cliente e a plataforma registrar sua manifestacao de vontade e evidencias de integridade.');

  paragraph('3. CHECKLIST DE HOMOLOGACAO - PENDENCIAS', { size: 12, bold: true });
  paragraph('[ ] Confirmar regras de codigos alternativos do campo de pesquisa do SIC quando necessario; priorizar o codigo comercial do cadastro.');
  paragraph('[x] Identificados no SIC os campos PESO_LIQUIDO, QTDE_PC e VUNIT_PC.');
  paragraph('[ ] Homologar regra de unidade comercial e conversoes por familia de produto.');
  paragraph('[ ] Confirmar correspondencia do codigo SITU no SIC com o fluxo comercial.');
  paragraph('[ ] Confirmar documentos e identificacao da empresa emitente.');
  paragraph('[ ] Aprovar juridicamente o teor integral do termo de garantia.');
  paragraph('[ ] Definir politica comercial de cancelamento, devolucao e fabricacao sob medida.');
  paragraph('[ ] Habilitar geracao do PDF final com hash e registro no Supabase.');
  paragraph('[ ] Validar aceite eletronico, prova de consentimento e trilha de auditoria.');

  paragraph('AVISO: ESTA MINUTA NAO AUTORIZA FABRICACAO, NAO SUBSTITUI O CONTRATO/PEDIDO ORIGINAL E NAO PODE SER UTILIZADA PARA COLETA DE ASSINATURA.', { bold: true });
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(140, 0, 0);
    doc.text('MINUTA PARA REVISAO INTERNA - pagina ' + p + '/' + pages, margin, pageHeight - 10);
  }
  doc.save('minuta-aceite-' + String(pedido.numero).replace(/\D/g, '') + '.pdf');
}

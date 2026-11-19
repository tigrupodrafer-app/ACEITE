'use strict';
// Estado operacional para o vendedor: consulta -> documento -> link -> assinatura -> producao.
// Somente leitura. Nao emite links nem libera producao; nunca interpreta minuta como aceite.
const { respond, requireStaff, supabaseFetch, handleError, onlyMethod } = require('./_lib/backend.cjs');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (message, statusCode=400) => Object.assign(new Error(message), {statusCode});

exports.handler = async (event) => {
  try {
    onlyMethod(event, 'GET');
    await requireStaff(event, {allowedRoles:['admin','vendedor','aprovador']});
    const id = event.queryStringParameters?.draftId;
    if (!UUID.test(id||'')) throw fail('Identificador de pedido invalido');
    const rows = await supabaseFetch('/rest/v1/aceite_orders?id=eq.' + id +
      '&select=id,origin,order_number,sic_order_number,sic_company_id,status,order_snapshot,details&limit=1');
    const order = rows?.[0];
    if (!order || order.origin !== 'SIC_SUPRASYS') throw fail('Pedido SIC nao encontrado',404);
    const snap = order.order_snapshot || {};
    const p = snap.pedidoCompleto || {};
    const items = snap.itens;
    const sicConsistent = snap.validacao?.valido === true &&
      Array.isArray(items) && items.length > 0 && items.length <= 200 &&
      String(p.numero) === String(order.sic_order_number) &&
      Number(p.empresa) === Number(order.sic_company_id);
    const docs = await supabaseFetch('/rest/v1/aceite_generated_documents?order_id=eq.'+id+
      '&document_type=eq.review_draft&select=id,version,file_sha256&order=version.desc&limit=1');
    const draft = docs?.[0] || null;
    const preliminaryPdf = Boolean(draft && /^[a-f0-9]{64}$/i.test((draft.file_sha256||'').trim()));
    // A minuta nao e documento final, nem prova de hash validado dos bytes.
    const steps = [
      {id:'consulta',label:'Consultar pedido SIC',complete:sicConsistent},
      {id:'geracao',label:'Gerar documento de aceite final',complete:false,
        note:preliminaryPdf?'Minuta preliminar disponivel; documento final pendente':'Documento final pendente'},
      {id:'link',label:'Gerar link individual para o cliente',complete:false},
      {id:'assinatura',label:'Cliente confirmar tres opcoes e assinar',complete:false},
      {id:'conferencia',label:'Vendedor conferir assinatura e evidencias',complete:false},
      {id:'producao',label:'Encaminhar pedido para producao',complete:false},
    ];
    return respond(200, {
      orderId:id,orderNumber:String(order.sic_order_number),
      flow:'vendedor_consulta_gera_envia_cliente_confirma_assina_vendedor_confere_producao',
      steps, preliminaryPdf, preliminaryVersion:draft?.version??null,
      canGeneratePublicLink:false, canSign:false, canSendToProduction:false,
      blocker:sicConsistent?'Documento final, homologacao e assinatura ainda nao habilitados':
        'Espelho SIC nao passou na verificacao basica',
    });
  } catch(error) { return handleError(error); }
};

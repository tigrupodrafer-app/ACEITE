'use strict';
// Read-only presentation data. Admin login required, no public link/token/signature.
const { respond, requireStaff, supabaseFetch, handleError, onlyMethod } = require('./_lib/backend.cjs');
const { sections, diagrams, legalWarnings, consent, reviewFlags } = require('./_lib/legal-term-original.cjs');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const failure = (message, statusCode=400) => Object.assign(new Error(message), {statusCode});

exports.handler = async (event) => {
  try {
    onlyMethod(event, 'GET');
    const { member } = await requireStaff(event, {allowedRoles:['admin']});
    if(member.role !== 'admin') throw failure('Acesso limitado ao administrador TI', 403);
    const id = event.queryStringParameters?.draftId;
    if (!UUID.test(id||'')) throw failure('Identificador do pedido invalido');
    const rows=await supabaseFetch('/rest/v1/aceite_orders?id=eq.'+id+
      '&select=id,origin,order_number,sic_order_number,sic_company_id,client_name,order_snapshot,status,details&limit=1');
    const order=rows?.[0];
    if(!order || order.origin!=='SIC_SUPRASYS'||order.status!=='rascunho'||
      order.details?.draftOnly!==true||order.details?.legalDocumentApproved!==false)
      throw failure('Pedido indisponivel para demonstracao',409);
    const snap=order.order_snapshot||{};
    if(!snap.pedidoCompleto||!Array.isArray(snap.itens)||snap.itens.length>100||
      !snap.itens.length||snap.validacao?.valido!==true||
      String(snap.pedidoCompleto.numero)!==String(order.sic_order_number)||
      Number(snap.pedidoCompleto.empresa)!==Number(order.sic_company_id))
      throw failure('Pedido sem dados SIC consistentes',422);
    const doc=await supabaseFetch('/rest/v1/aceite_generated_documents?order_id=eq.'+id+
      '&document_type=eq.review_draft&select=id,version,file_sha256&order=version.desc&limit=1');
    const d=doc?.[0]||null;
    const decisions=d?await supabaseFetch('/rest/v1/aceite_formal_approvals?document_id=eq.'+d.id+
      '&select=scope,decision,document_sha256,approver_id&limit=4'):[];
    const valid=(decisions||[]).filter(x=>x.document_sha256?.trim()===d?.file_sha256?.trim());
    const legal=valid.find(x=>x.scope==='juridico');
    const commercial=valid.find(x=>x.scope==='comercial');
    return respond(200,{
      mode:'DEMONSTRACAO', publicSigningEnabled:false,legalDocumentIssued:false,
      productionAuthorized:false,
      order:{
        id:order.id,number:String(order.sic_order_number),company:order.sic_company_id,
        clientName:order.client_name,document:snap.pedidoCompleto.cliente?.documento||null,
        saleDate:snap.pedidoCompleto.dataPedido||null,
        deliveryDate:snap.pedidoCompleto.dataEntrega||null,
        items:snap.itens.map(x=>({
          description:x.descricao,commercialCode:x.codigoProdutoComercial,
          internalCode:x.codigoProdutoInterno??x.codigoProduto,
          supplierReference:x.referenciaFornecedor,
          quantity:x.quantidade,unit:x.unidade,weightKg:x.pesoLiquidoKg,
          pieces:x.quantidadePecas,unitPrice:x.valorUnitario,total:x.valorTotal,
        })),
        subtotal:snap.pedidoCompleto.valores?.subtotal??null,
        discount:snap.pedidoCompleto.valores?.desconto??null,
        total:snap.pedidoCompleto.valores?.total??null,
      },
      reviewVersion:d?.version??null,reviewSha256:d?.file_sha256?.trim()??null,
      decisions:{
        juridico:legal?.decision||'pendente',
        comercial:commercial?.decision||'pendente',
        bothFavorable:legal?.decision==='aprovado'&&commercial?.decision==='aprovado'&&
          legal?.approver_id!==commercial?.approver_id,
      },
      term:{sections,diagrams,legalWarnings,consent,reviewFlags},
    });
  } catch (error) { return handleError(error); }
};

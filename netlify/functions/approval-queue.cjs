'use strict';
// Lista SOMENTE os pedidos das empresas para as quais o aprovador esta designado.
// Nao expoe o snapshot completo nem chaves do SIC. Nao altera estados ou gera tokens.
const { respond, requireStaff, supabaseFetch, handleError, onlyMethod }=require('./_lib/backend.cjs');
const fail=(message,statusCode=403)=>Object.assign(new Error(message),{statusCode});
exports.handler=async(event)=>{
  try{
    onlyMethod(event,'GET');
    const {authUser,member}=await requireStaff(event,{allowedRoles:['admin','aprovador']});
    if(member.role!=='aprovador')throw fail('Central disponivel apenas ao perfil de aprovador');
    const grants=await supabaseFetch('/rest/v1/aceite_approval_authorizers?user_id=eq.'+
      encodeURIComponent(authUser.id)+'&active=eq.true&select=sic_company_id,scope&limit=50');
    const allowed=(grants||[]).filter(g=>Number.isInteger(g.sic_company_id)&&g.sic_company_id>0&&
      ['juridico','comercial'].includes(g.scope));
    if(!allowed.length)return respond(200,{assignments:[],orders:[],signingEnabled:false});
    const companies=[...new Set(allowed.map(g=>g.sic_company_id))].slice(0,10);
    const merged=[];
    for(const company of companies){
      const rows=await supabaseFetch('/rest/v1/aceite_orders?origin=eq.SIC_SUPRASYS'+
        '&sic_company_id=eq.'+company+'&status=eq.rascunho'+
        '&select=id,sic_company_id,sic_order_number,client_name,status'+
        '&order=created_at.desc&limit=50');
      merged.push(...(rows||[]));
    }
    const orders=merged.filter(o=>/^[0-9a-f-]{36}$/i.test(o.id||'')).slice(0,50);
    if(!orders.length)return respond(200,{assignments:allowed,orders:[],signingEnabled:false});
    const ids=orders.map(o=>o.id).join(',');
    const docs=await supabaseFetch('/rest/v1/aceite_generated_documents?document_type=eq.review_draft'+
      '&order_id=in.('+ids+')&select=id,order_id,version,file_sha256,created_at'+
      '&order=version.desc&limit=300');
    const latest=new Map();
    for(const d of docs||[]){
      if(!latest.has(d.order_id)&&/^[0-9a-f]{64}$/.test((d.file_sha256||'').trim())){
        latest.set(d.order_id,d);
      }
    }
    return respond(200,{assignments:allowed,
      orders:orders.filter(o=>latest.has(o.id)).map(o=>{
        const d=latest.get(o.id);
        return{
          draftId:o.id,company:o.sic_company_id,number:String(o.sic_order_number),
          clientName:o.client_name,scope:allowed.filter(a=>a.sic_company_id===o.sic_company_id).map(a=>a.scope),
          document:{documentId:d.id,version:d.version,sha256:d.file_sha256.trim(),createdAt:d.created_at},
        };
      }),signingEnabled:false});
  }catch(error){return handleError(error);}
};

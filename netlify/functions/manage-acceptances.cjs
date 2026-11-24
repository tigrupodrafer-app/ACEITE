'use strict';
const {respond,requireStaff,supabaseFetch,handleError}=require('./_lib/backend.cjs');
exports.handler=async event=>{
 try{
  const {member,authUser}=await requireStaff(event,{allowedRoles:['admin','vendedor','aprovador']});
  if(event.httpMethod==='GET'){
   const page=Number(event.queryStringParameters?.page||0);
   if(!Number.isSafeInteger(page)||page<0||page>10000)return respond(400,{error:'Página inválida'});
   const rows=await supabaseFetch('/rest/v1/aceite_orders?origin=eq.SIC_SUPRASYS&select=id,order_number,sic_company_id,client_name,status,created_by,created_at,aceite_acceptances(id,level,accepted_at)&order=created_at.desc,id.desc&limit=50&offset='+page*50);
   return respond(200,{rows:rows.map(o=>{const signed=o.aceite_acceptances.some(a=>a.level===1);return {id:o.id,number:o.order_number,company:o.sic_company_id,client:o.client_name,createdAt:o.created_at,signed,cancelled:o.status==='cancelado',status:o.status,canCancel:o.status!=='cancelado'&&(member.role==='admin'||(!signed&&member.role==='vendedor'&&o.created_by===authUser.id))}}),more:rows.length===50});
  }
  if(event.httpMethod!=='POST')return respond(405,{error:'Método inválido'});
  if((event.body||'').length>3000)return respond(400,{error:'Requisição inválida'});
  let b;try{b=JSON.parse(event.body||'{}')}catch{return respond(400,{error:'JSON inválido'})}
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.orderId||'')||typeof b.reason!=='string'||b.reason.trim().length<5||b.reason.length>500)return respond(400,{error:'Informe o motivo do cancelamento (5 a 500 caracteres).'});
  const result=await supabaseFetch('/rest/v1/rpc/aceite_cancelar_termo',{method:'POST',body:{p_order_id:b.orderId,p_actor_id:authUser.id,p_reason:b.reason.trim()}});
  return respond(result.ok?200:409,result);
 }catch(e){return handleError(e)}
};

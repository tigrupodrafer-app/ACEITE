'use strict';
// A legal version may be homologated only by a real authenticated authorized staff member.
// No browser-supplied approver identity, hash or version is trusted.
const {createHash}=require('node:crypto');
const legal=require('../../src/lib/legalTermRevised.json');
const {respond,requireStaff,supabaseFetch,onlyMethod,handleError}=require('./_lib/backend.cjs');
const digest=createHash('sha256').update(JSON.stringify(legal)).digest('hex');
const invalid=(message,statusCode=409)=>Object.assign(new Error(message),{statusCode});
exports.handler=async event=>{
 try{
  onlyMethod(event,'POST');
  const {authUser}=await requireStaff(event,{allowedRoles:['admin','aprovador']});
  if(typeof event.body!=='string'||event.body.length>2048)throw invalid('Requisicao invalida',400);
  let input;try{input=JSON.parse(event.body)}catch{throw invalid('JSON invalido',400)}
  if(input.confirmed!==true||input.version!==legal.version||
    typeof input.justification!=='string'||input.justification.trim().length<30||
    input.justification.length>1000)
    throw invalid('Confirme a versao exata e informe a fundamentacao da homologacao',422);
  const base='/rest/v1/aceite_legal_versions';
  const existing=await supabaseFetch(base+'?version=eq.'+encodeURIComponent(legal.version)+
    '&select=id,version,content_sha256,status,approved_at,approved_by&limit=10');
  if(existing.some(x=>x.status==='homologado'&&x.content_sha256!==digest))
    throw invalid('Outra revisao juridica ja esta homologada');
  const approved=existing.find(x=>x.status==='homologado'&&x.content_sha256===digest);
  if(approved)return respond(200,{approved:true,version:legal.version,sha256:digest,
    approvedAt:approved.approved_at,alreadyApproved:true});
  if(existing.some(x=>x.content_sha256===digest&&x.status==='revogado'))
    throw invalid('Versao revogada nao pode ser reativada');
  const payload={status:'homologado',approved_by:authUser.id,
    approved_at:new Date().toISOString(),justification:input.justification.trim()};
  let rows;
  const pending=existing.find(x=>x.content_sha256===digest&&x.status==='pendente');
  if(pending){
    rows=await supabaseFetch(base+'?id=eq.'+pending.id+'&status=eq.pendente&select=id,approved_at',{
      method:'PATCH',headers:{Prefer:'return=representation'},body:payload});
  }else{
    rows=await supabaseFetch(base+'?select=id,approved_at',{
      method:'POST',headers:{Prefer:'return=representation'},
      body:{version:legal.version,content_sha256:digest,...payload}});
  }
  if(!rows?.[0]?.id)throw invalid('Homologacao nao registrada');
  return respond(201,{approved:true,version:legal.version,sha256:digest,
    approvedAt:rows[0].approved_at,alreadyApproved:false});
 }catch(error){return handleError(error)}
};

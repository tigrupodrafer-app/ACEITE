'use strict';
const {respond,requireStaff,handleError,onlyMethod}=require('./_lib/backend.cjs');
const {sections,diagrams,legalWarnings,consent,reviewFlags}=require('./_lib/legal-term-original.cjs');
exports.handler=async event=>{
 try{
  onlyMethod(event,'GET');
  await requireStaff(event,{allowedRoles:['admin','vendedor']});
  return respond(200,{
   heading:'TERMO DE GARANTIA, ARMAZENAGEM, MANUSEIO E INSTALACAO DE TELHAS',
   sections,diagrams,legalWarnings,consent,reviewFlags,
   reviewOnly:true,finalDocumentApproved:false,
   message:'Texto original para conferência; emissão pública bloqueada até homologação do conteúdo.',
  });
 }catch(e){return handleError(e);}
};

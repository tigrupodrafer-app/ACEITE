'use strict';
// O espelho nao pode misturar UNID com KG; peso de materiais unitarios sem
// unidade de massa confiavel deve ser confirmado no SIC antes de totalizar.
const WEIGHABLE=/^(KG|KGS|QUILO|QUILOS|MTL|MTD|METRO|METROS|M)$/;
const UNIT=/^(UN|UND|UNID|UNIDADE|UNIDADES|PC|PÇ|PCS|PCA|PECA|PEÇAS)$/;
const normalized=value=>String(value??'').trim().toUpperCase();
const finite=value=>{
 if(value===null||value===undefined||value==='')return null;
 const n=Number(value);
 return Number.isFinite(n)?n:null;
};
function itemWeight(item){
 const unit=normalized(item.unidade);
 if(UNIT.test(unit))return null; // Peso genérico do SIC pode ser Qtde. UNID, nao KG real.
 if(!WEIGHABLE.test(unit))return null; // Sem unidade homologada, nao adivinhar.
 const n=finite(item.pesoLiquidoKg);
 return n!==null&&n>=0?n:null;
}
function totalsForPrint(items){
 const groups=new Map();
 let kg=0,hasKg=false;
 for(const item of items||[]){
  const unit=normalized(item.unidade)||'SEM UND';
  const label=UNIT.test(unit)?'UNID':WEIGHABLE.test(unit)?'PC':unit;
  const count=finite(item.quantidadePecas);
  if(count!==null&&count>=0)groups.set(label,(groups.get(label)||0)+count);
  const weight=itemWeight(item);
  if(weight!==null){kg+=weight;hasKg=true;}
 }
 return {quantityGroups:[...groups].map(([unit,quantity])=>({unit,quantity})),
   weightKg:hasKg?kg:null,weightComplete:(items||[]).every(item=>
     itemWeight(item)!==null||UNIT.test(normalized(item.unidade))),
   weightEstimated:false};
}
module.exports={itemWeight,totalsForPrint};

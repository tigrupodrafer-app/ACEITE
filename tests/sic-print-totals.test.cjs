'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {totalsForPrint,itemWeight}=require('../src/lib/sicPrintTotals.cjs');
test('Pedido misto 352688: produtos em unidade nao viram quilogramas',()=>{
 const items=[
  {unidade:'MTL',quantidade:12.96,pesoLiquidoKg:12.96,quantidadePecas:7.2},
  {unidade:'UNID',quantidade:100,pesoLiquidoKg:100,quantidadePecas:100},
 ];
 const result=totalsForPrint(items);
 assert.equal(result.weightKg,12.96);
 assert.deepEqual(result.quantityGroups,[{unit:'PC',quantity:7.2},{unit:'UNID',quantity:100}]);
 assert.equal(itemWeight(items[1]),null);
});
test('Pedido 352488: peso e pecas extraidos separadamente',()=>{
 const result=totalsForPrint([{
  unidade:'MTD',quantidade:16.555,pesoLiquidoKg:16.555,quantidadePecas:5.5,
 }]);
 assert.equal(result.weightKg,16.555);
 assert.deepEqual(result.quantityGroups,[{unit:'PC',quantity:5.5}]);
});
test('nao assume unidade de massa desconhecida',()=>{
 const result=totalsForPrint([{unidade:'CX',pesoLiquidoKg:40,quantidadePecas:2}]);
 assert.equal(result.weightKg,null);
 assert.equal(result.weightComplete,false);
 assert.deepEqual(result.quantityGroups,[{unit:'CX',quantity:2}]);
});
test('null and empty fields never become zero weight masquerading as real value',()=>{
 const result=totalsForPrint([{unidade:'KG',pesoLiquidoKg:null,quantidadePecas:null}]);
 assert.equal(result.weightKg,null);
 assert.deepEqual(result.quantityGroups,[]);
 assert.equal(result.weightComplete,false);
});

-- ACEITE DRAFER - Firebird 5 / SIC SupraSYS
-- Diagnostico de mapeamento do ESPELHO impresso, SOMENTE LEITURA.
-- Nao altera tabelas, views, stored procedures nem dados.
-- Executar conectado ao banco SIC com usuario autorizado.

-- 1. Localizar nomes de campos uteis nas tabelas que ja participam da integracao.
select trim(r.rdb$relation_name) as tabela,
       trim(f.rdb$field_name) as campo,
       f.rdb$field_position as posicao
from rdb$relation_fields f
join rdb$relations r on r.rdb$relation_name=f.rdb$relation_name
where trim(r.rdb$relation_name) in ('ARQES13','ARQES15','ARQCAD','CAD_PRODUTO')
  and (
    upper(trim(f.rdb$field_name)) containing 'COD' or
    upper(trim(f.rdb$field_name)) containing 'ACESS' or
    upper(trim(f.rdb$field_name)) containing 'FORN' or
    upper(trim(f.rdb$field_name)) containing 'FONE' or
    upper(trim(f.rdb$field_name)) containing 'CPF' or
    upper(trim(f.rdb$field_name)) containing 'CNPJ' or
    upper(trim(f.rdb$field_name)) containing 'END' or
    upper(trim(f.rdb$field_name)) containing 'CIDADE' or
    upper(trim(f.rdb$field_name)) containing 'EMAIL' or
    upper(trim(f.rdb$field_name)) containing 'BAIRRO' or
    upper(trim(f.rdb$field_name)) containing 'CEP' or
    upper(trim(f.rdb$field_name)) containing 'VEND' or
    upper(trim(f.rdb$field_name)) containing 'COBR' or
    upper(trim(f.rdb$field_name)) containing 'PAG' or
    upper(trim(f.rdb$field_name)) containing 'OBS' or
    upper(trim(f.rdb$field_name)) containing 'PRECO' or
    upper(trim(f.rdb$field_name)) containing 'TABELA'
  )
order by 1,3;

-- 2. Verificar identidade dos campos de produto ja usados sem presumir qual
-- deles aparece na coluna 'Codigo' da impressao 352488 (imagem: 3847).
select i.pedido, i.item, i.produto as codigo_interno,
       p.codigo as codigo_cadastro,
       p.codacessog as codigo_comercial,
       i.nome as descricao, i.und as unidade, i.qtde as quantidade_base,
       i.qtde_pc as qtde_pc, i.peso_liquido as peso_liquido,
       i.vunit as unitario_base, i.vunit_pc as unitario_pc, i.vtotal
from arqes15 i
left join cad_produto p on p.codigo = i.produto
where i.pedido in (352488,352688)
order by i.pedido, i.item;

-- 3. Comparar pedido com a imagem da impressao, sem assumir joins adicionais:
-- campos nao conhecidos ainda devem ser obtidos por metadados e homologados
-- antes de ampliar a consulta de negocio da API local.
-- 4. Observacao importante: Qtde KG de item UNID pode representar quantidade
-- base do SIC; nao somar como massa sem comprovar unidade/mapeamento.

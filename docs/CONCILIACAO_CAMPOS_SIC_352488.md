# Conciliação dos dados comerciais SIC — Pedido 352488

## Observação da tela oficial SIC fornecida para homologação

- Pedido 352488, empresa 1, `SITU=0`, `LIBERADO=S`.
- SIC exibe Cód. Produto **3847**, Ref. Fornecedor **2506**, grupo **CALHA**.
- SIC exibe **Qtd KG 16,555**, **Qtde. Peças 5,5**, Unidade **MTD**, valor unitário KG R$ 14,50 e Total R$ 240,05.
- A API Node atual, na consulta `ARQES15`, usa `I.PRODUTO AS CODIGO_PRODUTO` e devolve **1379**. Sem conhecer o mapeamento oficial dos códigos, NÃO substituir esse valor por 3847.
- Resultado financeiro matemático conferido; quantidade x preço é compatível com 16,555 kg × R$ 14,50 ≈ R$ 240,05. Não prova que `I.QTDE` represente quilogramas para todos os produtos.
- PDF e frontend exibem agora código da **API** e alertam que código, quantidade e base comercial requerem conciliação.
- Data é formatada para pt-BR em fuso `America/Sao_Paulo` na minuta.

## Diagnóstico seguro para equipe TI, somente leitura
Baixar `scripts/diagnostico-campos-sic.cjs` da branch de migração do GitHub e salvar como `C:\DRAFER\ACEITE-API\diagnostico-campos-sic.cjs`.

Abrir o PowerShell **na sessão em que FB_* estiverem corretamente configuradas**, sem reiniciar serviço ou abrir porta:

```powershell
cd C:\DRAFER\ACEITE-API
node .\diagnostico-campos-sic.cjs 352488
```

O diagnóstico usa `RDB$RELATION_FIELDS` e consulta até 3 registros da `ARQES15` com parâmetro `PEDIDO=352488`, imprimindo somente os campos técnicos candidatos. Não edita registros. Revisar e ocultar qualquer dado sensível antes de compartilhar a saída.

## Próximo passo após resultado real

1. Correlacionar o campo `3847` com o identificador correto e/ou `JOIN` de cadastro, comparando também `1379` da API e referência 2506.
2. Identificar a origem e a unidade de `QTDE KG`, `QTDE PEÇAS`, `V. UNIT. KG` e `V. UNIT. PEÇA`, respeitando conversões e arredondamentos.
3. Ajustar `C:\DRAFER\ACEITE-API\src\services\itensService.js` com uma consulta compatível com o schema real, validando em pelo menos um produto de cada família comercial.
4. Retornar novos campos padronizados pelo serviço interno e encaminhá-los pela ponte HTTPS já existente; refletir no frontend/PDF.
5. Validar formalmente o texto final com área jurídica e o mapeamento de `SITU`; o aceite permanece tecnicamente desativado até então.

**Atenção:** nenhuma edição direta dos códigos de produto da consulta, nenhuma reclassificação do status SIC e nenhuma emissão jurídica definitiva antes da conciliação.

# DRAFER ACEITE — Homologação comercial e minuta jurídica (Fase H1)

## Referência preservada
Sistema legado Base44: `src/pages/AssinarAceite.jsx` utiliza `TermoGarantia.jsx` e o aceite nível 1 de autorização de fabricação, com etapas futuras de entrega e instalação. `src/components/TermoGarantia.jsx` contém 11 seções: prazo e limitações de garantia, recebimento, descarregamento, armazenagem, manuseio, instalação, ambientes agressivos, responsabilidade, assistência técnica e hipóteses de perda de garantia. **As cláusulas originais NÃO foram automaticamente autorizadas para a nova plataforma.** Algumas exigem revisão jurídica e técnica antes de serem apresentadas ao cliente.

## SIC validado em homologação
Pedido 352488, empresa 1, `SITU=0`, `LIBERADO=S`, 1 item, subtotal R$ 240,05, desconto zero, total R$ 240,05, `validacao.valido=true`. Conferência matemática não significa autorização jurídica.

## Comportamento implementado
- Dashboard mostra pedido, cliente, datas, itens, valores, código bruto `SITU`, sinal `LIBERADO` e conferência financeira.
- Botão **Baixar espelho da consulta (PDF)**: documento operacional sem efeito jurídico.
- Botão **Baixar minuta do termo (PDF)**: minuta local no navegador, sem salvar no banco; identifica-se como **não assinar/não enviar ao cliente** e exige revisão. Nenhum token ou assinatura é criado.
- Botão **Gerar termo de aceite** permanece desativado mesmo quando valores batem e `LIBERADO=S`, porque a regra comercial `SITU` ainda não foi homologada.
- Frontend e PDF não alteram `aceite_orders`, `aceite_tokens`, `aceite_acceptances` ou o banco SIC.

## Checklist pendente para habilitar termo FINAL
1. Registrar o mapeamento oficial e aprovado de `ARQES13.SITU`, `LIBERADO`, situação fiscal e produção, por empresa, incluindo cancelado/faturado/concluído e pedidos sem itens.
2. Confirmar a correspondência do número de pedido entre empresas (se números SIC se repetirem).
3. Validar todos os campos obrigatórios do documento: razão social/CNPJ do fornecedor, cliente e identificação necessária, endereço quando aplicável, produtos, unidade, quantidades e valores e data comercial.
4. Revisão jurídica integral do conteúdo do termo legado, direitos do consumidor, restrições de cancelamento/devolução, garantia e responsabilidades, mais revisão técnica dos diagramas e recomendações.
5. Gerar PDF final imutável do lado do servidor, com versão do modelo, hash SHA-256, dados de origem e comprovante armazenado em bucket privado Supabase.
6. Somente após homologar o passo anterior, criar link público de token de uso único, com expiração, consentimento explícito e evidências; não ativar a assinatura nesta fase.
7. Implantar API e conector como serviços Windows com credenciais protegidas, rotação do segredo que apareceu nas capturas, monitoramento e política de retenção das solicitações SIC.

**Não habilitar assinatura nem gerar link público por alteração apenas no estado do frontend.** Elegibilidade e geração devem ser impostas e verificadas no backend.

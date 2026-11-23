# ACEITE DRAFER — Redesenho aprovado com Jaime Junior (17/11/2026)

## Fluxo definido

Vendedor autenticado (email institucional ou Gmail previamente autorizado) → digita número do pedido → consulta SIC via Bridge → espelho fiel ao layout de impressão → lê termo completo na mesma página → gera aceite e link → copia ou compartilha via WhatsApp → cliente lê e assina no celular → vendedor acompanha status/evidências.

**Decisão de produto:** retirar dupla aprovação jurídica/comercial por pedido do fluxo operacional. Manter históricos e designações antigas apenas para auditoria/rollback; nenhuma exclusão de dados. A validação do **modelo jurídico** e a segurança de assinatura continuam obrigatórias antes de habilitar produção.

## Entrega implementada nesta etapa

- Novo `VendorWorkflow.jsx` substitui o antigo `SicLookup` no Dashboard.
- Consulta real à fila SIC existente (`sic-request`) por número do pedido; reaproveita conector e validações.
- Tela de espelho de impressão que preserva a ordem dos campos do layout enviado e mostra **Não informado pelo SIC** quando dados não constam da API.
- Exibe os itens, quantidades em KG e peças, preço por peça, valor total, subtotal e desconto, sem confundir os dois códigos já conhecidos.
- Renderiza todas as cláusulas originais via `vendor-legal-preview` na mesma página (admin/vendedor). Apenas para revisão, sem simular homologação jurídica.
- Verificação de status do pedido, existência de links e resumo de evidências de assinatura via `vendor-acceptance-status`; nenhuma chave de link ou assinatura bruta é exposta.
- Espaços previstos para **Gerar aceite**, **Copiar link**, **WhatsApp**, temporariamente desabilitados enquanto o modelo legal e dados de impressão não forem validados.

## GAPS encontrados contra a impressão do pedido 352488

**Na impressão SIC:** empresa DRAFER DISTR. DE ACO, pedido 352488, telefone, tipo de venda, tabela de preço, emissão com hora 15:43, vendedor 15, cliente 1177, telefone, CNPJ, comprador, email, endereço, cidade, bairro, UF, CEP, forma de cobrança, condição de pagamento, local de entrega, observações, código de item **3847**, Qtde. KG 16,555, Qtde. PC 5,5, Vr Unit 43,646, total 240,05.

**Na resposta SIC já armazenada no Supabase:** pedido 352488, empresa id 1, cliente 1177 e nome, data sem hora original, itens/descritivo, códigos **interno 1379** e **comercial 2506** (referência fornecedor 2506), unidade MTD, peso líquido 16,555, peças 5,5, valor por peça 43,645454... e valor total 240,05.

**NÃO estão comprovadamente mapeados no snapshot da API atual:** código **3847 da coluna de impressão**, razão social/telefone da filial, cabeçalho de tipo de venda, tabela de preço, horário local original, identificação do vendedor, telefone/CNPJ/comprador/email/endereço do cliente, forma de cobrança, condição de pagamento, endereço de entrega e observações. Conferir tabela e joins relevantes em **ARQES13**, **ARQES15**, **ARQCAD**, **CAD_PRODUTO** e eventuais tabelas auxiliares. Não pressupor que o campo `CAD_PRODUTO.CODACESSOG` seja o código da impressão.

## Próxima integração, indispensável antes da emissão pública

1. Ampliar **somente leitura** o conector SIC on-premise para o contrato `pedidoCompleto` com todos os campos impressos, sem alterar Firebird. Validar 352488 e outros pedidos/empresas contra relatório original. Campos inexistentes devem ser reportados, nunca inventados.
2. Documentar e homologar qual tabela/campo origina **3847**, distinguindo código interno/comercial/fornecedor/código de impressão.
3. Aprovar modelo definitivo do termo (conteúdo, diagrama, política jurídica/garantia, texto exibido e hash), independente de aprovações por pedido.
4. Implementar emissão imutável do PDF, token público vinculado à versão de documento, link privado de uso único, expiração/revogação, página cliente responsiva com assinatura touch e consentimento expresso, evidências e auditoria.
5. Somente após assinatura válida e regra SIC de elegibilidade aprovada, permitir ações operacionais de fabricação. Não escrever no SIC até validação do processo pela direção.
6. Homologar controles de acesso por vendedor/filial, e-mails autorizados, privacidade de CPF/CNPJ/contatos e política de retenção.

**Regra de segurança:** o botão WhatsApp/Copiar link só habilita quando um link real válido existir, jamais criar URL pública com apenas número do pedido. Não ligar API pública aos dados do SIC sem verificação de autorização/token.

## Homologação

- Build e testes GitHub Actions obrigatórios, além de conferência visual da tela com a imagem original.
- Obter saída da nova versão do SIC-Bridge para o pedido 352488 e comparar cada célula à impressão.
- Confirmar que o cliente no celular consegue ler todas as cláusulas e assinar na **mesma página**, antes de liberar produção.


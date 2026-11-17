# ACEITE DRAFER — Roteiro de apresentação e homologação

## Entrega atual: MODO DEMONSTRAÇÃO (acesso restrito)

A nova página `/Apresentacao` permite à equipe de TI demonstrar com o pedido SIC 352488:
1. Consulta de pedido real já importado/validado do SIC SupraSYS (SIC-Bridge e Supabase).
2. Dados do cliente, itens, códigos comerciais/internos, pesos, peças, preços.
3. As 11 seções originais do termo, seus oito tópicos técnicos de instalação e três diagramas.
4. Etapas internas de minuta, revisão, aprovação jurídica/comercial e dossiê.
5. PDF **DEMONSTRAÇÃO — SEM VALIDADE JURÍDICA**, com o pedido e o termo completo.
6. Simulação da experiência de consentimento do cliente, somente no navegador, **sem gravação e sem assinatura válida**.

No Dashboard, clicar **Apresentar fluxo do aceite**. Ou abrir `/Apresentacao` autenticado como admin.

## Restrições explícitas

- `/.netlify/functions/acceptance-presentation` é **GET, autenticado e admin-only**.
- A Function não escreve em banco, não gera tokens, não altera status e não cria assinatura.
- O fluxo de simulação no frontend usa somente state React, sem `apiPost` ou Storage.
- Não usar PDF da apresentação como autorização de fabricação.
- A tela pública real `/AssinarAceite` continua sem funcionalidade de assinatura até homologação jurídica.

## Roteiro sugerido de demonstração — 8 minutos

**Abertura (1 min):** objetivo: rastreabilidade jurídica, redução de retrabalho e integração com SIC sem duplicar cadastro.

**Integração (2 min):** Dashboard interno, consulta pelo número 352488, situação do pedido, identificação do cliente e código do produto 2506 com sequência interna 1379.

**Revisão e aprovações (2 min):** minuta privada com versão e hash; contas institucionais de Heitor (jurídico) e Jaime (comercial), parecer e aprovação separados, histórico permanente e controles por empresa.

**Experiência futura do cliente (2 min):** tela de apresentação, termo original integral, PDF demonstrativo, simulação de ciência. Explicar que não são aceite real nem liberação de fabricação.

**Próximas decisões (1 min):** jurídico revisa as cláusulas, engenharia confere diagramas, comercial homologa regras SIC e gestão aprova o uso externo.

## Checklist para go-live real (não concluído)

- [ ] Jurídico aprova versão final, direitos do consumidor, exclusões/garantia e condições de pedido sob medida.
- [ ] Engenharia valida instruções de instalação, fixação, materiais e diagramas por família.
- [ ] Comercial define elegibilidade por situação/liberação/faturamento e quando fabricação pode iniciar.
- [ ] Identidade da empresa emitente e dados obrigatórios confirmados.
- [ ] Documento final imutável sem avisos de demonstração; hash validado e armazenado.
- [ ] Endpoint de emissão interna que exige aprovações e documento final homologado.
- [ ] Link público de uso único com token aleatório e hash armazenado, validade curta, proteção a replay e revogação.
- [ ] Página pública recebe somente informações do pedido autorizado, evidencia texto efetivamente exibido, obtém consentimento explícito e impede repetição.
- [ ] Evidências de assinatura com data/hora, hash, trilha de auditoria e política de retenção/LGPD.
- [ ] Testes completos de idempotência, concorrência, falhas parciais, expiração e recuperação.
- [ ] Conferência dos DNS e do domínio final `aceite.grupodrafer.com`.
- [ ] Rotacionar credenciais/segredos antigos, em especial `SIC_BRIDGE_TOKEN`, antes da exposição pública.

## Observação

O termo original contém cláusulas de perda automática de garantia, restrição absoluta de cancelamento e transferência total de responsabilidade. **Não podem ser consideradas aprovadas automaticamente**. O produto em homologação não deve alegar validade jurídica de assinaturas simuladas.

## Rollback

A nova rota e Function de demonstração podem ser removidas sem alterar o SIC, Firebird, registros de aprovações, dossiês e acesso dos usuários.

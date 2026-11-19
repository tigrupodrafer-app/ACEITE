# ACEITE DRAFER — Dossiê interno após aprovações

## Escopo

O novo botão **Gerar dossiê de homologação** fica disponível no Dashboard do administrador, junto ao PDF versionado, exclusivamente quando **Heitor (jurídico) e Jaime (comercial)** tiverem registrado decisões favoráveis na **mesma versão/mesmo hash** da minuta, na empresa 1 do SIC.

O dossiê é um PDF **INTERNO**, com dados do pedido, hash da minuta e dados das duas decisões, justificativas, identidade técnica dos aprovadores e datas UTC. Não é o termo jurídico definitivo nem documento de aceite do cliente.

## Proteção
- A Function `approval-dossier` exige usuário autenticado com papel `admin`. Aprovadores não podem emitir nem baixar o dossiê de administração, embora possam baixar a minuta da própria empresa.
- Emissão exige duas decisões `aprovado` da versão mais recente, **dois usuários diferentes**, mesmo hash e mesma empresa, e nomeações ainda ativas.
- Documentos são armazenados no bucket `aceite-privado`, caminhos únicos sem sobrescrita; SHA-256 do arquivo e do documento fonte são registrados em `aceite_approval_dossiers`.
- Dossiê somente leitura, um por minuta. Novo PDF da minuta requer novas decisões.
- O histórico anterior permanece. RLS habilitada. Nenhuma chave de serviço, link público, token, assinatura ou transição para fabricação é criada.
- O download privado recalcula o SHA-256 dos bytes e compara ao registro antes de responder.

## Teste operacional

1. No Netlify, verificar commit mais recente da branch de homologação.
2. Heitor, pela Central de Aprovações, deve baixar a minuta v5 do pedido 352488, ler todo o texto e, somente após revisão efetiva, registrar decisão jurídica com justificativa. **Não registrar aprovações de teste como decisões reais sem revisão.**
3. Jaime, em sessão individual, deve analisar o mesmo PDF/versão e registrar a decisão comercial de modo independente.
4. Administrador TI acessa o Dashboard, consulta o mesmo pedido, registra rascunho existente e recarrega a minuta versionada.
5. No bloco **Dossiê interno de homologação**, clicar em **Atualizar decisões** e verificar jurídico/comercial.
6. Se ambas decisões forem **aprovado**, o botão **Gerar dossiê de homologação** é habilitado. Emitir, conferir versão e SHA e baixar o PDF privado.
7. Confirmar registro único em `public.aceite_approval_dossiers`, e ausência de novos tokens/assinaturas.

## Pendências para termo definitivo

Ainda falta aprovação jurídica **do conteúdo final** e validação técnica das instruções, empresa emitente, política comercial e direitos legais. A função de dossiê **não converte** `review_draft` em `level1_acceptance` e não libera assinatura. Se as minutas contiverem advertências como "não assinar", elas continuam válidas. A emissão de termo jurídico final será uma etapa separada, com nova versão do texto aprovado e controles de assinatura/evidências.

## Rollback

A função `approval-dossier.cjs` e o botão podem ser desabilitados sem afetar SIC, API, Bridge, Auth ou PDFs anteriores. Não apagar o histórico interno.

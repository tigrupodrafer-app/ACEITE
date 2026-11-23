# DRAFER ACEITE — Contrato de confirmação do endereço de entrega

Status: especificação de implementação, **não implantada**. Branch isolada; não alterar a API em execução ou publicar no Netlify antes da homologação.

## Origem e seleção

- A fonte é o SIC SupraSYS (Firebird, exclusivamente SELECT). Identificar o pedido por número e empresa, e relacionar o cliente por `TIPOC` e `CODIC`.
- O vínculo `ARQES13.SEQENDENTREGA` pode estar nulo. Nunca inferir que o endereço principal foi escolhido no pedido.
- Consultar endereços ativos de entrega em `ARQCADEND` para o cliente correto. Cada opção deve ter identificador estável (sequência), logradouro, número, bairro, CEP, cidade e UF quando disponíveis. Separar endereço cadastral de endereço de entrega.
- Se houver vários endereços, o vendedor deve escolher explicitamente. O principal pode ser sugerido, jamais confirmado automaticamente.
- Se não houver endereços em `ARQCADEND`, mostrar o endereço cadastral como referência, marcado como **não confirmado**, e exigir confirmação explícita de seu uso como entrega ou regularização do cadastro conforme regra de negócio.

## Confirmação segura

1. O frontend envia a **referência** da opção escolhida, o número do pedido e a intenção de confirmar; nunca autoriza diretamente a assinatura nem decide o conteúdo jurídico.
2. O backend autentica e autoriza o vendedor, consulta novamente a opção no SIC ou compara com uma versão confiável do espelho, verifica a pertença ao cliente e à empresa e impede confirmação de opção inexistente/inativa.
3. O backend grava um snapshot imutável do endereço efetivamente selecionado, identificador de origem, identidade do vendedor, instante do servidor e versão do pedido. Mudanças posteriores exigem nova versão e invalidação do aceite anterior.
4. O snapshot deve compor o espelho público, o termo A4 homologado e o material versionado com SHA-256 **calculado/verificado no backend**. Hash do navegador é apenas auxiliar.
5. A emissão do link e a assinatura permanecem bloqueadas até confirmação válida, ausência de pendências do pedido e verificações jurídicas e financeiras já existentes.
6. Evitar corrida entre edições e assinaturas: transação/controle de versão e verificação do snapshot vigente antes da assinatura.

## Cenários de homologação

- Pedido 352488: doze endereços de entrega ativos; um marcado principal (sequência 2524), mas nenhum vinculado pelo pedido. Exigir seleção explícita.
- Pedido 352688: nenhum endereço de entrega em ARQCADEND; exibir endereço cadastral apenas como referência e exigir confirmação/regularização.
- Rejeitar endereço de outro cliente, endereço inativo, confirmação duplicada conflitante, mudança de endereço após geração de link e assinatura de versão obsoleta.
- Confirmar que as 13 cláusulas, PDF A4, evidências de assinatura e leitura somente do SIC permanecem íntegros.

## Limites operacionais

- A branch de integração SIC contém código de consulta e espelho que não deve ser mesclado às cegas; revisar os contratos de API antes de portar.
- Não reintroduzir Base44.
- Não reiniciar API/Ponte SIC, não executar SQL de escrita e não fazer redeploy intermediário.
- Gerenciador conjunto de API/Ponte SIC é uma etapa separada e deverá reutilizar launchers e credenciais DPAPI existentes, evitando processos duplicados.

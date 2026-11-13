import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { isSafeFileUrl } from '../../shared/urlSafety.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { orderId, imageUrl } = await req.json();
    if (!orderId || !imageUrl) return Response.json({ error: 'orderId e imageUrl obrigatórios' }, { status: 400 });

    // A URL vem do cliente: só é aceita se apontar para o armazenamento da
    // plataforma. Sem isto o servidor pode ser levado a buscar endereços internos.
    if (!isSafeFileUrl(imageUrl)) {
      return Response.json({ error: 'Arquivo inválido. Envie a imagem pelo próprio sistema.' }, { status: 400 });
    }

    const order = await base44.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });

    // Extract data from manufacturing order image using AI
    let extractRes;
    try {
      extractRes = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise esta imagem de uma Autorização de Fabricação de telhas metálicas da empresa Drafer.

Extraia TODOS os itens da tabela principal com as seguintes colunas:
- Qtd PC (Quantidade de Peças/chapas, coluna "Qtd PC")
- Comp. ou Comprimento (em mm, número como 6200, 6000, 5500 — coluna "Comp.")
- Qtde M. (Quantidade em Metros — coluna "Qtde M.", número como 18.6, 12, 22)
- modelo: leia palavra por palavra o início exato da coluna "Descrição do Produto" de CADA linha. Copie literalmente apenas as letras e números antes da palavra "Tipo" ou do primeiro "|". Por exemplo: "TR35 Tipo:..." → modelo é "TR35". "TR-35 Tipo:..." → "TR-35". Se todas as linhas tiverem a MESMA descrição (como "TR35 Tipo:" repetido), use o MESMO modelo em todas as linhas. NUNCA crie modelos diferentes se a descrição for igual. NÃO invente, NÃO suponha, NÃO complete com variações que não estão escritas na imagem.
- Descrição do Produto completa

Também extraia:
- Número da Autorização de Fabricação (campo "AUTORIZAÇÃO DE FABRICAÇÃO Nº")
- Nome do cliente
- Data de entrega (campo "Data Entrega:")
- Total de Qtde PC (campo "Qtde PC:" no rodapé, ex: 9)
- Total de Qtde Metro (campo "Qtde Metro:" no rodapé, ex: 52.6)

IMPORTANTE: Extraia TODOS os itens/linhas da tabela, não apenas o primeiro. Se todas as linhas têm o mesmo modelo, repita o mesmo modelo para todas.`,
        file_urls: [imageUrl],
        response_json_schema: {
          type: 'object',
          properties: {
            authorization_number: { type: 'string' },
            client_name: { type: 'string' },
            delivery_date: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  qtd_pc: { type: 'number' },
                  comprimento: { type: 'number' },
                  qtd_metros: { type: 'number' },
                  modelo: { type: 'string' },
                  descricao: { type: 'string' }
                }
              }
            },
            total_pc: { type: 'number' },
            total_metros: { type: 'number' }
          }
        }
      });
    } catch (llmError) {
      console.error('processManufacturingOrder LLM error:', llmError);
      return Response.json({ error: 'Não foi possível extrair os dados da Ordem de Fabricação. Tente enviar uma imagem mais nítida.' }, { status: 500 });
    }

    // Use tile_type from the sales order as the description for all items
    const items = (extractRes.items || []).map(item => ({
      ...item,
      descricao: order.tile_type || ''
    }));

    // Update order with manufacturing data
    await base44.entities.Order.update(orderId, {
      manufacturing_order_image_url: imageUrl,
      manufacturing_auth_number: extractRes.authorization_number || '',
      manufacturing_order_items: items,
      manufacturing_total_pc: extractRes.total_pc || 0,
      manufacturing_total_metros: extractRes.total_metros || 0,
      manufacturing_delivery_date: extractRes.delivery_date || '',
    });

    return Response.json({ success: true, data: extractRes });
  } catch (error) {
    console.error('processManufacturingOrder error:', error);
    return Response.json({ error: 'Não foi possível processar a Ordem de Fabricação.' }, { status: 500 });
  }
});
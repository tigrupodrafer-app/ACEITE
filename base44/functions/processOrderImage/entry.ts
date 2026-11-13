import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { isSafeFileUrl } from '../../shared/urlSafety.ts';

// Normaliza o material para um dos valores aceitos pelo schema de Order
function normalizeMaterial(raw) {
  if (!raw) return null;
  const t = String(raw).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const flat = t.replace(/[^a-z]/g, '');
  if (flat.includes('galvalume') || flat.includes('galva') || flat.includes('azm') || flat === 'az') return 'Galvalume';
  if (flat.includes('pintad') || flat.includes('pint')) return 'Pre-pintada';
  if (flat.includes('bgl') || flat === 'bg') return 'BGL';
  return null;
}

// Garante que quantity seja um número inteiro >= 1, ou null
function normalizeQuantity(raw) {
  if (raw == null || raw === '') return null;
  let n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/\./g, '.').replace(',', '.'));
  if (!isNaN(n) && n > 0) return Math.round(n);
  return null;
}

const str = (v) => (v == null ? '' : String(v).trim());

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    client: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        document: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        address: { type: 'string' },
        site_responsible: { type: 'string' },
      },
    },
    product: {
      type: 'object',
      properties: {
        product_code: { type: 'string' },
        tile_model: { type: 'string' },
        tile_type: { type: 'string' },
        material: { type: 'string' },
        thickness: { type: 'string' },
        length: { type: 'string' },
        quantity: { type: 'number' },
        approx_weight: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              quantity: { type: 'number' },
              description: { type: 'string' },
            },
          },
        },
      },
    },
    sale: {
      type: 'object',
      properties: {
        sale_date: { type: 'string' },
        seller_name: { type: 'string' },
        seller_phone: { type: 'string' },
        store_name: { type: 'string' },
      },
    },
    confidence: {
      type: 'object',
      properties: {
        client: { type: 'number' },
        material: { type: 'number' },
        quantity: { type: 'number' },
      },
    },
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return Response.json({ error: 'imageUrl required' }, { status: 400 });
    }

    // A URL vem do cliente: só é aceita se apontar para o armazenamento da
    // plataforma. Sem isto o servidor pode ser levado a buscar endereços internos.
    if (!isSafeFileUrl(imageUrl)) {
      return Response.json({ error: 'Arquivo inválido. Envie a imagem pelo próprio sistema.' }, { status: 400 });
    }

    console.log('IMAGE RECEIVED: OK');

    let extraction;
    try {
      extraction = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um especialista em leitura de documentos comerciais brasileiros. Analise esta imagem de um PEDIDO DE VENDA de telhas metálicas da empresa Drafer (Blindagem Metal).

Este documento pode conter texto em tabelas, cabeçalhos, rodapés e selos. Analise a ESTRUTURA VISUAL do documento (cabeçalho, linhas, colunas das tabelas, posição relativa dos valores e suas unidades de medida), não apenas o texto linear.

Procure os dados nos rótulos: CLIENTE, CLIENTE:, NOME, NOME/RAZÃO SOCIAL, RAZÃO SOCIAL, CPF, CNPJ, DOCUMENTO, TELEFONE, CELULAR, WHATSAPP, E-MAIL, EMAIL, ENDEREÇO, ENDEREÇO DA OBRA, RESPONSÁVEL, QTD, QTDE, QUANT., QUANTIDADE, PEÇAS, PCS, PC, UN, UNIDADES, MATERIAL, ESPESSURA, COMPRIMENTO, MODELO, VENDEDOR, DATA, LOJA, CÓDIGO.

REGRAS CRÍTICAS:
1. NUNCA invente dados. Se um campo não puder ser lido com clareza, retorne "" (string vazia) para strings e 0 para quantity.
2. NÃO confunda CLIENTE com VENDEDOR: o vendedor aparece em "Vendedor", "Vend." ou junto aos dados da loja Drafer. O cliente é quem compra.
3. NÃO confunda o telefone do cliente com o telefone do vendedor.
4. NÃO confunda o endereço da obra / endereço do cliente com o endereço da empresa Drafer.
5. QUANTIDADE é o número de peças/unidades — distinga de COMPRIMENTO (ex: "6,00 m", "6200mm"), METROS (m ou m²), PESO (kg) e NÚMERO DO PEDIDO. Exemplo: "Quantidade: 25" e "Comprimento: 6,00 m" → quantity = 25, length = "6,00 m". quantity NUNCA é o comprimento nem o número do pedido.
6. Se o pedido tiver uma TABELA com itens (uma ou mais linhas), NÃO faça a soma você mesmo: preencha product.items com UM objeto para CADA linha da tabela — {quantity: número de peças da coluna Qtd/Qtde/PC dessa linha, description: descrição da linha}. Nesse caso retorne quantity = 0 (o sistema soma as linhas). Se não houver tabela, retorne quantity normalmente e items vazio.
7. material deve ser normalizado para EXATAMENTE um destes valores: "BGL", "Galvalume" ou "Pre-pintada". Variações: "BG", "B.G.L.", "BGL" → "BGL"; "Galvalume", "Galvalume AZM" → "Galvalume"; "Pré-pintada", "Pre-pintada", "Pintada" → "Pre-pintada". Se o material não estiver claramente identificado, retorne "".
8. client.document: CPF (11 dígitos) ou CNPJ (14 dígitos), mantendo a pontuação original.
9. sale.sale_date: formato AAAA-MM-DD quando possível.
10. confidence: números entre 0 e 1 com sua confiança na leitura de cada grupo (client, material, quantity).

Campos a preencher:
- client: name, document (CPF/CNPJ), phone, email, address (endereço da obra), site_responsible (responsável pela obra)
- product: product_code (código do produto), tile_model (ex: TR-35), tile_type (descrição completa da telha), material, thickness (espessura), length (comprimento), quantity (quantidade de peças), approx_weight (peso aproximado)
- sale: sale_date, seller_name, seller_phone, store_name (loja)`,
        file_urls: [imageUrl],
        response_json_schema: EXTRACTION_SCHEMA,
      });
    } catch (llmError) {
      console.error('AI EXTRACTION: FAILED —', llmError.message);
      return Response.json({ error: 'Não foi possível processar a imagem. Tente enviar uma imagem mais nítida.', reason: 'processamento_falhou' }, { status: 500 });
    }

    const material = normalizeMaterial(extraction?.product?.material);
    const quantity = normalizeQuantity(extraction?.product?.quantity);

    // SOMA DA QUANTIDADE: feita em código, linha por linha (não pela IA)
    const quantityItems = Array.isArray(extraction?.product?.items)
      ? extraction.product.items.map(it => normalizeQuantity(it?.quantity)).filter(n => n != null)
      : [];
    const quantitySum = quantityItems.length ? quantityItems.reduce((acc, n) => acc + n, 0) : null;
    const quantityFinal = quantitySum != null ? quantitySum : quantity;
    if (quantitySum != null) {
      console.log('QUANTITY SUM (código):', quantityItems.join(' + '), '=', quantitySum, '| IA disse:', quantity);
    }

    console.log('AI EXTRACTION:', {
      has_client: !!(extraction?.client?.name),
      has_material: !!material,
      has_quantity: quantityFinal != null,
      confidence: extraction?.confidence || null,
    });

    // Mapeamento explícito IA → Order (nenhum dado inventado: vazio permanece vazio)
    const data = {
      client: {
        name: str(extraction?.client?.name),
        document: str(extraction?.client?.document),
        phone: str(extraction?.client?.phone),
        email: str(extraction?.client?.email),
        address: str(extraction?.client?.address),
        site_responsible: str(extraction?.client?.site_responsible),
      },
      product: {
        product_code: str(extraction?.product?.product_code),
        tile_model: str(extraction?.product?.tile_model),
        tile_type: str(extraction?.product?.tile_type),
        material,
        thickness: str(extraction?.product?.thickness),
        length: str(extraction?.product?.length),
        quantity: quantityFinal,
        approx_weight: str(extraction?.product?.approx_weight),
      },
      sale: {
        sale_date: str(extraction?.sale?.sale_date),
        seller_name: str(extraction?.sale?.seller_name),
        seller_phone: str(extraction?.sale?.seller_phone),
        store_name: str(extraction?.sale?.store_name),
      },
    };

    console.log('MAPPING: client.name → Order.client_name | product.material → Order.material | product.quantity → Order.quantity | product.length → Order.length');

    const confidence = {
      client: typeof extraction?.confidence?.client === 'number' ? extraction.confidence.client : 0,
      material: typeof extraction?.confidence?.material === 'number' ? extraction.confidence.material : 0,
      quantity: typeof extraction?.confidence?.quantity === 'number' ? extraction.confidence.quantity : 0,
    };

    return Response.json({ success: true, data, confidence });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Não foi possível processar a imagem. Tente enviar uma imagem mais nítida.', reason: 'processamento_falhou' }, { status: 500 });
  }
});
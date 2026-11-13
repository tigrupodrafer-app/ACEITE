// Módulo compartilhado: geração, armazenamento privado e auditoria dos PDFs de aceite (N1/N2/N3) e Termo de Garantia.
// Os PDFs são gerados a partir dos dados registrados no momento da conclusão do aceite e armazenados em arquivo privado.

import { jsPDF } from 'npm:jspdf@4.0.0';
import { logAudit } from './acceptanceTokens.ts';

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69b080ba942cb63e0f99eb48/c1b6412c8_WhatsAppImage2026-02-04at142058.jpg';

const PW = 210; // A4 mm
const PH = 297;
const MARGIN = 14;
const CONTENT_W = PW - MARGIN * 2;

const N2_CHECKLIST_LABELS = {
  conferido: 'Conferiu o material no momento da entrega',
  quantidades_corretas: 'As quantidades estão corretas',
  sem_danos: 'Não há danos visíveis no momento da entrega',
  responsabilidade_aceita: 'A partir da descarga a responsabilidade passa ao cliente',
};

const N3_CHECKLIST_LABELS = {
  unloading: {
    title: 'CHECKLIST DE DESCARGA',
    nao_arrastar: 'As telhas não devem ser arrastadas',
    nao_torcao: 'Não devem sofrer torção',
    apoio_adequado: 'Devem ser descarregadas com apoio adequado',
    sem_impacto: 'Não devem sofrer impacto ou queda',
    equipe_adequada: 'Devem ser movimentadas com equipe adequada',
  },
  storage: {
    title: 'CHECKLIST DE ARMAZENAMENTO',
    local_seco: 'Armazenar em local seco',
    evitar_umidade: 'Evitar contato com água ou umidade',
    ventilacao: 'Manter ventilação entre as telhas',
    nao_solo: 'Não encostar diretamente no solo',
    nao_empilhado: 'Não empilhar de forma inadequada',
  },
  installation: {
    title: 'CHECKLIST DE INSTALAÇÃO',
    normas_tecnicas: 'A instalação seguirá normas técnicas',
    caimento_minimo: 'O telhado terá caimento adequado',
    fixadores_corretos: 'Serão usados fixadores corretos',
    cortes_corretos: 'Os cortes serão feitos com ferramenta adequada',
    profissional_qualificado: 'A instalação será feita por profissional qualificado',
  },
};

// Termo de Garantia — conteúdo idêntico ao componente TermoGarantia.jsx (texto jurídico aprovado pela Drafer)
const WARRANTY_SECTIONS = [
  {
    number: '1', title: 'PRAZO DE GARANTIA',
    blocks: [
      { type: 'p', text: '12 (doze) meses a partir da data de entrega, limitada exclusivamente a defeitos de fabricação.' },
      { type: 'strong', text: 'A garantia NÃO cobre danos causados por:' },
      { type: 'bullets', items: ['Transporte inadequado', 'Descarregamento incorreto', 'Armazenamento inadequado', 'Instalação fora das normas técnicas', 'Uso inadequado do produto', 'Ambientes agressivos ou corrosivos'] },
    ],
  },
  {
    number: '2', title: 'LIMITAÇÃO DA GARANTIA',
    blocks: [
      { type: 'strong', text: 'A garantia cobre exclusivamente:' },
      { type: 'bullets', items: ['Defeitos comprovados de fabricação', 'Falhas estruturais do material'] },
      { type: 'strong', text: 'A garantia NÃO cobre:' },
      { type: 'bullets', items: ['Arranhões ou abrasões', 'Amassamentos ou deformações mecânicas', 'Danos por impacto', 'Oxidação por ambiente agressivo', 'Danos por cortes ou perfurações inadequadas', 'Danos por instalação incorreta'] },
    ],
  },
  {
    number: '3', title: 'RECEBIMENTO DO MATERIAL',
    blocks: [
      { type: 'p', text: 'No momento da entrega, o CLIENTE deverá obrigatoriamente:' },
      { type: 'bullets', items: ['Conferir quantidades', 'Verificar dimensões', 'Verificar integridade das telhas', 'Verificar possíveis avarias ou deformações'] },
      { type: 'strong', text: 'Após a confirmação do recebimento, considera-se que o material foi recebido em perfeito estado.' },
    ],
  },
  {
    number: '4', title: 'DESCARREGAMENTO',
    blocks: [
      { type: 'p', text: 'O descarregamento é de responsabilidade exclusiva do CLIENTE. Devem ser observadas:' },
      { type: 'bullets', items: ['Utilizar número adequado de pessoas', 'Evitar arrastar as telhas', 'Evitar torção ou dobra das peças', 'Evitar impacto ou queda', 'Manter apoio uniforme durante a movimentação'] },
    ],
  },
  {
    number: '5', title: 'ARMAZENAGEM',
    blocks: [
      { type: 'p', text: 'O CLIENTE deve obrigatoriamente seguir:' },
      { type: 'bullets', items: ['Armazenar em local coberto, seco e ventilado', 'Manter as telhas fora do contato direto com o solo', 'Utilizar pallets ou calços estruturais', 'Proteger contra chuva e umidade', 'Evitar empilhamento excessivo', 'Evitar contato com produtos químicos'] },
      { type: 'note', text: 'Telhas pré-pintadas exigem atenção especial para evitar abrasão da pintura.' },
    ],
  },
  {
    number: '6', title: 'MANUSEIO',
    blocks: [
      { type: 'bullets', items: ['Não arrastar as telhas', 'Não apoiar peso concentrado sobre o material', 'Não utilizar ferramentas que possam danificar o revestimento', 'Evitar contato com superfícies abrasivas'] },
    ],
  },
  {
    number: '7', title: 'INSTALAÇÃO (NORMAS TÉCNICAS OBRIGATÓRIAS)',
    blocks: [
      { type: 'p', text: 'A instalação deve ser executada por profissional qualificado, respeitando boas práticas de engenharia.' },
      { type: 'sub', title: '7.1 Inclinação mínima', text: 'Respeitar a inclinação mínima recomendada conforme tipo de telha, comprimento da água e sobreposição.' },
      { type: 'sub', title: '7.2 Fixação', text: 'Usar parafusos autobrocantes apropriados com arruelas metálicas e de vedação em EPDM, na região estrutural da onda.' },
      { type: 'sub', title: '7.3 Espaçamento de terças', text: 'Respeitar o vão máximo recomendado considerando espessura, carga de vento, manutenção e peso próprio.' },
      { type: 'sub', title: '7.4 Circulação sobre o telhado', text: 'É PROIBIDO caminhar diretamente sobre as telhas sem o uso de tábuas. As tábuas devem apoiar sobre no mínimo duas terças para distribuir o peso.' },
      { type: 'sub', title: '7.5 Calços', text: 'Utilizar calços estruturais para nivelamento e alinhamento quando necessário.' },
      { type: 'sub', title: '7.6 Corte das telhas', text: 'Usar tesoura elétrica para chapas, serra tico-tico ou guilhotina. NÃO usar esmerilhadeira com disco abrasivo, pois causa oxidação.' },
      { type: 'sub', title: '7.7 Vedação', text: 'Usar fitas vedantes ou selantes específicos para cobertura metálica nas sobreposições.' },
      { type: 'sub', title: '7.8 Telhas termoacústicas', text: 'Evitar armazenamento prolongado sem ventilação; evitar contato com produtos químicos; respeitar espaçamento estrutural recomendado; evitar cargas concentradas sobre os painéis.' },
    ],
  },
  {
    number: '8', title: 'AMBIENTES AGRESSIVOS',
    blocks: [
      { type: 'p', text: 'Em regiões litorâneas, industriais ou com presença de produtos químicos, o desempenho do material pode ser reduzido. A garantia poderá não ser aplicável.' },
    ],
  },
  {
    number: '9', title: 'RESPONSABILIDADE DO CLIENTE',
    blocks: [
      { type: 'p', text: 'Após a entrega, são de responsabilidade exclusiva do CLIENTE: transporte interno, descarregamento, armazenamento, manuseio e instalação.' },
    ],
  },
  {
    number: '10', title: 'ASSISTÊNCIA TÉCNICA',
    blocks: [
      { type: 'p', text: 'Para possível defeito de fabricação, o CLIENTE deverá: comunicar formalmente o GRUPO DRAFER e permitir vistoria técnica.' },
    ],
  },
  {
    number: '11', title: 'PERDA AUTOMÁTICA DA GARANTIA',
    blocks: [
      { type: 'strong', text: 'O não cumprimento de qualquer recomendação implica automaticamente na PERDA TOTAL DA GARANTIA.' },
      { type: 'p', text: 'Casos de anulação automática:' },
      { type: 'bullets', items: ['Instalação inadequada', 'Armazenamento incorreto', 'Descarregamento inadequado', 'Modificação do produto', 'Cortes ou perfurações inadequadas', 'Uso fora das recomendações técnicas', 'Danos causados por terceiros'] },
    ],
  },
];

const N1_DECLARATION = {
  intro: 'O cliente declara estar ciente de que:',
  items: [
    'Este material será fabricado sob medida conforme especificação acima.',
    'Após a fabricação não será possível cancelamento, devolução ou alteração do pedido.',
    'A responsabilidade sobre o produto passa completamente ao cliente após a entrega.',
    'O cliente assume total responsabilidade por transporte, armazenagem e instalação.',
    'A garantia do produto será bloqueada até a conclusão de todos os aceites.',
    'Esta assinatura digital é uma prova jurídica legalmente válida.',
  ],
};

function str(v) { return v == null ? '' : String(v); }

function fmtDateTimeBR(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return str(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDateBR(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return str(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function fmtTimeBR(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function sha256BytesHex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function fetchImageDataUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const cleanPath = url.split('?')[0].toLowerCase();
  if (cleanPath.endsWith('.pdf')) return null;
  if (url.startsWith('data:image')) return { dataUrl: url, format: url.includes('image/png') ? 'PNG' : 'JPEG' };
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const format = ct.includes('png') ? 'PNG' : (ct.includes('webp') ? 'WEBP' : 'JPEG');
    return { dataUrl: `data:image/${format.toLowerCase()};base64,${bytesToBase64(buf)}`, format };
  } catch (e) {
    console.error('Image fetch error:', e);
    return null;
  }
}

function header(doc, logoDataUrl, docTitle, orderNumber) {
  doc.setFillColor(26, 26, 26);
  doc.rect(0, 0, PW, 26, 'F');
  let logoDrawn = false;
  if (logoDataUrl) {
    try {
      const props = doc.getImageProperties(logoDataUrl.dataUrl);
      let lw = 30; let lh = (lw * props.height) / props.width;
      if (lh > 16) { lh = 16; lw = (lh * props.width) / props.height; }
      doc.setFillColor(255, 255, 255);
      doc.rect(MARGIN, 5, lw + 4, 16, 'F');
      doc.addImage(logoDataUrl.dataUrl, logoDataUrl.format, MARGIN + 2, 5 + (16 - lh) / 2, lw, lh);
      logoDrawn = true;
    } catch (e) { logoDrawn = false; }
  }
  if (!logoDrawn) {
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text('GRUPO DRAFER', MARGIN, 15);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text(docTitle, MARGIN + 40, 11);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text(`Pedido: ${orderNumber}`, MARGIN + 40, 18);
  doc.setDrawColor(204, 0, 0);
  doc.setLineWidth(1.2);
  doc.line(0, 26, PW, 26);
  return 38;
}

function footer(doc, orderNumber) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 120, 120);
    doc.text(`Drafer | ${orderNumber} | Página ${i} de ${total}`, PW / 2, PH - 8, { align: 'center' });
  }
}

function sectionTitle(doc, y, text) {
  if (y > PH - 30) { doc.addPage(); y = MARGIN; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(26, 26, 26);
  doc.text(text, MARGIN, y);
  doc.setDrawColor(204, 0, 0); doc.setLineWidth(0.5);
  doc.line(MARGIN, y + 2, PW - MARGIN, y + 2);
  return y + 9;
}

function kvRows(doc, y, rows) {
  const labelW = 52;
  doc.setFontSize(9);
  for (const row of rows) {
    const label = row[0]; const value = row[1];
    const lines = doc.splitTextToSize(str(value) || '—', CONTENT_W - labelW);
    const h = lines.length * 5 + 2;
    if (y + h > PH - 22) { doc.addPage(); y = MARGIN; }
    doc.setFont('helvetica', 'bold'); doc.setTextColor(70, 70, 70);
    doc.text(str(label), MARGIN, y + 4);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(26, 26, 26);
    doc.text(lines, MARGIN + labelW, y + 4);
    y += h;
  }
  return y + 2;
}

function bullets(doc, y, items) {
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(26, 26, 26);
  for (const item of items) {
    const lines = doc.splitTextToSize('• ' + str(item), CONTENT_W - 4);
    if (y + lines.length * 5 > PH - 22) { doc.addPage(); y = MARGIN; }
    doc.text(lines, MARGIN + 4, y + 4);
    y += lines.length * 5 + 1;
  }
  return y + 2;
}

function paragraph(doc, y, text, opts = {}) {
  const lines = doc.splitTextToSize(str(text), CONTENT_W);
  if (y + lines.length * 5 > PH - 22) { doc.addPage(); y = MARGIN; }
  if (opts.warning) { doc.setFont('helvetica', 'bold'); doc.setTextColor(180, 83, 9); }
  else if (opts.note) { doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 116, 139); }
  else if (opts.bold) { doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 26); }
  else { doc.setFont('helvetica', 'normal'); doc.setTextColor(26, 26, 26); }
  doc.setFontSize(9);
  doc.text(lines, MARGIN, y + 4);
  return y + lines.length * 5 + 3;
}

function checkItem(doc, y, checked, label) {
  const lines = doc.splitTextToSize(str(label), CONTENT_W - 8);
  const h = lines.length * 5;
  if (y + h > PH - 22) { doc.addPage(); y = MARGIN; }
  doc.setDrawColor(26, 26, 26); doc.setLineWidth(0.3);
  doc.rect(MARGIN, y, 4, 4);
  if (checked) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text('X', MARGIN + 0.7, y + 3.2);
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(26, 26, 26);
  doc.text(lines, MARGIN + 8, y + 3.8);
  return y + h + 2;
}

function drawSignature(doc, y, sigData) {
  y = sectionTitle(doc, y, 'ASSINATURA');
  if (sigData && typeof sigData === 'string' && sigData.startsWith('data:image')) {
    try {
      const props = doc.getImageProperties(sigData);
      let w = 60; let h = (w * props.height) / props.width;
      if (h > 30) { h = 30; w = (h * props.width) / props.height; }
      if (y + h > PH - 22) { doc.addPage(); y = MARGIN; }
      doc.addImage(sigData, 'PNG', MARGIN, y, w, h);
      doc.setDrawColor(150, 150, 150);
      doc.line(MARGIN, y + h + 2, MARGIN + w + 20, y + h + 2);
      return y + h + 10;
    } catch (e) { /* cai no fallback de texto */ }
  }
  doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(90, 90, 90);
  doc.text('Assinatura registrada digitalmente pelo sistema.', MARGIN, y + 4);
  doc.setDrawColor(150, 150, 150);
  doc.line(MARGIN, y + 8, MARGIN + 80, y + 8);
  return y + 14;
}

async function addPhotoGrid(doc, y, urls) {
  const urlsList = (Array.isArray(urls) ? urls : []).filter(Boolean);
  if (!urlsList.length) return y;
  y = sectionTitle(doc, y, 'FOTOS');
  const colW = 87; const gap = 8;
  let col = 0; let rowY = y; let lastY = y;
  for (const url of urlsList) {
    const img = await fetchImageDataUrl(url);
    if (!img) continue;
    try {
      const props = doc.getImageProperties(img.dataUrl);
      let w = colW; let h = (w * props.height) / props.width;
      if (h > 60) { h = 60; w = (h * props.width) / props.height; }
      if (rowY + h > PH - 22) { doc.addPage(); rowY = MARGIN; col = 0; }
      const x = MARGIN + col * (colW + gap);
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
      doc.rect(x, rowY, w, h);
      doc.addImage(img.dataUrl, img.format, x, rowY, w, h);
      col++;
      if (col > 1) { col = 0; rowY += h + 6; }
      lastY = rowY;
    } catch (e) { console.error('Photo embed error:', e); }
  }
  return lastY + (col > 0 ? 66 : 6);
}

async function addImageBlock(doc, y, url) {
  const img = await fetchImageDataUrl(url);
  if (!img) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(90, 90, 90);
    doc.text('(Imagem do documento não pôde ser incluída)', MARGIN, y + 4);
    return y + 8;
  }
  try {
    const props = doc.getImageProperties(img.dataUrl);
    let w = CONTENT_W; let h = (w * props.height) / props.width;
    if (h > 100) { h = 100; w = (h * props.width) / props.height; }
    if (y + h > PH - 22) { doc.addPage(); y = MARGIN; }
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
    doc.rect(MARGIN, y, w, h);
    doc.addImage(img.dataUrl, img.format, MARGIN, y, w, h);
    return y + h + 6;
  } catch (e) {
    console.error('Image embed error:', e);
    return y;
  }
}

function drawChecklist(doc, y, title, checklist, labels) {
  y = sectionTitle(doc, y, title);
  const cl = checklist || {};
  for (const key of Object.keys(labels)) {
    y = checkItem(doc, y, !!cl[key], labels[key]);
  }
  return y + 2;
}

function materialLine(order) {
  return `${str(order.material) || '—'}${order.tile_type ? ' - ' + str(order.tile_type) : ''}`.trim();
}

function identificationRows(order) {
  return [
    ['Número do pedido', str(order.order_number) || '—'],
    ['Data do pedido', order.sale_date ? fmtDateBR(order.sale_date) : '—'],
    ['Cliente', str(order.client_name) || '—'],
    ['CPF/CNPJ', str(order.client_document) || '—'],
    ['Telefone', str(order.client_phone) || '—'],
    ['E-mail', str(order.client_email) || '—'],
    ['Endereço da obra', str(order.client_address) || '—'],
    ['Responsável pela obra', str(order.site_responsible) || '—'],
    ['Vendedor', str(order.seller_name) || '—'],
  ];
}

function productRows(order) {
  return [
    ['Código do produto', str(order.product_code) || '—'],
    ['Modelo da telha', str(order.tile_model) || '—'],
    ['Tipo', str(order.tile_type) || '—'],
    ['Material', str(order.material) || '—'],
    ['Espessura', str(order.thickness) || '—'],
    ['Comprimento', str(order.length) || '—'],
    ['Quantidade', order.quantity != null ? `${order.quantity} un.` : '—'],
    ['Peso aproximado', str(order.approx_weight) || '—'],
  ];
}

function acceptanceMetaRows(acceptance, order, level) {
  const legacyDate = level === 1 ? order.level1_date : level === 2 ? order.level2_date : order.level3_date;
  const date = (acceptance && acceptance.accepted_date) || legacyDate;
  let signerName = order.client_name;
  let signerDoc = order.client_document;
  if (acceptance && (acceptance.signer_name || acceptance.signer_document)) {
    signerName = acceptance.signer_name || signerName;
    signerDoc = acceptance.signer_document || signerDoc;
  }
  if (level === 2 && order.level2_receiver_name) {
    signerName = order.level2_receiver_name;
    signerDoc = order.level2_receiver_document || signerDoc;
  }
  const rows = [
    ['Aceite realizado em', date ? fmtDateTimeBR(date) : '—'],
    ['Data', date ? fmtDateBR(date) : '—'],
    ['Horário', date ? fmtTimeBR(date) : '—'],
    ['Nome do responsável', str(signerName) || '—'],
    ['Documento', str(signerDoc) || '—'],
  ];
  const ip = (acceptance && acceptance.ip) || (level === 1 ? order.level1_ip : '');
  const device = (acceptance && acceptance.device) || (level === 1 ? order.level1_device : '');
  const location = acceptance && acceptance.location;
  if (ip) rows.push(['IP', str(ip)]);
  if (device) rows.push(['Dispositivo', str(device).slice(0, 120)]);
  if (location) rows.push(['Localização', str(location)]);
  return rows;
}

async function buildN1(doc, ctx) {
  const { order, acceptance, logoDataUrl } = ctx;
  let y = header(doc, logoDataUrl, 'TERMO DE ACEITE DO PEDIDO', str(order.order_number) || '—');

  y = sectionTitle(doc, y, '1. IDENTIFICAÇÃO DO CLIENTE');
  y = kvRows(doc, y, identificationRows(order));

  y = sectionTitle(doc, y, '2. PRODUTO');
  y = kvRows(doc, y, productRows(order));

  if (order.manufacturing_auth_number || order.manufacturing_order_items) {
    y = sectionTitle(doc, y, '3. FABRICAÇÃO');
    y = kvRows(doc, y, [
      ['Número da autorização de fabricação', str(order.manufacturing_auth_number) || '—'],
      ['Total de peças', order.manufacturing_total_pc != null ? String(order.manufacturing_total_pc) : '—'],
      ['Total de metros', order.manufacturing_total_metros != null ? String(order.manufacturing_total_metros) : '—'],
      ['Data prevista de entrega', order.manufacturing_delivery_date ? fmtDateBR(order.manufacturing_delivery_date) : '—'],
    ]);
  }

  y = sectionTitle(doc, y, '4. ACEITE');
  y = kvRows(doc, y, acceptanceMetaRows(acceptance, order, 1));

  const sig = (acceptance && acceptance.signature) || order.level1_signature;
  y = drawSignature(doc, y, sig);

  y = sectionTitle(doc, y, '5. DECLARAÇÃO');
  y = paragraph(doc, y, N1_DECLARATION.intro, { bold: true });
  y = bullets(doc, y, N1_DECLARATION.items);
  y = paragraph(doc, y, 'Esta assinatura digital é uma prova jurídica legalmente válida, registrada com data, hora, IP do dispositivo e dados do aceite.');

  const annexes = [
    ['PEDIDO COMERCIAL ASSINADO', order.order_image_url],
    ['AUTORIZAÇÃO DE FABRICAÇÃO', order.manufacturing_order_image_url],
  ].filter((a) => a[1]);
  if (annexes.length) {
    y = sectionTitle(doc, y, '6. ANEXOS');
    for (const annex of annexes) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(70, 70, 70);
      doc.text(annex[0], MARGIN, y + 4);
      y = await addImageBlock(doc, y + 6, annex[1]);
    }
  }
}

async function buildN2(doc, ctx) {
  const { order, acceptance, logoDataUrl } = ctx;
  let y = header(doc, logoDataUrl, 'TERMO DE ACEITE DA ENTREGA', str(order.order_number) || '—');

  y = sectionTitle(doc, y, '1. IDENTIFICAÇÃO DO PEDIDO');
  y = kvRows(doc, y, [
    ['Número do pedido', str(order.order_number) || '—'],
    ['Cliente', str(order.client_name) || '—'],
    ['CPF/CNPJ', str(order.client_document) || '—'],
    ['Material', materialLine(order)],
    ['Quantidade', order.quantity != null ? `${order.quantity} un.` : '—'],
  ]);

  y = sectionTitle(doc, y, '2. ENTREGA');
  y = kvRows(doc, y, [
    ['Data', order.level2_date ? fmtDateTimeBR(order.level2_date) : '—'],
    ['Responsável pelo recebimento', str(order.level2_receiver_name) || (acceptance && acceptance.signer_name) || '—'],
    ['Documento do recebedor', str(order.level2_receiver_document) || (acceptance && acceptance.signer_document) || '—'],
  ]);

  y = drawChecklist(doc, y, '3. CHECKLIST DE RECEBIMENTO', order.level2_checklist, N2_CHECKLIST_LABELS);
  y = await addPhotoGrid(doc, y, order.photos_delivery);

  y = sectionTitle(doc, y, '5. ASSINATURA');
  y = kvRows(doc, y, acceptanceMetaRows(acceptance, order, 2));
  const sig = (acceptance && acceptance.signature) || order.level2_signature;
  y = drawSignature(doc, y, sig);
}

async function buildN3(doc, ctx) {
  const { order, acceptance, logoDataUrl } = ctx;
  let y = header(doc, logoDataUrl, 'TERMO DE ACEITE DA INSTALAÇÃO', str(order.order_number) || '—');

  y = sectionTitle(doc, y, '1. IDENTIFICAÇÃO DO PEDIDO');
  y = kvRows(doc, y, [
    ['Número do pedido', str(order.order_number) || '—'],
    ['Cliente', str(order.client_name) || '—'],
    ['CPF/CNPJ', str(order.client_document) || '—'],
    ['Material', materialLine(order)],
    ['Quantidade', order.quantity != null ? `${order.quantity} un.` : '—'],
  ]);

  y = sectionTitle(doc, y, '2. RESPONSÁVEL PELA INSTALAÇÃO');
  y = kvRows(doc, y, [['Responsável pela obra / instalação', str(order.site_responsible) || '—']]);

  y = drawChecklist(doc, y, '3. CHECKLIST DE DESCARGA', order.level3_unloading_checklist, N3_CHECKLIST_LABELS.unloading);
  y = drawChecklist(doc, y, '4. CHECKLIST DE ARMAZENAMENTO', order.level3_storage_checklist, N3_CHECKLIST_LABELS.storage);
  y = drawChecklist(doc, y, '5. CHECKLIST DE INSTALAÇÃO', order.level3_installation_checklist, N3_CHECKLIST_LABELS.installation);

  y = sectionTitle(doc, y, '6. FOTOS');
  const groups = [
    ['DESCARGA', order.photos_unloading],
    ['ARMAZENAMENTO', order.photos_storage],
    ['INSTALAÇÃO', order.photos_installation],
  ];
  for (const group of groups) {
    const list = (Array.isArray(group[1]) ? group[1] : []).filter(Boolean);
    if (!list.length) continue;
    if (y + 10 > PH - 22) { doc.addPage(); y = MARGIN; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(26, 26, 26);
    doc.text(group[0], MARGIN, y + 4);
    y = await addPhotoGrid(doc, y + 7, list);
  }

  y = sectionTitle(doc, y, '7. ASSINATURA');
  y = kvRows(doc, y, acceptanceMetaRows(acceptance, order, 3));
  const sig = (acceptance && acceptance.signature) || order.level3_signature;
  y = drawSignature(doc, y, sig);
}

function buildWarranty(doc, ctx) {
  const { order, logoDataUrl } = ctx;
  let y = header(doc, logoDataUrl, 'TERMO DE GARANTIA, ARMAZENAGEM, MANUSEIO E INSTALAÇÃO DE TELHAS', str(order.order_number) || '—');

  y = paragraph(doc, y, 'Este termo estabelece as condições de garantia, responsabilidade, armazenamento, manuseio, transporte e instalação das telhas fornecidas pelo GRUPO DRAFER. Aplica-se a: Telhas Galvalume, Telhas de Aço Natural, Telhas Pré-Pintadas e Telhas Termoacústicas.');

  y = sectionTitle(doc, y, 'IDENTIFICAÇÃO DO PEDIDO');
  y = kvRows(doc, y, [
    ['Número do pedido', str(order.order_number) || '—'],
    ['Cliente', str(order.client_name) || '—'],
    ['CPF/CNPJ', str(order.client_document) || '—'],
    ['Material', materialLine(order)],
    ['Quantidade', order.quantity != null ? `${order.quantity} un.` : '—'],
    ['Data do aceite', order.level1_date ? fmtDateTimeBR(order.level1_date) : '—'],
  ]);

  for (const section of WARRANTY_SECTIONS) {
    y = sectionTitle(doc, y, `${section.number}. ${section.title}`);
    for (const block of section.blocks) {
      if (block.type === 'p') y = paragraph(doc, y, block.text);
      else if (block.type === 'strong') y = paragraph(doc, y, block.text, { bold: true });
      else if (block.type === 'note') y = paragraph(doc, y, block.text, { note: true });
      else if (block.type === 'bullets') y = bullets(doc, y, block.items);
      else if (block.type === 'sub') {
        y = paragraph(doc, y, block.title, { bold: true });
        y = paragraph(doc, y, block.text);
      }
    }
  }
}

async function buildPdf(documentType, order, acceptance) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logoDataUrl = await fetchImageDataUrl(LOGO_URL);
  const ctx = { order, acceptance, logoDataUrl };
  if (documentType === 'level1_acceptance') await buildN1(doc, ctx);
  else if (documentType === 'level2_delivery') await buildN2(doc, ctx);
  else if (documentType === 'level3_installation') await buildN3(doc, ctx);
  else buildWarranty(doc, ctx);
  footer(doc, str(order.order_number) || 'PEDIDO');
  return new Uint8Array(doc.output('arraybuffer'));
}

function fileNameFor(order, documentType) {
  const num = (str(order.order_number) || 'PEDIDO').replace(/[^A-Za-z0-9-]/g, '');
  const suffix = {
    level1_acceptance: 'TERMO_ACEITE_N1',
    level2_delivery: 'TERMO_ENTREGA_N2',
    level3_installation: 'TERMO_INSTALACAO_N3',
    warranty: 'TERMO_GARANTIA',
  }[documentType] || 'DOCUMENTO';
  return `DRAFER_${num}_${suffix}.pdf`;
}

const TITLES = {
  level1_acceptance: 'Termo de Aceite do Pedido (N1)',
  level2_delivery: 'Termo de Aceite da Entrega (N2)',
  level3_installation: 'Termo de Aceite da Instalação (N3)',
  warranty: 'Termo de Garantia, Armazenagem, Manuseio e Instalação de Telhas',
};

export async function generateDocument(base44, { orderId, documentType, acceptanceId, generatedBy }) {
  const order = await base44.asServiceRole.entities.Order.get(orderId);
  if (!order) throw new Error('Pedido não encontrado');

  let acceptance = null;
  if (acceptanceId) {
    try { acceptance = await base44.asServiceRole.entities.Acceptance.get(acceptanceId); } catch (e) { acceptance = null; }
  }
  if (!acceptance && documentType !== 'warranty') {
    const level = documentType === 'level1_acceptance' ? 1 : documentType === 'level2_delivery' ? 2 : 3;
    const res = await base44.asServiceRole.entities.Acceptance.filter(
      { order_id: orderId, level, status: 'realizado' },
      { sort: '-created_date', limit: 1 }
    );
    acceptance = (res.items && res.items[0]) || null;
  }

  const existingRes = await base44.asServiceRole.entities.GeneratedDocument.filter({ order_id: orderId, document_type: documentType });
  const existing = Array.isArray(existingRes) ? existingRes : (existingRes.items || []);
  const version = existing.length + 1;

  const bytes = await buildPdf(documentType, order, acceptance);
  const file_hash = await sha256BytesHex(bytes);
  const file_name = fileNameFor(order, documentType);

  const file = new File([bytes], file_name, { type: 'application/pdf' });
  const up = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });
  const file_uri = up && up.file_uri;

  const now = new Date().toISOString();
  const record = await base44.asServiceRole.entities.GeneratedDocument.create({
    order_id: orderId,
    acceptance_id: acceptance ? acceptance.id : null,
    document_type: documentType,
    document_title: TITLES[documentType] || documentType,
    file_uri,
    storage_path: file_uri,
    file_name,
    file_hash,
    file_size: bytes.length,
    generated_at: now,
    generated_by: generatedBy || 'sistema',
    version,
  });

  await logAudit(base44, {
    user_id: generatedBy || 'sistema',
    order_id: orderId,
    action: version > 1 ? 'DOCUMENT_REGENERATED' : 'DOCUMENT_GENERATED',
    entity: 'GeneratedDocument',
    entity_id: record.id,
    new_value: { document_type: documentType, version, file_hash, file_name },
  });

  return record;
}

export async function generateAcceptanceDocument(base44, { orderId, level, acceptanceId, generatedBy }) {
  const documentType = level === 1 ? 'level1_acceptance' : level === 2 ? 'level2_delivery' : level === 3 ? 'level3_installation' : null;
  if (!documentType) throw new Error('Nível inválido');
  return generateDocument(base44, { orderId, documentType, acceptanceId, generatedBy });
}

export async function generateWarrantyDocument(base44, { orderId, acceptanceId, generatedBy }) {
  return generateDocument(base44, { orderId, documentType: 'warranty', acceptanceId, generatedBy });
}
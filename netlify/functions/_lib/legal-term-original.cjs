'use strict';

// Transcricao estruturada do texto ORIGINAL fornecido pelo Grupo Drafer.
// Referencia de revisao: NAO representa clausulas juridicas ou tecnicamente homologadas.
// Nao reutilizar como aceite final sem aprovacao formal, versao e hash de texto.
const sections = [
  {
    heading: '1 - PRAZO DE GARANTIA',
    paragraphs: ['12 (doze) meses a partir da data de entrega, limitada exclusivamente a defeitos de fabricacao.'],
    lists: [
      { intro: 'A garantia NAO cobre danos causados por:', items: [
        'Transporte inadequado', 'Descarregamento incorreto',
        'Armazenamento inadequado', 'Instalacao fora das normas tecnicas',
        'Uso inadequado do produto', 'Ambientes agressivos ou corrosivos',
      ] },
    ],
  },
  {
    heading: '2 - LIMITACAO DA GARANTIA',
    paragraphs: [],
    lists: [
      { intro: 'A garantia cobre exclusivamente:', items: [
        'Defeitos comprovados de fabricacao', 'Falhas estruturais do material',
      ] },
      { intro: 'A garantia NAO cobre:', items: [
        'Arranhoes ou abrasoes', 'Amassamentos ou deformacoes mecanicas',
        'Danos por impacto', 'Oxidacao por ambiente agressivo',
        'Danos por cortes ou perfuracoes inadequadas', 'Danos por instalacao incorreta',
      ] },
    ],
  },
  {
    heading: '3 - RECEBIMENTO DO MATERIAL',
    paragraphs: [
      'No momento da entrega, o CLIENTE devera obrigatoriamente:',
    ],
    lists: [
      { intro: '', items: [
        'Conferir quantidades', 'Verificar dimensoes',
        'Verificar integridade das telhas', 'Verificar possiveis avarias ou deformacoes',
      ] },
    ],
    after: ['ATENCAO: Apos a confirmacao do recebimento, considera-se que o material foi recebido em perfeito estado.'],
  },
  {
    heading: '4 - DESCARREGAMENTO',
    paragraphs: ['O descarregamento e de responsabilidade exclusiva do CLIENTE. Devem ser observadas:'],
    lists: [
      { intro: '', items: [
        'Utilizar numero adequado de pessoas', 'Evitar arrastar as telhas',
        'Evitar torcao ou dobra das pecas', 'Evitar impacto ou queda',
        'Manter apoio uniforme durante a movimentacao',
      ] },
    ],
  },
  {
    heading: '5 - ARMAZENAGEM',
    paragraphs: ['O CLIENTE deve obrigatoriamente seguir:'],
    lists: [
      { intro: '', items: [
        'Armazenar em local coberto, seco e ventilado',
        'Manter as telhas fora do contato direto com o solo',
        'Utilizar pallets ou calcos estruturais',
        'Proteger contra chuva e umidade',
        'Evitar empilhamento excessivo',
        'Evitar contato com produtos quimicos',
      ] },
    ],
    after: ['Telhas pre-pintadas exigem atencao especial para evitar abrasao da pintura.'],
  },
  {
    heading: '6 - MANUSEIO',
    paragraphs: [],
    lists: [
      { intro: '', items: [
        'Nao arrastar as telhas', 'Nao apoiar peso concentrado sobre o material',
        'Nao utilizar ferramentas que possam danificar o revestimento',
        'Evitar contato com superficies abrasivas',
      ] },
    ],
  },
  {
    heading: '7 - INSTALACAO (NORMAS TECNICAS OBRIGATORIAS)',
    paragraphs: [
      'A instalacao deve ser executada por profissional qualificado, respeitando boas praticas de engenharia.',
    ],
    subsections: [
      { title: '7.1 Inclinacao minima', text: 'Respeitar a inclinacao minima recomendada conforme tipo de telha, comprimento da agua e sobreposicao.' },
      { title: '7.2 Fixacao', text: 'Usar parafusos autobrocantes apropriados com arruelas metalicas e de vedacao em EPDM, na regiao estrutural da onda.' },
      { title: '7.3 Espacamento de tercas', text: 'Respeitar o vao maximo recomendado considerando espessura, carga de vento, manutencao e peso proprio.' },
      { title: '7.4 Circulacao sobre o telhado', text: 'E PROIBIDO caminhar diretamente sobre as telhas sem o uso de tabuas. As tabuas devem apoiar sobre no minimo duas tercas para distribuir o peso.' },
      { title: '7.5 Calcos', text: 'Utilizar calcos estruturais para nivelamento e alinhamento quando necessario.' },
      { title: '7.6 Corte das telhas', text: 'Usar tesoura eletrica para chapas, serra tico-tico ou guilhotina. ATENCAO: NAO usar esmerilhadeira com disco abrasivo - causa oxidacao.' },
      { title: '7.7 Vedacao', text: 'Usar fitas vedantes ou selantes especificos para cobertura metalica nas sobreposicoes.' },
      { title: '7.8 Telhas termoacusticas', bullets: [
        'Evitar armazenamento prolongado sem ventilacao',
        'Evitar contato com produtos quimicos',
        'Respeitar espacamento estrutural recomendado',
        'Evitar cargas concentradas sobre os paineis',
      ] },
    ],
  },
  {
    heading: '8 - AMBIENTES AGRESSIVOS',
    paragraphs: [
      'Em regioes litoraneas, industriais ou com presenca de produtos quimicos, o desempenho do material pode ser reduzido. A garantia podera nao ser aplicavel.',
    ],
  },
  {
    heading: '9 - RESPONSABILIDADE DO CLIENTE',
    paragraphs: [
      'Apos a entrega, sao de responsabilidade exclusiva do CLIENTE: transporte interno, descarregamento, armazenamento, manuseio e instalacao.',
    ],
  },
  {
    heading: '10 - ASSISTENCIA TECNICA',
    paragraphs: [
      'Para possivel defeito de fabricacao, o CLIENTE devera: comunicar formalmente o GRUPO DRAFER e permitir vistoria tecnica.',
    ],
  },
  {
    heading: '11 - PERDA AUTOMATICA DA GARANTIA',
    paragraphs: [
      'O nao cumprimento de qualquer recomendacao implica automaticamente na PERDA TOTAL DA GARANTIA.',
    ],
    lists: [
      { intro: 'Casos de anulacao automatica:', items: [
        'Instalacao inadequada', 'Armazenamento incorreto', 'Descarregamento inadequado',
        'Modificacao do produto', 'Cortes ou perfuracoes inadequadas',
        'Uso fora das recomendacoes tecnicas', 'Danos causados por terceiros',
      ] },
    ],
  },
];

const diagrams = [
  {
    title: '1 - LOCAL CORRETO DE FIXACAO',
    lines: [
      'TELHA METALICA (perfil)',
      '    /\\      /\\      /\\      /\\',
      '   /  \\    /  \\    /  \\    /  \\',
      '    ^',
      '    LOCAL CORRETO DE FIXACAO',
      '    (parafuso com arruela EPDM)',
      '----------------------------------------',
      '                 TERCA',
    ],
  },
  {
    title: '2 - USO OBRIGATORIO DE TABUAS',
    lines: [
      '=======================  TABUA PARA PISAR',
      'TELHA METALICA',
      '/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\',
      '----------------------------------------',
      '                 TERCA',
      'X NAO PISAR DIRETO NA TELHA',
      'OK UTILIZAR TABUA',
    ],
  },
  {
    title: '3 - ARMAZENAGEM CORRETA',
    lines: [
      '############################ COBERTURA / PROTECAO',
      '=======================      TELHAS EMPILHADAS',
      '=======================',
      '=======================',
      '-----------------------      CALCOS / PALLETS',
      '_____________________________________________ SOLO',
    ],
  },
];

const legalWarnings = [
  'Este material sera fabricado sob medida conforme especificacao acima.',
  'Apos a fabricacao nao sera possivel cancelamento, devolucao ou alteracao do pedido.',
  'A responsabilidade sobre o produto passa completamente ao cliente apos a entrega.',
  'O cliente assume total responsabilidade por transporte, armazenagem e instalacao.',
  'A garantia do produto sera bloqueada ate a conclusao de todos os aceites.',
  'Esta assinatura digital e uma prova juridica legalmente valida.',
];

const consent = 'Li, entendi e concordo com todos os termos acima. Autorizo a fabricacao e assumo total responsabilidade sobre o produto.';

const reviewFlags = [
  'Revisar validade e alcance da garantia de 12 meses e defeitos de fabricacao.',
  'Revisar exclusoes e perda automatica/total da garantia; preservar direitos legais.',
  'Revisar presuncao de recebimento em perfeito estado apos assinatura da entrega.',
  'Revisar responsabilidade exclusiva do cliente por transporte e descarregamento.',
  'Revisar proibicao absoluta de cancelamento/devolucao em material sob medida.',
  'Revisar suposto bloqueio de garantia ate conclusao de todos os aceites.',
  'Revisar afirmacao de validade juridica automatica de assinatura digital.',
  'Validar tecnicamente os diagramas e orientacoes conforme cada perfil de telha.',
];

module.exports = { sections, diagrams, legalWarnings, consent, reviewFlags };

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const Section = ({ number, title, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden mb-2">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-left"
        onClick={() => setOpen(v => !v)}
      >
        <span className="font-bold text-slate-800 text-sm">{number} – {title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
      </button>
      {open && <div className="px-4 py-3 text-sm text-slate-700 space-y-2 bg-white">{children}</div>}
    </div>
  );
};

const DiagramBox = ({ title, children }) => (
  <div className="rounded-lg overflow-hidden border border-slate-300 mb-4">
    <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-white" style={{ backgroundColor: '#1a1a1a' }}>{title}</div>
    <pre className="bg-slate-900 text-green-400 text-xs p-4 overflow-x-auto font-mono leading-relaxed whitespace-pre">{children}</pre>
  </div>
);

export default function TermoGarantia() {
  const [showDiagrams, setShowDiagrams] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-lg p-4 text-center" style={{ backgroundColor: '#1a1a1a' }}>
        <p className="text-white font-bold text-sm">TERMO DE GARANTIA, ARMAZENAGEM, MANUSEIO E INSTALAÇÃO DE TELHAS</p>
        <p className="text-gray-400 text-xs mt-1">GRUPO DRAFER</p>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">
        Este termo estabelece as condições de garantia, responsabilidade, armazenamento, manuseio, transporte e instalação das telhas fornecidas pelo <strong>GRUPO DRAFER</strong>. Aplica-se a: Telhas Galvalume, Telhas de Aço Natural, Telhas Pré-Pintadas e Telhas Termoacústicas.
      </p>

      <Section number="1" title="PRAZO DE GARANTIA">
        <p><strong>12 (doze) meses</strong> a partir da data de entrega, limitada exclusivamente a defeitos de fabricação.</p>
        <p className="font-semibold mt-2">A garantia NÃO cobre danos causados por:</p>
        <ul className="list-disc ml-4 space-y-1">
          <li>Transporte inadequado</li>
          <li>Descarregamento incorreto</li>
          <li>Armazenamento inadequado</li>
          <li>Instalação fora das normas técnicas</li>
          <li>Uso inadequado do produto</li>
          <li>Ambientes agressivos ou corrosivos</li>
        </ul>
      </Section>

      <Section number="2" title="LIMITAÇÃO DA GARANTIA">
        <p className="font-semibold">A garantia cobre exclusivamente:</p>
        <ul className="list-disc ml-4 space-y-1">
          <li>Defeitos comprovados de fabricação</li>
          <li>Falhas estruturais do material</li>
        </ul>
        <p className="font-semibold mt-2">A garantia NÃO cobre:</p>
        <ul className="list-disc ml-4 space-y-1">
          <li>Arranhões ou abrasões</li>
          <li>Amassamentos ou deformações mecânicas</li>
          <li>Danos por impacto</li>
          <li>Oxidação por ambiente agressivo</li>
          <li>Danos por cortes ou perfurações inadequadas</li>
          <li>Danos por instalação incorreta</li>
        </ul>
      </Section>

      <Section number="3" title="RECEBIMENTO DO MATERIAL">
        <p>No momento da entrega, o CLIENTE deverá obrigatoriamente:</p>
        <ul className="list-disc ml-4 space-y-1">
          <li>Conferir quantidades</li>
          <li>Verificar dimensões</li>
          <li>Verificar integridade das telhas</li>
          <li>Verificar possíveis avarias ou deformações</li>
        </ul>
        <p className="mt-2 font-semibold text-orange-800">⚠️ Após a confirmação do recebimento, considera-se que o material foi recebido em perfeito estado.</p>
      </Section>

      <Section number="4" title="DESCARREGAMENTO">
        <p>O descarregamento é de responsabilidade exclusiva do CLIENTE. Devem ser observadas:</p>
        <ul className="list-disc ml-4 space-y-1">
          <li>Utilizar número adequado de pessoas</li>
          <li>Evitar arrastar as telhas</li>
          <li>Evitar torção ou dobra das peças</li>
          <li>Evitar impacto ou queda</li>
          <li>Manter apoio uniforme durante a movimentação</li>
        </ul>
      </Section>

      <Section number="5" title="ARMAZENAGEM">
        <p>O CLIENTE deve obrigatoriamente seguir:</p>
        <ul className="list-disc ml-4 space-y-1">
          <li>Armazenar em local coberto, seco e ventilado</li>
          <li>Manter as telhas fora do contato direto com o solo</li>
          <li>Utilizar pallets ou calços estruturais</li>
          <li>Proteger contra chuva e umidade</li>
          <li>Evitar empilhamento excessivo</li>
          <li>Evitar contato com produtos químicos</li>
        </ul>
        <p className="mt-2 italic text-slate-500">Telhas pré-pintadas exigem atenção especial para evitar abrasão da pintura.</p>
      </Section>

      <Section number="6" title="MANUSEIO">
        <ul className="list-disc ml-4 space-y-1">
          <li>Não arrastar as telhas</li>
          <li>Não apoiar peso concentrado sobre o material</li>
          <li>Não utilizar ferramentas que possam danificar o revestimento</li>
          <li>Evitar contato com superfícies abrasivas</li>
        </ul>
      </Section>

      <Section number="7" title="INSTALAÇÃO (NORMAS TÉCNICAS OBRIGATÓRIAS)">
        <p>A instalação deve ser executada por <strong>profissional qualificado</strong>, respeitando boas práticas de engenharia.</p>
        <div className="space-y-3 mt-2">
          <div>
            <p className="font-bold">7.1 Inclinação mínima</p>
            <p>Respeitar a inclinação mínima recomendada conforme tipo de telha, comprimento da água e sobreposição.</p>
          </div>
          <div>
            <p className="font-bold">7.2 Fixação</p>
            <p>Usar parafusos autobrocantes apropriados com arruelas metálicas e de vedação em EPDM, na região estrutural da onda.</p>
          </div>
          <div>
            <p className="font-bold">7.3 Espaçamento de terças</p>
            <p>Respeitar o vão máximo recomendado considerando espessura, carga de vento, manutenção e peso próprio.</p>
          </div>
          <div>
            <p className="font-bold text-red-700">7.4 Circulação sobre o telhado</p>
            <p className="text-red-700 font-semibold">É PROIBIDO caminhar diretamente sobre as telhas sem o uso de tábuas.</p>
            <p>As tábuas devem apoiar sobre no mínimo duas terças para distribuir o peso.</p>
          </div>
          <div>
            <p className="font-bold">7.5 Calços</p>
            <p>Utilizar calços estruturais para nivelamento e alinhamento quando necessário.</p>
          </div>
          <div>
            <p className="font-bold">7.6 Corte das telhas</p>
            <p>Usar tesoura elétrica para chapas, serra tico-tico ou guilhotina.</p>
            <p className="text-red-700 font-semibold">⚠️ NÃO usar esmerilhadeira com disco abrasivo — causa oxidação.</p>
          </div>
          <div>
            <p className="font-bold">7.7 Vedação</p>
            <p>Usar fitas vedantes ou selantes específicos para cobertura metálica nas sobreposições.</p>
          </div>
          <div>
            <p className="font-bold">7.8 Telhas termoacústicas</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Evitar armazenamento prolongado sem ventilação</li>
              <li>Evitar contato com produtos químicos</li>
              <li>Respeitar espaçamento estrutural recomendado</li>
              <li>Evitar cargas concentradas sobre os painéis</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section number="8" title="AMBIENTES AGRESSIVOS">
        <p>Em regiões litorâneas, industriais ou com presença de produtos químicos, o desempenho do material pode ser reduzido. A garantia poderá não ser aplicável.</p>
      </Section>

      <Section number="9" title="RESPONSABILIDADE DO CLIENTE">
        <p>Após a entrega, são de responsabilidade exclusiva do CLIENTE: transporte interno, descarregamento, armazenamento, manuseio e instalação.</p>
      </Section>

      <Section number="10" title="ASSISTÊNCIA TÉCNICA">
        <p>Para possível defeito de fabricação, o CLIENTE deverá: comunicar formalmente o GRUPO DRAFER e permitir vistoria técnica.</p>
      </Section>

      <Section number="11" title="PERDA AUTOMÁTICA DA GARANTIA">
        <p className="font-bold text-red-700">O não cumprimento de qualquer recomendação implica automaticamente na PERDA TOTAL DA GARANTIA.</p>
        <p className="mt-2">Casos de anulação automática:</p>
        <ul className="list-disc ml-4 space-y-1 text-red-800">
          <li>Instalação inadequada</li>
          <li>Armazenamento incorreto</li>
          <li>Descarregamento inadequado</li>
          <li>Modificação do produto</li>
          <li>Cortes ou perfurações inadequadas</li>
          <li>Uso fora das recomendações técnicas</li>
          <li>Danos causados por terceiros</li>
        </ul>
      </Section>

      {/* Diagramas Técnicos */}
      <div className="mt-4">
        <button
          onClick={() => setShowDiagrams(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-lg font-bold text-white text-sm"
          style={{ backgroundColor: '#cc0000' }}
        >
          <span>📐 DIAGRAMAS TÉCNICOS DE INSTALAÇÃO</span>
          {showDiagrams ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
        </button>

        {showDiagrams && (
          <div className="mt-3 space-y-3">
            <DiagramBox title="1 – LOCAL CORRETO DE FIXAÇÃO">
{`  TELHA METÁLICA (perfil)

    /\\      /\\      /\\      /\\
   /  \\    /  \\    /  \\    /  \\

    ↑
    LOCAL CORRETO DE FIXAÇÃO
    (parafuso com arruela EPDM)

  ──────────────────────────────
              TERÇA`}
            </DiagramBox>

            <DiagramBox title="2 – USO OBRIGATÓRIO DE TÁBUAS">
{`  ══════════════════════  ← TÁBUA PARA PISAR

  TELHA METÁLICA
  /\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\

  ──────────────────────────────
              TERÇA

  ✗ NÃO PISAR DIRETO NA TELHA
  ✓ UTILIZAR TÁBUA`}
            </DiagramBox>

            <DiagramBox title="3 – ARMAZENAGEM CORRETA">
{`  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ← COBERTURA / PROTEÇÃO

  ══════════════════════      ← TELHAS EMPILHADAS
  ══════════════════════
  ══════════════════════

  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  ← CALÇOS / PALLETS

  ──────────────────────────────
              SOLO`}
            </DiagramBox>
          </div>
        )}
      </div>
    </div>
  );
}
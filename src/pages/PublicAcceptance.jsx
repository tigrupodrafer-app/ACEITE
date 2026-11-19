import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, FileText, Loader2 } from 'lucide-react';

const LEGAL_SECTIONS = [["Objeto e conferência do pedido","O cliente deve conferir a identificação das partes, os produtos, especificações, medidas, quantidades, valores, pagamento e entrega no espelho integral do pedido. Divergências devem ser corrigidas antes do aceite. Alterações essenciais posteriores exigem nova concordância."],["Autorização de fabricação e fornecimento","O aceite de produtos sob encomenda autoriza sua preparação e fabricação conforme o pedido. Alterações e cancelamentos serão analisados segundo o estágio produtivo, o reaproveitamento possível e a legislação, preservados os direitos legais."],["Prazos e condições de entrega","A previsão é a indicada no pedido, ressalvados ajustes comunicados. O endereço deve ser conferido antes da expedição. Frete, transporte e descarregamento seguem as condições comerciais contratadas."],["Recebimento e conferência dos materiais","Recomenda-se conferir quantidades, dimensões, embalagens e avarias aparentes, registrando divergências e comunicando a empresa. O comprovante de entrega não representa renúncia a direitos por vícios ocultos ou defeitos de fabricação."],["Garantia dos produtos","São preservadas as garantias legais. Eventual garantia contratual de 12 meses dependerá de documentação específica que defina cobertura, prazo e condições. Exclusões contratuais exigem relação causal com o dano e não afastam direitos legais."],["Descarregamento, armazenamento e manuseio","Observar as responsabilidades contratadas e utilizar equipamentos e apoios adequados. Evitar impactos, arrasto, umidade e contato direto com o solo, seguindo instruções específicas para materiais pré-pintados e termoacústicos."],["Instalação e utilização dos produtos","Instalações devem seguir projeto, normas, instruções do fabricante e profissionais qualificados. Observar inclinação, fixação, espaçamento, circulação segura, ferramentas de corte adequadas e vedação compatível. Estas orientações não substituem responsabilidade técnica."],["Ambientes agressivos e condições especiais","Salinidade, agentes químicos e poluição podem reduzir a durabilidade. Limitações contratuais devem ser informadas e justificadas tecnicamente, preservados os direitos legais."],["Assistência técnica e solicitações de garantia","O cliente poderá comunicar defeitos pelos canais oficiais, fornecendo pedido, identificação do produto e registros da ocorrência. A análise técnica e solução observarão a legislação e a garantia aplicável."],["Responsabilidades das partes","A fornecedora responde pelo fornecimento conforme contratado. O cliente fornece informações corretas e observa orientações pertinentes. Não há transferência irrestrita de responsabilidade ou exclusão de direitos legais."],["Aceite eletrônico e registro das evidências","O aceite eletrônico pressupõe acesso ao espelho integral e ao termo. Após homologação, o sistema registrará versões, data, hora, manifestação de vontade, integridade criptográfica e evidências técnicas, conforme legislação e políticas de segurança."],["Proteção de dados pessoais","Os dados necessários à contratação e ao aceite serão tratados para execução do pedido, obrigações legais e proteção de direitos, observada a LGPD e medidas de segurança. Informações adicionais deverão estar disponíveis nos canais de privacidade."],["Disposições finais","O espelho, o termo e documentos vinculados integram a operação. Divergências devem ser corrigidas e formalizadas. Não há renúncia antecipada de direitos. Aplica-se a legislação brasileira pertinente."]];

// Independent public read-only page. Signing is intentionally disabled
// until the transactional signature endpoint and legal-document hashing exist.
export default function PublicAcceptance() {
  const [result, setResult] = useState({ loading: true, order: null, error: '' });
  const [expanded, setExpanded] = useState([]);
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setResult({ loading: false, order: null, error: 'Link inválido ou expirado.' });
      return;
    }
    const controller = new AbortController();
    fetch('/.netlify/functions/public-order?token=' + encodeURIComponent(token), {
      cache: 'no-store', signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error('Link inválido, expirado ou ainda indisponível.');
      const data = await response.json();
      setResult({ loading: false, order: data.order, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ loading: false, order: null, error: error.message });
    });
    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <section className="max-w-4xl mx-auto bg-white border shadow-lg rounded-xl p-8">
        <header className="flex gap-3 items-center mb-6">
          <FileText className="text-red-700 w-8 h-8" />
          <div><h1 className="font-bold text-xl">ACEITE DRAFER</h1>
            <p className="text-sm text-slate-500">Confirmação de pedido</p></div>
        </header>
        {result.loading && <p className="flex gap-2 items-center"><Loader2 className="animate-spin" /> Consultando...</p>}
        {result.error && <p role="alert" className="text-red-700">{result.error}</p>}
        {result.order && (
          <div className="space-y-3">
            <p><strong>Pedido:</strong> {result.order.order_number}</p>
            <p><strong>Cliente:</strong> {result.order.client_name}</p>
            <p><strong>Material:</strong> {result.order.material || 'Não informado'}</p>
            <p><strong>Modelo:</strong> {result.order.tile_model || 'Não informado'}</p>
            <p><strong>Quantidade:</strong> {result.order.quantity ?? 'Não informada'}</p>
          </div>
        )}

        <section className="mt-6 border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold text-lg">Espelho completo do pedido SIC</h2>
          <p className="text-sm text-amber-800">A API pública ainda não disponibiliza o espelho integral. Campos pendentes não serão presumidos; assinatura bloqueada.</p>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">{['Razão social e CNPJ da empresa','CPF/CNPJ do cliente','Comprador','Tipo de venda','Endereço de entrega','Condição de pagamento e vencimentos','Código comercial dos itens','Valores unitários e totais'].map(field=><p key={field}><strong>{field}:</strong> Pendente de integração SIC</p>)}</div>
        </section>
        <section className="mt-6 space-y-3">
          <div className="flex items-center justify-between"><h2 className="font-semibold text-lg">Termo jurídico — 13 tópicos</h2><button type="button" className="border rounded px-3 py-2 text-sm" onClick={()=>setExpanded(expanded.length===13?[]:Array.from({length:13},(_,i)=>i))}>{expanded.length===13?'Recolher todos':'Expandir todos'}</button></div>
          {LEGAL_SECTIONS.map((section,i)=><div key={i} className="border rounded-lg">
            <button type="button" className="w-full flex justify-between items-center text-left p-3 font-medium" aria-expanded={expanded.includes(i)} onClick={()=>setExpanded(v=>v.includes(i)?v.filter(x=>x!==i):[...v,i])}><span>{i+1}. {section[0]}</span>{expanded.includes(i)?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</button>
            {expanded.includes(i)&&<p className="border-t p-3 text-sm text-slate-700">{section[1]}</p>}
          </div>)}
        </section>
        <section className="mt-6 border-t pt-4 space-y-3">
          <h2 className="font-semibold text-lg">Declaração de conferência e aceite</h2>
          <p className="text-sm">Declaro que conferi o espelho integral do pedido, conheço as condições de fornecimento e garantia e, quando aplicável, autorizo a fabricação dos produtos personalizados, preservados meus direitos legais.</p>
          {['Li e conferi o espelho integral do pedido.','Li e concordo com as condições comerciais e o termo.','Autorizo a fabricação dos produtos personalizados, quando aplicável.'].map(t=><label key={t} className="flex gap-2 text-sm"><input type="checkbox" disabled/>{t}</label>)}
          <button type="button" disabled className="w-full rounded bg-slate-200 text-slate-500 p-3">Confirmar aceite e assinar — aguardando homologação</button>
        </section>
        <div className="bg-amber-50 border border-amber-200 p-4 mt-6 rounded flex gap-3 text-amber-900">
          <AlertTriangle className="shrink-0 w-6 h-6" />
          <p>Ambiente de migração: a assinatura permanece desabilitada até a homologação jurídica, de segurança e do registro de evidências.</p>
        </div>
      </section>
    </main>
  );
}

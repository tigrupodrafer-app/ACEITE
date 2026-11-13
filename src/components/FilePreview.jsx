import React, { useState } from 'react';
import { FileText, ExternalLink } from 'lucide-react';

// Só exibe endereços http(s). Um valor como javascript: ou data: nunca é
// renderizado, e o conteúdo em moldura roda isolado para não poder interagir
// com a página de aceite em que está embutido.
function safeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url, window.location.origin);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href;
  } catch (e) {
    return null;
  }
}

function isPdf(url) {
  if (!url) return false;
  const path = url.split('?')[0].toLowerCase();
  return path.endsWith('.pdf');
}

export default function FilePreview({ url, alt, height = 320 }) {
  const [failed, setFailed] = useState(false);

  const src = safeUrl(url);
  if (!src) return null;

  if (isPdf(src)) {
    return (
      <div>
        <iframe
          src={src}
          title={alt}
          className="w-full border-0 bg-slate-100"
          style={{ height }}
          sandbox=""
          referrerPolicy="no-referrer"
        />
        <a
          href={src}
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center justify-center gap-1 py-1.5 text-xs text-blue-600 hover:underline bg-slate-50 border-t border-slate-200"
        >
          <ExternalLink className="w-3 h-3" /> Abrir PDF em nova aba
        </a>
      </div>
    );
  }

  return (
    <div>
      {failed ? (
        <div className="flex flex-col items-center justify-center gap-1 py-8 bg-slate-50">
          <FileText className="w-6 h-6 text-slate-400" />
          <a href={src} target="_blank" rel="noreferrer noopener" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> Abrir documento
          </a>
        </div>
      ) : (
        <img src={src} alt={alt} className="w-full object-contain" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      )}
    </div>
  );
}
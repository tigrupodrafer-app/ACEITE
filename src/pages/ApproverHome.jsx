import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { ShieldCheck, LockKeyhole, LogOut } from 'lucide-react';

export default function ApproverHome() {
  const {user,logout}=useAuth();
  return <main className="min-h-screen bg-slate-100 px-4 py-12">
    <section className="max-w-xl mx-auto bg-white rounded-xl border shadow p-8 space-y-5">
      <div className="flex gap-3 items-center">
        <ShieldCheck className="h-8 w-8 text-red-700"/>
        <div>
          <h1 className="font-bold text-xl text-slate-900">ACEITE DRAFER</h1>
          <p className="text-sm text-slate-600">Área de aprovação formal</p>
        </div>
      </div>
      <p className="text-sm text-slate-700">Conta institucional identificada: <strong>{user?.email || '—'}</strong></p>
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-md text-amber-950 text-sm flex gap-2">
        <LockKeyhole className="h-5 w-5 shrink-0"/>
        <p>Seu perfil de aprovador foi cadastrado com acesso limitado. A designação formal por empresa e a liberação de documentos para análise ainda dependem de confirmação administrativa. Nenhum termo pode ser assinado ou enviado ao cliente neste momento.</p>
      </div>
      <p className="text-xs text-slate-600">
        O perfil de aprovador não concede acesso ao Dashboard comercial, às consultas SIC ou aos dados de outras empresas.
      </p>
      <button type="button" onClick={()=>void logout()} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded flex gap-2 items-center">
        <LogOut className="h-4 w-4"/> Sair
      </button>
    </section>
  </main>;
}

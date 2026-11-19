import React from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function UserNotRegisteredError() {
  const { logout } = useAuth();
  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <section className="max-w-md w-full bg-white border rounded-xl shadow-md p-8 text-center space-y-4">
      <ShieldAlert className="h-12 w-12 text-amber-600 mx-auto"/>
      <h1 className="text-2xl font-bold text-slate-900">Acesso ainda não autorizado</h1>
      <p className="text-slate-700">
        A identidade foi reconhecida pelo Supabase, mas ainda não consta uma autorização ativa
        para usar o ACEITE DRAFER.
      </p>
      <p className="text-sm text-slate-600">
        Solicite ao administrador a ativação da conta ou entre novamente com o e-mail correto.
        Não é necessário cadastrar outra conta no Supabase Auth.
      </p>
      <button onClick={()=>void logout()} type="button"
        className="bg-slate-900 hover:bg-slate-800 text-white rounded px-4 py-2 font-semibold inline-flex items-center gap-2">
        <LogOut className="h-4 w-4"/> Sair e trocar de conta
      </button>
    </section>
  </main>;
}

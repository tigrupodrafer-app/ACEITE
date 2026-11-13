import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

export default function Login() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();

  if (!isLoadingAuth && isAuthenticated) {
    return <Navigate to={location.state?.from || '/'} replace />;
  }

  const handleGoogle = async () => {
    if (!supabase) return;
    setError('');
    setWorking(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: new URL('/', window.location.origin).toString() },
      });
      if (authError) throw authError;
    } catch (err) {
      setError(err.message || 'Não foi possível iniciar o login.');
      setWorking(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <section className="bg-white rounded-2xl shadow-xl border max-w-md w-full p-8">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="text-red-700 h-10 w-10" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">DRAFER ACEITE</h1>
            <p className="text-sm text-slate-500">Acesso administrativo seguro</p>
          </div>
        </div>
        <p className="text-slate-600 text-sm mb-6">
          Entre com uma conta Google autorizada pela equipe responsável pelo sistema.
        </p>
        {!supabase && (
          <p role="alert" className="text-red-700 bg-red-50 p-3 rounded mb-4">
            Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no Netlify.
          </p>
        )}
        {error && <p role="alert" className="text-red-700 bg-red-50 p-3 rounded mb-4">{error}</p>}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={!supabase || working || isLoadingAuth}
          className="w-full bg-slate-900 disabled:opacity-50 hover:bg-slate-700 text-white py-3 rounded-lg font-semibold flex justify-center gap-3 items-center"
        >
          {working ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          Entrar com Google
        </button>
        <p className="text-xs text-slate-500 mt-6">
          O login não concede acesso automaticamente. Usuários devem ser autorizados no DRAFER ACEITE.
        </p>
      </section>
    </main>
  );
}

import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Loader2, MailCheck, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

// A interface exibe somente os enderecos institucionais aprovados para a fase piloto.
// A seguranca efetiva permanece em auth.users + aceite_members + backend requireStaff.
const PILOT_EMAILS = new Set([
  'heitor.lopes@grupodrafer.com',
  'diretoria@grupodrafer.com',
]);
const normalizeEmail = value => String(value || '').trim().toLowerCase();

export default function Login() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [working, setWorking] = useState(false);
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const location = useLocation();

  if (!isLoadingAuth && isAuthenticated) {
    return <Navigate to={location.state?.from || '/Dashboard'} replace />;
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
    } catch {
      setError('Não foi possível iniciar o acesso Google. Tente novamente.');
      setWorking(false);
    }
  };

  const handleSendCode = async event => {
    event.preventDefault();
    if (!supabase || working) return;
    setError('');
    setSuccess('');
    const cleanEmail = normalizeEmail(email);
    if (!PILOT_EMAILS.has(cleanEmail)) {
      setError('O acesso institucional está em implantação e limitado às contas designadas.');
      return;
    }
    setWorking(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { shouldCreateUser: false },
      });
      if (otpError) throw otpError;
      setSentTo(cleanEmail);
      setCode('');
      setSuccess('Solicitação enviada. Confira sua caixa de entrada e a pasta de spam.');
    } catch {
      setError('Não foi possível enviar o código. Confirme se a conta foi cadastrada e se o envio de e-mail está configurado.');
    } finally {
      setWorking(false);
    }
  };

  const handleVerifyCode = async event => {
    event.preventDefault();
    if (!supabase || working || !sentTo) return;
    setError('');
    setSuccess('');
    if (!/^\d{6,8}$/.test(code.trim())) {
      setError('Informe o código numérico recebido por e-mail.');
      return;
    }
    setWorking(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: sentTo, token: code.trim(), type: 'email',
      });
      if (verifyError) throw verifyError;
      if (!data?.session?.access_token) {
        throw new Error('Sessão não estabelecida após validar o código.');
      }

      // OTPs são de uso único. Não tente verificá-lo novamente:
      // redirecione usando a sessão já persistida pelo SDK, em vez
      // de depender de uma atualização assíncrona de contexto React.
      window.location.replace('/Dashboard');
      return;
    } catch (err) {
      setError(err?.message === 'Sessão não estabelecida após validar o código.'
        ? 'Código aceito, mas não foi possível iniciar a sessão. Solicite outro código.'
        : 'Código inválido ou expirado. Solicite um novo código e tente novamente uma única vez.');
      setCode('');
    } finally {
      setWorking(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8">
      <section className="bg-white rounded-2xl shadow-xl border max-w-md w-full p-8">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="text-red-700 h-10 w-10" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">ACEITE DRAFER</h1>
            <p className="text-sm text-slate-500">Acesso administrativo seguro</p>
          </div>
        </div>
        {!supabase && (
          <p role="alert" className="text-red-700 bg-red-50 p-3 rounded mb-4">
            Supabase não configurado. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no Netlify.
          </p>
        )}
        {error && <p role="alert" className="text-red-700 bg-red-50 p-3 rounded mb-4">{error}</p>}
        {success && <p role="status" className="text-emerald-800 bg-emerald-50 p-3 rounded mb-4">{success}</p>}

        <div className="space-y-4">
          <section className="border border-slate-200 rounded-lg p-4 space-y-3">
            <h2 className="font-semibold text-slate-900">E-mail institucional</h2>
            <p className="text-xs text-slate-600">
              Acesso piloto para os responsáveis designados. Não é necessário vincular uma conta Google.
            </p>
            {!sentTo ? (
              <form onSubmit={handleSendCode} className="space-y-3">
                <label className="block text-sm font-medium">
                  E-mail institucional
                  <input type="email" autoComplete="email" required maxLength={254}
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="nome@grupodrafer.com"
                    className="mt-1 w-full rounded border border-slate-300 p-2.5" />
                </label>
                <button type="submit" disabled={!supabase || working || isLoadingAuth}
                  className="w-full bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-lg py-2.5 font-semibold flex items-center justify-center gap-2">
                  {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailCheck className="w-4 h-4" />}
                  Enviar código de acesso
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-3">
                <p className="text-xs text-slate-700">Código enviado para <strong>{sentTo}</strong></p>
                <label className="block text-sm font-medium">
                  Código recebido
                  <input type="text" inputMode="numeric" autoComplete="one-time-code"
                    pattern="[0-9]{6,8}" required maxLength={8} value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    className="mt-1 w-full rounded border border-slate-300 p-2.5 tracking-widest text-lg" />
                </label>
                <button type="submit" disabled={!supabase || working || isLoadingAuth}
                  className="w-full bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-lg py-2.5 font-semibold flex items-center justify-center gap-2">
                  {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Validar código
                </button>
                <button type="button" disabled={working} onClick={() => {
                  setSentTo(''); setCode(''); setSuccess(''); setError('');
                }} className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
                  <ArrowLeft className="w-4 h-4" /> Alterar e-mail ou solicitar novo código
                </button>
              </form>
            )}
            <p className="text-xs text-slate-500">
              Se receber um link em vez de um código, é necessário ajustar o modelo de e-mail OTP no Supabase.
            </p>
          </section>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px bg-slate-200 flex-1" />
            <span>ou</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>
          <button type="button" onClick={handleGoogle}
            disabled={!supabase || working || isLoadingAuth}
            className="w-full bg-slate-900 disabled:opacity-50 hover:bg-slate-700 text-white py-3 rounded-lg font-semibold flex justify-center gap-3 items-center">
            {working ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Entrar com Google
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-6">
          Apenas contas previamente cadastradas e autorizadas podem acessar o ACEITE DRAFER.
          Validar um e-mail não concede automaticamente permissão para aprovar documentos.
        </p>
      </section>
    </main>
  );
}

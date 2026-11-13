import { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function AuthTest() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginResult, setLoginResult] = useState(null);
  const [loginError, setLoginError] = useState(null);
  const [meResult, setMeResult] = useState(null);
  const [meError, setMeError] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const tokenExists = typeof window !== "undefined" && !!window.localStorage.getItem("base44_access_token");

  const handleLogin = useCallback(async () => {
    setLoading(true);
    setLoginResult(null);
    setLoginError(null);
    setMeResult(null);
    setMeError(null);

    try {
      const result = await base44.auth.loginViaEmailPassword(email, password);
      setLoginResult(result);
    } catch (err) {
      setLoginError(err?.message || String(err));
      setLoading(false);
      return;
    }

    try {
      const me = await base44.auth.me();
      setMeResult(me);
    } catch (err) {
      setMeError(err?.message || String(err));
    }

    setLoading(false);
  }, [email, password]);

  const handleGoogleLogin = useCallback(() => {
    setGoogleLoading(true);
    const fromUrl = window.location.href;
    base44.auth.loginWithProvider("google", fromUrl);
  }, []);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  const handleCheckMe = useCallback(async () => {
    setMeResult(null);
    setMeError(null);
    try {
      const me = await base44.auth.me();
      setMeResult(me);
    } catch (err) {
      setMeError(err?.message || String(err));
    }
  }, []);

  return (
    <div className="min-h-screen flex items-start justify-center bg-slate-50 py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Teste de Autenticação Base44</h1>
          <p className="text-sm text-slate-500 mt-1">
            Página temporária para validar login direto via SDK no frontend Bolt.
          </p>
        </div>

        <div className="space-y-4 bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="auth-test-email">E-mail</Label>
            <Input
              id="auth-test-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@exemplo.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-test-password">Senha</Label>
            <Input
              id="auth-test-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              autoComplete="current-password"
            />
          </div>
          <Button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full"
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-50 px-2 text-slate-400">ou</span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full"
        >
          {googleLoading ? "Redirecionando..." : "Entrar com Google"}
        </Button>

        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">Resultado do Login</h2>
            {loginResult ? (
              <div className="text-sm text-slate-600 space-y-1">
                <p>Status: <span className="font-medium text-green-600">Sucesso</span></p>
                {loginResult.user && (
                  <>
                    <p>Nome: {loginResult.user.name || loginResult.user.email || "—"}</p>
                    <p>E-mail: {loginResult.user.email || "—"}</p>
                    <p>ID: {loginResult.user._id || loginResult.user.id || "—"}</p>
                  </>
                )}
              </div>
            ) : loginError ? (
              <p className="text-sm text-red-600">{loginError}</p>
            ) : (
              <p className="text-sm text-slate-400">Aguardando login...</p>
            )}
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-700">base44.auth.me()</h2>
              <Button variant="outline" size="sm" onClick={handleCheckMe} disabled={loading}>
                Executar me()
              </Button>
            </div>
            {meResult ? (
              <div className="text-sm text-slate-600 space-y-1">
                <p>Status: <span className="font-medium text-green-600">Usuário reconhecido</span></p>
                <p>Nome: {meResult.name || meResult.email || "—"}</p>
                <p>E-mail: {meResult.email || "—"}</p>
                <p>ID: {meResult._id || meResult.id || "—"}</p>
              </div>
            ) : meError ? (
              <p className="text-sm text-red-600">{meError}</p>
            ) : (
              <p className="text-sm text-slate-400">Aguardando verificação...</p>
            )}
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">Token persistido (localStorage)</h2>
            <p className="text-sm">
              Token existe:{" "}
              <span className={`font-medium ${tokenExists ? "text-green-600" : "text-red-600"}`}>
                {tokenExists ? "SIM" : "NÃO"}
              </span>
            </p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">Testar persistência</h2>
            <p className="text-sm text-slate-500 mb-3">
              Clique no botão abaixo para recarregar a página. Após o reload, clique em "Executar me()" para verificar se o token foi mantido.
            </p>
            <Button variant="outline" onClick={handleReload} className="w-full">
              Recarregar página
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  const checkAppState = useCallback(async () => {
    setIsLoadingAuth(true);
    if (!supabase) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'configuration_required', message: 'Configuração do Supabase pendente.' });
      setIsLoadingAuth(false);
      return;
    }
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data?.session?.access_token) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required', message: 'Entre com sua conta Google.' });
        return;
      }

      const response = await fetch('/.netlify/functions/me', {
        headers: { Authorization: 'Bearer ' + data.session.access_token },
        cache: 'no-store',
      });
      if (!response.ok) {
        setUser(null);
        setIsAuthenticated(false);
        const type = response.status === 403 ? 'user_not_registered' : 'unknown';
        setAuthError({ type, message: type === 'user_not_registered'
          ? 'Sua conta ainda não foi autorizada.' : 'Falha ao confirmar o acesso com o servidor.' });
        return;
      }
      const member = await response.json();
      setUser(member);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'unknown', message: 'Não foi possível verificar a sessão.' });
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      void checkAppState();
      return;
    }
    void checkAppState();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (['SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
        // Defer work until after Supabase has completed the synchronous auth event.
        setTimeout(() => { void checkAppState(); }, 0);
      }
    });
    return () => subscription.unsubscribe();
  }, [checkAppState]);

  const logout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    setAuthError({ type: 'auth_required', message: 'Entre com sua conta Google.' });
  }, []);

  const navigateToLogin = () => {
    if (window.location.pathname !== '/Login') window.location.assign('/Login');
  };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings: false,
      authError, appPublicSettings: null,
      logout, navigateToLogin, checkAppState, checkUserAuth: checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth requires AuthProvider');
  return ctx;
}

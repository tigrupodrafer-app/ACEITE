import { Toaster } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Login from '@/pages/Login';
import PublicAcceptance from '@/pages/PublicAcceptance';
import Dashboard from '@/pages/Dashboard';
import Layout from '@/Layout';

// Only migrated pages are imported. Legacy Base44 modules do not enter the bundle.
// Remaining pages will be enabled one at a time after replacing backend calls.
function PrivatePage({ children }) {
  const { isLoadingAuth, isAuthenticated, authError } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Validando acesso...</div>;
  }
  if (authError?.type === 'user_not_registered') return <UserNotRegisteredError />;
  if (['configuration_required', 'unknown'].includes(authError?.type)) {
    return (
      <div role="alert" className="min-h-screen p-10 flex items-center justify-center">
        <div className="max-w-md p-6 bg-red-50 border border-red-200 rounded-lg text-red-900">
          {authError.message}
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/Login" state={{ from: location.pathname }} replace />;
  return <Layout currentPageName="Dashboard">{children}</Layout>;
}

function MigrationNotice() {
  return (
    <PrivatePage>
      <div className="max-w-xl mx-auto my-16 p-8 bg-amber-50 border border-amber-200 rounded-xl">
        <h1 className="font-bold text-xl text-amber-900">Módulo em migração</h1>
        <p className="mt-3 text-amber-900">
          Esta funcionalidade ainda depende de componentes da versão anterior e ficará indisponível até sua substituição segura.
        </p>
      </div>
    </PrivatePage>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/Login" element={<Login />} />
      <Route path="/AssinarAceite" element={<PublicAcceptance />} />
      <Route path="/" element={<PrivatePage><Dashboard /></PrivatePage>} />
      <Route path="/Dashboard" element={<PrivatePage><Dashboard /></PrivatePage>} />
      <Route path="*" element={<MigrationNotice />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <BrowserRouter><AppRoutes /></BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

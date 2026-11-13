import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { pagesConfig } from './pages.config';
import { BrowserRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Login from '@/pages/Login';
import PublicAcceptance from '@/pages/PublicAcceptance';

const { Pages, Layout, mainPage } = pagesConfig;
const MainPage = Pages[mainPage] || Object.values(Pages)[0];

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : children;

function ProtectedRoutes() {
  const { isLoadingAuth, isAuthenticated, authError } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Validando acesso...</div>;
  }
  if (authError?.type === 'user_not_registered') return <UserNotRegisteredError />;
  if (authError?.type === 'configuration_required' || authError?.type === 'unknown') {
    return (
      <div role="alert" className="min-h-screen p-10 flex items-center justify-center">
        <div className="max-w-md p-6 bg-red-50 border border-red-200 rounded-lg text-red-900">
          {authError.message}
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/Login" state={{ from: location.pathname }} replace />;

  return (
    <Routes>
      <Route path="/" element={<LayoutWrapper currentPageName={mainPage}><MainPage /></LayoutWrapper>} />
      {Object.entries(Pages)
        .filter(([name]) => !['AssinarAceite', 'AuthTest'].includes(name))
        .map(([name, Page]) => (
          <Route
            key={name}
            path={'/' + name}
            element={<LayoutWrapper currentPageName={name}><Page /></LayoutWrapper>}
          />
        ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/Login" element={<Login />} />
      <Route path="/AssinarAceite" element={<PublicAcceptance />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

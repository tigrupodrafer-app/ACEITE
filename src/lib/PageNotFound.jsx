import { Link, useLocation } from 'react-router-dom';

export default function PageNotFound() {
  const { pathname } = useLocation();

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full text-center space-y-5">
        <h1 className="text-7xl font-light text-slate-300">404</h1>
        <h2 className="text-2xl font-medium text-slate-800">Página não encontrada</h2>
        <p className="text-slate-600">
          O endereço solicitado não está disponível nesta aplicação.
        </p>
        <p className="text-xs text-slate-500 break-all">{pathname}</p>
        <Link to="/" className="inline-flex px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
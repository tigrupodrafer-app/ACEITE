import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      <nav style={{ backgroundColor: '#1a1a1a', borderBottom: '4px solid #cc0000' }} className="shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center gap-3">
          <Link to="/Dashboard" className="text-white hover:opacity-80 flex gap-3 items-center">
            <div className="bg-red-700 text-white font-extrabold px-3 py-2 rounded">D</div>
            <div>
              <p className="font-semibold text-sm">DRAFER ACEITE</p>
              <p className="text-xs text-slate-300">Sistema de Aceite Jurídico</p>
            </div>
          </Link>
          <div className="flex gap-3 items-center">
            <Link to="/Dashboard" className="hidden sm:inline text-sm text-slate-200 hover:text-white">
              Dashboard
            </Link>
            <span className="hidden md:inline text-xs text-slate-400" title="Funcionalidades ainda em migração">Pedidos: em migração</span>
            {user && (
              <>
                <span className="text-xs md:text-sm text-slate-200 flex gap-1 items-center">
                  <UserRound className="w-4 h-4" />{user.full_name || user.email}
                </span>
                <Button variant="outline" size="sm" onClick={() => void logout()} className="gap-2">
                  <LogOut className="w-4 h-4" /> Sair
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>
      <main>{children}</main>
      <footer style={{ backgroundColor: '#1a1a1a', borderTop: '4px solid #cc0000' }}
        className="text-center text-slate-300 py-5 text-sm">
        © 2026 Grupo DRAFER — Sistema de Aceite Jurídico
      </footer>
    </div>
  );
}

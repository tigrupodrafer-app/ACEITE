import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LogOut, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';

const PUBLIC_PAGES = ['AssinarAceite'];

export default function Layout({ children, currentPageName }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  if (PUBLIC_PAGES.includes(currentPageName)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      {/* Navigation */}
      <nav style={{ backgroundColor: '#1a1a1a', borderBottom: '4px solid #cc0000' }} className="shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex justify-between items-center">
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69b080ba942cb63e0f99eb48/c1b6412c8_WhatsAppImage2026-02-04at142058.jpg"
                alt="Grupo Drafer"
                className="h-10 object-contain"
              />
              <div className="border-l border-gray-600 pl-3">
                <p className="font-semibold text-white text-sm">Sistema de Aceite Jurídico</p>
                <p style={{ color: '#cc0000' }} className="text-xs">Telhas Metálicas</p>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')} className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                Dashboard
              </Link>
              <Link to={createPageUrl('Perfil')} className="text-gray-300 hover:text-white transition-colors text-sm font-medium flex items-center gap-1">
                <User className="w-4 h-4" /> Perfil
              </Link>
              <Link
                to={createPageUrl('SubmeterPedido')}
                className="text-sm font-semibold px-4 py-2 rounded text-white transition-colors"
                style={{ backgroundColor: '#cc0000' }}
                onMouseEnter={e => e.target.style.backgroundColor = '#aa0000'}
                onMouseLeave={e => e.target.style.backgroundColor = '#cc0000'}
              >
                + Novo Pedido
              </Link>
            </div>

            <div className="flex items-center gap-4">
              {user && (
                <>
                  <span className="text-gray-300 text-sm">{user.full_name}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="gap-2 text-white border-gray-500 hover:bg-gray-700"
                    style={{ borderColor: '#cc0000', color: '#cc0000' }}
                  >
                    <LogOut className="w-4 h-4" /> Sair
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: '#1a1a1a', borderTop: '4px solid #cc0000' }} className="text-gray-400 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69b080ba942cb63e0f99eb48/c1b6412c8_WhatsAppImage2026-02-04at142058.jpg"
              alt="Grupo Drafer"
              className="h-8 object-contain"
            />
          </div>
          <p>© 2026 Sistema de Blindagem Jurídica - Fabricação e Venda de Telhas Metálicas</p>
          <p className="mt-1">Prova digital registrada e protegida para fins jurídicos</p>
        </div>
      </footer>
    </div>
  );
}
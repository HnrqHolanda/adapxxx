'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const { signOut, userRole, user, loading } = useAuth();

  // Debug completo
  useEffect(() => {
    console.log('=== DASHBOARD DEBUG ===');
    console.log('loading:', loading);
    console.log('userRole:', userRole);
    console.log('userRole type:', typeof userRole);
    console.log('user:', user);
    console.log('user?.role:', user?.role);
    console.log('user?.role type:', typeof user?.role);
    console.log('userRole === "admin":', userRole === 'admin');
    console.log('String(userRole) === "admin":', String(userRole) === 'admin');
    console.log('======================');
  }, [userRole, user, loading]);

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  // Se ainda está carregando, não renderiza nada
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#070A12] via-[#0C1530] to-[#070A12]">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  // Verificação múltipla do admin
  const isAdmin = 
    userRole === 'admin' || 
    user?.role === 'admin' ||
    String(userRole).toLowerCase() === 'admin' ||
    String(user?.role).toLowerCase() === 'admin';

  console.log('isAdmin final:', isAdmin);

  return (
    <div className="min-h-dvh w-full text-white relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-br from-[#070A12] via-[#0C1530] to-[#070A12]" />
        <div className="absolute -top-44 left-1/2 h-130 w-130 -translate-x-1/2 rounded-full bg-white/10 blur-[150px]" />
        <div className="absolute -bottom-65 -right-50 h-140 w-140 rounded-full bg-white/5 blur-[170px]" />
        <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/30 to-black/60" />
      </div>

      <div className="min-h-dvh px-4 overflow-y-auto">
        <div className="min-h-dvh flex justify-center items-start sm:items-center pt-10 sm:pt-0">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-5">
                <div className="relative h-16 w-16 sm:h-24 sm:w-24">
                  <Image
                    src="/logo3.png"
                    alt="Logo 1"
                    fill
                    className="object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)]"
                    priority
                  />
                </div>

                <div className="relative h-16 w-16 sm:h-24 sm:w-24">
                  <Image
                    src="/logo2.png"
                    alt="Logo 2"
                    fill
                    className="object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)]"
                    priority
                  />
                </div>
              </div>
            </div>

            <div className="mb-6 text-center">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-[0.30em]">
                PAINEL <span className="text-white/80">PRINCIPAL</span>
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-white/65 italic">
                Selecione uma funcionalidade
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md p-5 sm:p-7 space-y-4">
              <button
                onClick={() => router.push('/fo')}
                className="
                  w-full rounded-xl py-4
                  bg-white text-black
                  font-semibold tracking-widest text-sm
                  shadow-lg shadow-black/25
                  hover:brightness-95 active:scale-[0.99]
                  transition
                  flex items-center justify-center gap-3
                "
              >
                ➕ LANÇAR FO
              </button>

              {/* Renderização condicional dos botões admin */}
              {isAdmin ? (
                <>
                  <button
                    onClick={() => router.push('/pernoite')}
                    className="
                      w-full rounded-xl py-4
                      border border-white/20
                      bg-transparent text-white
                      font-semibold tracking-widest text-sm
                      hover:bg-white/5 active:scale-[0.99]
                      transition
                      flex items-center justify-center gap-3
                    "
                  >
                    🦆 HORA DO PATO
                  </button>

                  <button
                    onClick={() => router.push('/controles_disciplinares')}
                    className="
                      w-full rounded-xl py-4
                      border border-white/20
                      bg-transparent text-white
                      font-semibold tracking-widest text-sm
                      hover:bg-white/5 active:scale-[0.99]
                      transition
                      flex items-center justify-center gap-3
                    "
                  >
                    📄 CONTROLES DISCIPLINARES
                  </button>
                </>
              ) : null}

              <button
                onClick={() => router.push('/estatisticas')}
                className="
                  w-full rounded-xl py-4
                  border border-white/20
                  bg-transparent text-white
                  font-semibold tracking-widest text-sm
                  hover:bg-white/5 active:scale-[0.99]
                  transition
                  flex items-center justify-center gap-3
                "
              >
                📊 ESTATÍSTICAS
              </button>

              <button
                onClick={handleLogout}
                className="
                  w-full rounded-xl py-4
                  border border-white/20
                  bg-transparent text-white
                  font-semibold tracking-widest text-sm
                  hover:bg-white/5 active:scale-[0.99]
                  transition
                  flex items-center justify-center gap-3
                "
              >
                🚪 LOGOUT
              </button>
            </div>

            <div className="h-10 sm:h-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
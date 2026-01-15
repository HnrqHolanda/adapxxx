'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { signIn } = useAuth();
  const router = useRouter();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email inválido';
    }

    if (!password) {
      newErrors.password = 'Senha é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateForm()) return;

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (result.success) router.push('/dashboard');
    else setErrorMessage(result.error || 'Erro ao fazer login');
  };

  return (
    <div className="min-h-dvh w-full text-white relative overflow-hidden">
      {/* Fundo em degradê escuro + glow discreto */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#070A12] via-[#0C1530] to-[#070A12]" />
        <div className="absolute -top-44 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-[150px]" />
        <div className="absolute bottom-[-260px] right-[-200px] h-[560px] w-[560px] rounded-full bg-white/5 blur-[170px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/60" />
      </div>

      {/* ✅ Scroll agora é na página (direita), não no card */}
      <div className="min-h-dvh px-4 overflow-y-auto">
        <div className="min-h-dvh flex justify-center items-start sm:items-center pt-10 sm:pt-0">
          <div className="w-full max-w-md">
            {/* ✅ Opção 1: “selo institucional” (mais presença + respiro + divisor) */}
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

            {/* Header */}
            <div className="mb-4 sm:mb-6 text-center">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-[0.30em]">
                ADAPTAÇÃO <span className="text-white/80">XXX</span>
              </h1>

              <p className="mt-2 text-xs sm:text-sm text-white/65 italic">
                Nossa missão é formar
              </p>
            </div>

            {/* Card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md p-5 sm:p-7">
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="bg-red-500/10 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl text-sm">
                    {errorMessage}
                  </div>
                )}

                {/* EMAIL */}
                <div className="space-y-2">
                  <label className="text-[11px] sm:text-xs font-medium tracking-widest text-white/80">
                    EMAIL
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    placeholder="seu.email@ime.eb.br"
                    className={`
                      w-full rounded-xl px-4 py-3
                      bg-black/25 border text-sm
                      outline-none transition
                      placeholder:text-white/35
                      ${errors.email ? 'border-red-400/70' : 'border-white/15'}
                      focus:border-white/30 focus:ring-4 focus:ring-white/10
                    `}
                  />
                  {errors.email && (
                    <p className="text-[11px] text-red-300/90">{errors.email}</p>
                  )}
                </div>

                {/* SENHA */}
                <div className="space-y-2">
                  <label className="text-[11px] sm:text-xs font-medium tracking-widest text-white/80">
                    SENHA
                  </label>

                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                      placeholder="Digite sua senha"
                      className={`
                        w-full rounded-xl px-4 py-3 pr-11
                        bg-black/25 border text-sm
                        outline-none transition
                        placeholder:text-white/35
                        ${errors.password ? 'border-red-400/70' : 'border-white/15'}
                        focus:border-white/30 focus:ring-4 focus:ring-white/10
                      `}
                    />

                    {/* Ícone visual (mantido como estava) */}
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 text-sm select-none">
                      👁
                    </span>
                  </div>

                  {errors.password && (
                    <p className="text-[11px] text-red-300/90">{errors.password}</p>
                  )}
                </div>

                {/* ENTRAR */}
                <button
                  type="submit"
                  disabled={loading}
                  className="
                    mt-1 w-full rounded-xl py-3
                    text-sm font-semibold tracking-widest
                    bg-white text-black
                    shadow-lg shadow-black/25
                    hover:brightness-95 active:scale-[0.99]
                    disabled:opacity-60 disabled:cursor-not-allowed
                    transition
                  "
                >
                  {loading ? 'ENTRANDO...' : 'ENTRAR'}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-4 py-1">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[11px] tracking-widest text-white/45">OU</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* CRIAR CONTA */}
                <Link href="/cadastro" className="block">
                  <button
                    type="button"
                    className="
                      w-full rounded-xl py-3
                      text-sm font-semibold tracking-widest
                      border border-white/20 bg-transparent text-white
                      hover:bg-white/5 active:scale-[0.99]
                      transition
                    "
                  >
                    CRIAR CONTA
                  </button>
                </Link>
              </form>

              <div className="mt-5 text-center text-[11px] sm:text-xs text-white/45">
                <p>Realizado pelo Corpo de Alunos + Turma XXVI</p>
              </div>
            </div>

            {/* espaçamento final para mobile */}
            <div className="h-10 sm:h-0" />
          </div>
        </div>
      </div>
    </div>
  );
}



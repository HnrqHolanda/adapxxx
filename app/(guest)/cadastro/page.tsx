'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

export default function CadastroPage() {
  const [formData, setFormData] = useState({
    email: '',
    nomeGuerra: '',
    posto: '',
    password: '',
  });

  const [showPass, setShowPass] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { signUp } = useAuth();
  const router = useRouter();

  const postoOptions = useMemo(
    () => [
      { value: '', label: 'Selecione...' },
      { value: 'Capitão', label: 'Capitão' },
      { value: '1º Tenente', label: '1º Tenente' },
      { value: '2º Tenente', label: '2º Tenente' },
    ],
    []
  );

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) newErrors.email = 'Email é obrigatório';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido';

    if (!formData.nomeGuerra.trim()) newErrors.nomeGuerra = 'Nome de guerra é obrigatório';
    else if (formData.nomeGuerra.trim().length < 2)
      newErrors.nomeGuerra = 'Nome de guerra deve ter pelo menos 2 caracteres';

    if (!formData.posto) newErrors.posto = 'Posto é obrigatório';

    if (!formData.password) newErrors.password = 'Senha é obrigatória';
    else if (formData.password.length < 6)
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateForm()) return;

    setLoading(true);

    const email = formData.email.trim();
    const nomeGuerra = formData.nomeGuerra.trim();
    const posto = formData.posto;

    // ✅ O signUp no AuthContext já cria o usuário com role: 'user'
    // Não precisa fazer nada extra aqui
    const result = await signUp(email, formData.password, nomeGuerra, posto);

    if (result.success) {
      setLoading(false);
      router.push('/dashboard');
      return;
    }

    setLoading(false);
    setErrorMessage(result.error || 'Erro ao criar conta');
  };

  const inputBase = (hasError?: boolean) =>
    `
      w-full rounded-xl px-4 py-3
      bg-black/25 border text-sm
      outline-none transition
      placeholder:text-white/35
      ${hasError ? 'border-red-400/70' : 'border-white/15'}
      focus:border-white/30 focus:ring-4 focus:ring-white/10
    `;

  return (
    <div className="min-h-dvh w-full text-white relative overflow-hidden">
      {/* Fundo */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-br from-[#070A12] via-[#0C1530] to-[#070A12]" />
        <div className="absolute -top-44 left-1/2 h-130 w-130 -translate-x-1/2 rounded-full bg-white/10 blur-[150px]" />
        <div className="absolute bottom-[-260px] right-[-200px] h-[560px] w-[560px] rounded-full bg-white/5 blur-[170px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/60" />
      </div>

      {/* Scroll na página */}
      <div className="min-h-dvh px-4 overflow-y-auto">
        <div className="min-h-dvh flex justify-center items-start sm:items-center pt-10 sm:pt-0">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="mb-4 sm:mb-6 text-center">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-[0.30em]">
                NOVO CADASTRO
              </h1>
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
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="seu.email@ime.eb.br"
                    className={inputBase(!!errors.email)}
                  />
                  {errors.email && <p className="text-[11px] text-red-300/90">{errors.email}</p>}
                </div>

                {/* NOME DE GUERRA */}
                <div className="space-y-2">
                  <label className="text-[11px] sm:text-xs font-medium tracking-widest text-white/80">
                    NOME DE GUERRA
                  </label>
                  <input
                    type="text"
                    value={formData.nomeGuerra}
                    onChange={(e) => updateField('nomeGuerra', e.target.value)}
                    placeholder="Digite seu nome de guerra"
                    className={inputBase(!!errors.nomeGuerra)}
                  />
                  {errors.nomeGuerra && (
                    <p className="text-[11px] text-red-300/90">{errors.nomeGuerra}</p>
                  )}
                </div>

                {/* POSTO */}
                <div className="space-y-2">
                  <label className="text-[11px] sm:text-xs font-medium tracking-widest text-white/80">
                    POSTO
                  </label>
                  <select
                    value={formData.posto}
                    onChange={(e) => updateField('posto', e.target.value)}
                    className={`${inputBase(!!errors.posto)} appearance-none`}
                  >
                    {postoOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} className="text-black">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {errors.posto && <p className="text-[11px] text-red-300/90">{errors.posto}</p>}
                  <p className="text-[11px] text-white/40">Selecione seu posto.</p>
                </div>

                {/* SENHA */}
                <div className="space-y-2">
                  <label className="text-[11px] sm:text-xs font-medium tracking-widest text-white/80">
                    SENHA
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className={`${inputBase(!!errors.password)} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 text-sm hover:text-white transition"
                      aria-label="Mostrar/ocultar senha"
                    >
                      {showPass ? '🙈' : '👁'}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-red-300/90">{errors.password}</p>
                  )}
                </div>

                {/* CRIAR CONTA */}
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
                  {loading ? 'CRIANDO...' : 'CRIAR CONTA'}
                </button>

                {/* Link para login */}
                <div className="pt-1 text-center">
                  <Link href="/login" className="text-white/70 hover:text-white transition">
                    Já tem uma conta? <span className="font-semibold text-white">Entrar</span>
                  </Link>
                </div>
              </form>
            </div>

            <div className="h-10 sm:h-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
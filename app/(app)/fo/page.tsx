'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDoc,
  collection,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

type Candidate = {
  id: string;
  Nome: string;
  Tipo: string;
  nomeLower: string; // calculado no front
};

type FoTipo = 'positivo' | 'negativo';

type UserProfileDoc = {
  posto?: string;
  nomeGuerra?: string;
  email?: string;
};

export default function FoPage() {
  const router = useRouter();
  const { user } = useAuth();

  // form state
  const [tipo, setTipo] = useState<FoTipo>('positivo');
  const [descricao, setDescricao] = useState('');
  const [candidateQuery, setCandidateQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // candidatos
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);

  // submit
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // carrega candidatos uma vez
  useEffect(() => {
    (async () => {
      try {
        setLoadingCandidates(true);

        const snap = await getDocs(collection(db, 'candidatos'));

        const list: Candidate[] = snap.docs
          .map((d) => {
            const data = d.data() as any;
            const nome = (data.Nome ?? '').toString();
            const tipo = (data.Tipo ?? '').toString();

            return {
              id: d.id,
              Nome: nome,
              Tipo: tipo,
              nomeLower: nome.toLowerCase(),
            };
          })
          .filter((c) => c.Nome.trim().length > 0)
          .sort((a, b) => a.nomeLower.localeCompare(b.nomeLower));

        setCandidates(list);
      } catch (e) {
        console.error(e);
        setError('Erro ao carregar candidatos.');
      } finally {
        setLoadingCandidates(false);
      }
    })();
  }, []);

  // sugestões filtradas (client-side)
  const suggestions = useMemo(() => {
    const q = candidateQuery.trim().toLowerCase();
    if (!q) return [];
    return candidates.filter((c) => c.nomeLower.includes(q)).slice(0, 8);
  }, [candidateQuery, candidates]);

  // se digitar depois de selecionar, invalida seleção (evita “nome livre”)
  useEffect(() => {
    if (!selectedCandidate) return;
    if (candidateQuery.trim() === '') return;

    if (candidateQuery !== selectedCandidate.Nome) {
      setSelectedCandidate(null);
    }
  }, [candidateQuery, selectedCandidate]);

  const canSubmit =
    !!user &&
    !saving &&
    descricao.trim().length >= 5 &&
    selectedCandidate != null;

  const handleSelectCandidate = (c: Candidate) => {
    setSelectedCandidate(c);
    setCandidateQuery(c.Nome);
  };

  // ✅ helper: resolve "posto + nomeGuerra" com fallback do Firestore
  const resolveLancadoPor = async () => {
    // 1) se já veio do contexto, usa
    const postoCtx = (user as any)?.posto?.trim?.() ?? '';
    const nomeCtx = (user as any)?.nomeGuerra?.trim?.() ?? '';
    if (postoCtx && nomeCtx) {
      return `${postoCtx} ${nomeCtx}`.trim();
    }

    // 2) fallback: buscar em users/{uid}
    if (!user?.uid) return '';

    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) return '';

    const data = snap.data() as UserProfileDoc;
    const postoDb = (data.posto ?? '').toString().trim();
    const nomeDb = (data.nomeGuerra ?? '').toString().trim();

    if (!postoDb || !nomeDb) return '';
    return `${postoDb} ${nomeDb}`.trim();
  };

  const handleSubmit = async () => {
    setError(null);

    if (!user) {
      setError('Sessão inválida. Faça login novamente.');
      return;
    }
    if (!selectedCandidate) {
      setError('Selecione um candidato da lista.');
      return;
    }
    if (descricao.trim().length < 5) {
      setError('Descreva o fato observado (mínimo 5 caracteres).');
      return;
    }

    try {
      setSaving(true);

      const lancadoPor = await resolveLancadoPor();

      if (!lancadoPor) {
        setError(
          'Seu perfil (posto e nome de guerra) não foi encontrado no Firestore. Faça logout e cadastre novamente, ou complete seu cadastro.'
        );
        return;
      }

      await addDoc(collection(db, 'fos'), {
        tipo,
        descricao: descricao.trim(),

        candidateId: selectedCandidate.id,
        candidateNome: selectedCandidate.Nome,
        candidateNomeLower: selectedCandidate.nomeLower,
        candidateTipo: selectedCandidate.Tipo,

        lancadoPor,
        lancadoPorUid: user.uid,

        punicao: '',
        jaJulgado: false,
        julgadoPor: '',

        createdAt: Date.now(),
      });

      // limpa form
      setDescricao('');
      setCandidateQuery('');
      setSelectedCandidate(null);
      setTipo('positivo');

      router.push('/dashboard');
    } catch (e: any) {
      console.error(e);
      setError('Erro ao salvar FO. Verifique as permissões do Firestore (Rules).');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh w-full text-white relative overflow-hidden">
      {/* fundo */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-br from-[#070A12] via-[#0C1530] to-[#070A12]" />
        <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/30 to-black/60" />
      </div>

      <div className="min-h-dvh px-4 py-10 flex items-start justify-center">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-[0.22em]">LANÇAR FO</h1>
            <p className="text-white/70 text-sm mt-2">
              Preencha os campos e selecione um candidato existente.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md p-5 space-y-4">
            {/* tipo */}
            <div className="space-y-2">
              <label className="text-xs tracking-widest text-white/70">TIPO DE FO</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as FoTipo)}
                className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 outline-none"
              >
                <option value="positivo">Positivo</option>
                <option value="negativo">Negativo</option>
              </select>
            </div>

            {/* candidato (autocomplete obrigatório) */}
            <div className="space-y-2 relative">
              <label className="text-xs tracking-widest text-white/70">NOME DO CANDIDATO</label>
              <input
                value={candidateQuery}
                onChange={(e) => setCandidateQuery(e.target.value)}
                placeholder={loadingCandidates ? 'Carregando candidatos...' : 'Digite para buscar...'}
                className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 outline-none"
                disabled={loadingCandidates}
              />

              {candidateQuery.trim() !== '' && !selectedCandidate && suggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-white/10 bg-[#0B1226] shadow-2xl overflow-hidden">
                  {suggestions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCandidate(c)}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 transition"
                    >
                      {c.Nome} <span className="text-white/50 text-xs">({c.Tipo})</span>
                    </button>
                  ))}
                </div>
              )}

              {candidateQuery.trim() !== '' && !selectedCandidate && suggestions.length === 0 && (
                <p className="text-xs text-red-300/90">
                  Nenhum candidato encontrado. Selecione um nome existente.
                </p>
              )}

              {selectedCandidate && (
                <p className="text-xs text-emerald-300/90">
                  Selecionado: <span className="font-semibold">{selectedCandidate.Nome}</span>
                </p>
              )}
            </div>

            {/* descricao */}
            <div className="space-y-2">
              <label className="text-xs tracking-widest text-white/70">DESCRIÇÃO DO FATO OBSERVADO</label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o fato observado..."
                className="w-full min-h-30 rounded-xl bg-black/30 border border-white/15 px-4 py-3 outline-none resize-none"
              />
              <p className="text-xs text-white/50">{descricao.trim().length}/5 mínimo</p>
            </div>

            {error && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-400/20 rounded-xl p-3">
                {error}
              </div>
            )}

            {/* ações */}
            <div className="pt-2 space-y-3">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="
                  w-full rounded-xl py-4
                  bg-white text-black
                  font-semibold tracking-widest text-sm
                  shadow-lg shadow-black/25
                  hover:brightness-95 active:scale-[0.99]
                  transition
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {saving ? 'SALVANDO...' : 'LANÇAR FO'}
              </button>

              <button
                onClick={() => router.push('/dashboard')}
                className="
                  w-full rounded-xl py-4
                  border border-white/20
                  bg-transparent text-white
                  font-semibold tracking-widest text-sm
                  hover:bg-white/5 active:scale-[0.99]
                  transition
                "
              >
                VOLTAR
              </button>
            </div>
          </div>

          <div className="h-10" />
        </div>
      </div>
    </div>
  );
}

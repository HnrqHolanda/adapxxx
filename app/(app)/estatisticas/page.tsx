'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type FoTipo = 'positivo' | 'negativo' | 'neutro';

type FoDoc = {
  id: string;
  tipo: FoTipo;

  candidateNome: string;
  candidateNomeLower?: string;

  lancadoPor: string;
  jaJulgado: boolean;

  createdAt: number;
};

export default function EstatisticasPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fos, setFos] = useState<FoDoc[]>([]);

  // navegação das estatísticas
  const [statIndex, setStatIndex] = useState(0); // 0..2

  // estatística 1
  const [candQuery, setCandQuery] = useState('');
  const [candSelected, setCandSelected] = useState<string | null>(null);

  // estatística 2 (empates)
  const [topNegIndex, setTopNegIndex] = useState(0);

  // estatística 3 (empates)
  const [topTorraIndex, setTopTorraIndex] = useState(0);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'fos'));
      const list: FoDoc[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      // ordenar por data
      list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

      setFos(list);
    } catch (e) {
      console.error(e);
      setError('Erro ao carregar estatísticas (coleção fos).');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Normaliza nomes de candidatos baseados no que já existe em FOs
  const allCandidateNames = useMemo(() => {
    const set = new Map<string, string>(); // lower -> original
    for (const fo of fos) {
      const nome = (fo.candidateNome ?? '').trim();
      if (!nome) continue;
      const lower = nome.toLowerCase();
      if (!set.has(lower)) set.set(lower, nome);
    }
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  }, [fos]);

  // sugestões do input da estatística 1
  const candSuggestions = useMemo(() => {
    const q = candQuery.trim().toLowerCase();
    if (!q) return [];
    return allCandidateNames
      .filter((n) => n.toLowerCase().includes(q))
      .slice(0, 8);
  }, [candQuery, allCandidateNames]);

  // se digitar depois de selecionar, invalida seleção
  useEffect(() => {
    if (!candSelected) return;
    if (candQuery.trim() === '') return;
    if (candQuery !== candSelected) setCandSelected(null);
  }, [candQuery, candSelected]);

  // agregação por candidato
  const byCandidate = useMemo(() => {
    const map = new Map<string, { nome: string; pos: number; neg: number; neu: number }>();

    for (const fo of fos) {
      const nome = (fo.candidateNome ?? '').trim();
      if (!nome) continue;
      const key = nome.toLowerCase();

      if (!map.has(key)) {
        map.set(key, { nome, pos: 0, neg: 0, neu: 0 });
      }
      const row = map.get(key)!;

      if (fo.tipo === 'positivo') row.pos += 1;
      else if (fo.tipo === 'negativo') row.neg += 1;
      else row.neu += 1;
    }

    return map;
  }, [fos]);

  // agregação por lançador (adaptador) — só negativos
  const byLancadorNeg = useMemo(() => {
    const map = new Map<string, number>(); // lancadoPor -> count negativos

    for (const fo of fos) {
      if (fo.tipo !== 'negativo') continue;
      const lp = (fo.lancadoPor ?? '').trim();
      if (!lp) continue;
      map.set(lp, (map.get(lp) ?? 0) + 1);
    }

    return map;
  }, [fos]);

  // Estatística 1: contagem para o candidato selecionado
  const stat1 = useMemo(() => {
    if (!candSelected) return null;
    const key = candSelected.toLowerCase();
    return byCandidate.get(key) ?? { nome: candSelected, pos: 0, neg: 0, neu: 0 };
  }, [candSelected, byCandidate]);

  // Estatística 2: top candidatos por negativos (com empates)
  const topNegCandidates = useMemo(() => {
    let max = -1;
    const arr: { nome: string; neg: number }[] = [];

    for (const row of byCandidate.values()) {
      const neg = row.neg ?? 0;
      if (neg > max) max = neg;
    }
    if (max <= 0) return [];

    for (const row of byCandidate.values()) {
      if ((row.neg ?? 0) === max) arr.push({ nome: row.nome, neg: row.neg });
    }

    arr.sort((a, b) => a.nome.localeCompare(b.nome));
    return arr;
  }, [byCandidate]);

  // Estatística 3: top adaptadores por negativos lançados (com empates)
  const topTorra = useMemo(() => {
    let max = -1;
    const arr: { lancadoPor: string; neg: number }[] = [];

    for (const [, count] of byLancadorNeg.entries()) {
      if (count > max) max = count;
    }
    if (max <= 0) return [];

    for (const [lp, count] of byLancadorNeg.entries()) {
      if (count === max) arr.push({ lancadoPor: lp, neg: count });
    }

    arr.sort((a, b) => a.lancadoPor.localeCompare(b.lancadoPor));
    return arr;
  }, [byLancadorNeg]);

  // ✅ reseta índices quando muda o tamanho (pra não ficar fora do range)
  useEffect(() => {
    setTopNegIndex(0);
  }, [topNegCandidates.length]);

  useEffect(() => {
    setTopTorraIndex(0);
  }, [topTorra.length]);

  // helpers UI
  const nextStat = () => {
    setError(null);
    setStatIndex((i) => (i + 1) % 3);
  };
  const prevStat = () => {
    setError(null);
    setStatIndex((i) => (i + 2) % 3);
  };

  const cardBase =
    'rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md p-5 space-y-4';

  // ✅ empates?
  const hasNegTie = topNegCandidates.length > 1;
  const hasTorraTie = topTorra.length > 1;

  return (
    <div className="min-h-dvh w-full text-white relative overflow-hidden">
      {/* fundo */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-br from-[#070A12] via-[#0C1530] to-[#070A12]" />
        <div className="absolute -top-44 left-1/2 h-130 w-130 -translate-x-1/2 rounded-full bg-white/10 blur-[150px]" />
        <div className="absolute bottom-[-260px] right-[-200px] h-[560px] w-[560px] rounded-full bg-white/5 blur-[170px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/60" />
      </div>

      <div className="min-h-dvh px-4 py-10 flex items-start justify-center">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-[0.22em]">ESTATÍSTICAS</h1>
            <p className="text-white/70 text-sm mt-2">
              Use as setas para alternar.
            </p>
          </div>

          <div className={cardBase}>
            {/* header com setinhas */}
            <div className="flex items-center justify-between">
              <button
                onClick={prevStat}
                className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 hover:bg-white/5 transition"
                aria-label="Anterior"
              >
                ←
              </button>

              <div className="text-xs tracking-widest text-white/70">
                {statIndex === 0 && 'Contador de FOs'}
                {statIndex === 1 && 'Mais Torrado'}
                {statIndex === 2 && 'Maior Torrador'}
              </div>

              <button
                onClick={nextStat}
                className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 hover:bg-white/5 transition"
                aria-label="Próxima"
              >
                →
              </button>
            </div>

            {loading && <div className="text-sm text-white/70">Carregando...</div>}

            {/* ===================== Estatística 1 ===================== */}
            {!loading && statIndex === 0 && (
              <div className="space-y-4">
                <div className="space-y-2 relative">
                  <label className="text-xs tracking-widest text-white/70">NOME DO CANDIDATO</label>
                  <input
                    value={candQuery}
                    onChange={(e) => setCandQuery(e.target.value)}
                    placeholder="Digite para buscar..."
                    className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 outline-none"
                  />

                  {candQuery.trim() !== '' && !candSelected && candSuggestions.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-white/10 bg-[#0B1226] shadow-2xl overflow-hidden">
                      {candSuggestions.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setCandSelected(n);
                            setCandQuery(n);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-white/5 transition"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  )}

                  {candQuery.trim() !== '' && !candSelected && candSuggestions.length === 0 && (
                    <p className="text-xs text-red-300/90">Nenhum candidato encontrado nos FOs.</p>
                  )}

                  {candSelected && (
                    <p className="text-xs text-emerald-300/90">
                      Selecionado: <span className="font-semibold">{candSelected}</span>
                    </p>
                  )}
                </div>

                {candSelected && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs text-white/60 tracking-widest">POSITIVOS</div>
                      <div className="mt-1 text-2xl font-semibold">{stat1?.pos ?? 0}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs text-white/60 tracking-widest">NEGATIVOS</div>
                      <div className="mt-1 text-2xl font-semibold">{stat1?.neg ?? 0}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===================== Estatística 2 ===================== */}
            {!loading && statIndex === 1 && (
              <div className="space-y-4">
                {topNegCandidates.length === 0 ? (
                  <div className="text-sm text-white/70">
                    Ainda não há FOs negativos registrados.
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className={`flex items-center ${hasNegTie ? 'justify-between' : 'justify-center'} gap-3`}>
                      {hasNegTie && (
                        <button
                          onClick={() =>
                            setTopNegIndex((i) => (i + topNegCandidates.length - 1) % topNegCandidates.length)
                          }
                          className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 hover:bg-white/5 transition"
                          aria-label="Anterior empate"
                        >
                          ←
                        </button>
                      )}

                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          {topNegCandidates[topNegIndex].nome}
                        </div>
                        <div className="text-xs text-white/60 mt-1 tracking-widest">
                          NEGATIVOS: {topNegCandidates[topNegIndex].neg}
                        </div>

                        {hasNegTie && (
                          <div className="text-[11px] text-white/50 mt-2">
                            Empate ({topNegIndex + 1}/{topNegCandidates.length})
                          </div>
                        )}
                      </div>

                      {hasNegTie && (
                        <button
                          onClick={() => setTopNegIndex((i) => (i + 1) % topNegCandidates.length)}
                          className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 hover:bg-white/5 transition"
                          aria-label="Próximo empate"
                        >
                          →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===================== Estatística 3 ===================== */}
            {!loading && statIndex === 2 && (
              <div className="space-y-4">
                {topTorra.length === 0 ? (
                  <div className="text-sm text-white/70">
                    Ainda não há FOs negativos registrados.
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className={`flex items-center ${hasTorraTie ? 'justify-between' : 'justify-center'} gap-3`}>
                      {hasTorraTie && (
                        <button
                          onClick={() => setTopTorraIndex((i) => (i + topTorra.length - 1) % topTorra.length)}
                          className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 hover:bg-white/5 transition"
                          aria-label="Anterior empate"
                        >
                          ←
                        </button>
                      )}

                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          {topTorra[topTorraIndex].lancadoPor}
                        </div>
                        <div className="text-xs text-white/60 mt-1 tracking-widest">
                          NEGATIVOS LANÇADOS: {topTorra[topTorraIndex].neg}
                        </div>

                        {hasTorraTie && (
                          <div className="text-[11px] text-white/50 mt-2">
                            Empate ({topTorraIndex + 1}/{topTorra.length})
                          </div>
                        )}
                      </div>

                      {hasTorraTie && (
                        <button
                          onClick={() => setTopTorraIndex((i) => (i + 1) % topTorra.length)}
                          className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 hover:bg-white/5 transition"
                          aria-label="Próximo empate"
                        >
                          →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-400/20 rounded-xl p-3">
                {error}
              </div>
            )}

            <div className="pt-2 space-y-3">
              <button
                onClick={load}
                className="
                  w-full rounded-xl py-4
                  border border-white/20
                  bg-transparent text-white
                  font-semibold tracking-widest text-sm
                  hover:bg-white/5 active:scale-[0.99]
                  transition
                "
              >
                ATUALIZAR DADOS
              </button>

              <button
                onClick={() => router.push('/dashboard')}
                className="
                  w-full rounded-xl py-4
                  bg-white text-black
                  font-semibold tracking-widest text-sm
                  shadow-lg shadow-black/25
                  hover:brightness-95 active:scale-[0.99]
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

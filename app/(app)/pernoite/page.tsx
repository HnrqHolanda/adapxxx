'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

type FoDoc = {
  id: string;
  tipo: 'positivo' | 'negativo' | 'neutro';
  descricao: string;

  candidateId: string;
  candidateNome: string;
  candidateNomeLower: string;
  candidateTipo?: string;

  lancadoPor: string;
  lancadoPorUid: string;

  punicao: string;
  jaJulgado: boolean;
  julgadoPor: string;

  createdAt: number;
};

export default function HoraDoPatoPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fos, setFos] = useState<FoDoc[]>([]);
  const [filterNome, setFilterNome] = useState('');

  // modal
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<FoDoc | null>(null);
  const [punicao, setPunicao] = useState('');
  const [saving, setSaving] = useState(false);

  const loadFos = async () => {
  setError(null);
  setLoading(true);
  try {
    const q = query(
      collection(db, 'fos'),
      where('jaJulgado', '==', false),
      orderBy('createdAt', 'desc')
    );

    const snap = await getDocs(q);
    const list: FoDoc[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    // ✅ só negativos entram na Hora do Pato
    setFos(list.filter((f) => f.tipo === 'negativo'));
  } catch (e) {
    console.error(e);
    setError('Erro ao carregar FOs. Verifique Rules/índices do Firestore.');
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    loadFos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = filterNome.trim().toLowerCase();
    if (!q) return fos;
    return fos.filter((f) => (f.candidateNomeLower ?? '').includes(q));
  }, [fos, filterNome]);

  const openModal = (fo: FoDoc) => {
    setSelected(fo);
    setPunicao(fo.punicao ?? '');
    setOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
    setSelected(null);
    setPunicao('');
  };

  const resolveJulgadoPor = () => {
    const posto = (user as any)?.posto?.trim?.() ?? '';
    const nome = (user as any)?.nomeGuerra?.trim?.() ?? '';
    return `${posto} ${nome}`.trim();
  };

  const marcarComoJulgado = async () => {
    if (!selected) return;
    setError(null);

    const jp = resolveJulgadoPor();
    if (!jp) {
      setError('Perfil do usuário (posto/nome de guerra) não carregou. Recarregue a página.');
      return;
    }

    if (punicao.trim().length < 2) {
      setError('Escreva uma punição (mínimo 2 caracteres).');
      return;
    }

    try {
      setSaving(true);

      await updateDoc(doc(db, 'fos', selected.id), {
        punicao: punicao.trim(),
        jaJulgado: true,
        julgadoPor: jp,
        julgadoAt: Date.now(),
      });

      // remove da lista local (já que agora foi julgado)
      setFos((prev) => prev.filter((x) => x.id !== selected.id));

      closeModal();
    } catch (e) {
      console.error(e);
      setError('Erro ao atualizar FO. Verifique permissões do Firestore.');
    } finally {
      setSaving(false);
    }
  };

  const badgeTipo = (tipo: FoDoc['tipo']) => {
    if (tipo === 'positivo') return 'bg-emerald-500/15 border-emerald-400/20 text-emerald-200';
    if (tipo === 'negativo') return 'bg-red-500/15 border-red-400/20 text-red-200';
    return 'bg-white/10 border-white/15 text-white/80';
  };

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
            <h1 className="text-xl font-semibold tracking-[0.22em]">HORA DO PATO</h1>
            <p className="text-white/70 text-sm mt-2">
              Lista de FOs não julgados. Clique para julgar.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md p-5 space-y-4">
            {/* filtro */}
            <div className="space-y-2">
              <label className="text-xs tracking-widest text-white/70">FILTRAR POR CANDIDATO</label>
              <input
                value={filterNome}
                onChange={(e) => setFilterNome(e.target.value)}
                placeholder="Digite o nome do candidato..."
                className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 outline-none"
              />
            </div>

            {/* lista */}
            {loading && (
              <div className="text-sm text-white/70">Carregando FOs...</div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="text-sm text-white/70">
                Nenhum FO não julgado encontrado.
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <div className="space-y-3">
                {filtered.map((fo) => (
                  <button
                    key={fo.id}
                    type="button"
                    onClick={() => openModal(fo)}
                    className="
                      w-full text-left rounded-xl
                      border border-white/10 bg-black/20
                      hover:bg-white/5 transition
                      p-4
                    "
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold tracking-wide">
                        {fo.candidateNome}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-lg border ${badgeTipo(fo.tipo)}`}>
                        {fo.tipo.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-white/75 line-clamp-2">
                      {fo.descricao}
                    </div>
                    <div className="mt-2 text-[11px] text-white/55">
                      Lançado por: <span className="text-white/70">{fo.lancadoPor || '—'}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-400/20 rounded-xl p-3">
                {error}
              </div>
            )}

            {/* ações */}
            <div className="pt-2 space-y-3">
              <button
                onClick={loadFos}
                className="
                  w-full rounded-xl py-4
                  border border-white/20
                  bg-transparent text-white
                  font-semibold tracking-widest text-sm
                  hover:bg-white/5 active:scale-[0.99]
                  transition
                "
              >
                ATUALIZAR LISTA
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

      {/* MODAL */}
      {open && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
        >
          {/* overlay */}
          <button
            type="button"
            onClick={closeModal}
            className="absolute inset-0 bg-black/70"
            aria-label="Fechar modal"
          />

          {/* conteúdo */}
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0B1226] shadow-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-wide">
                  {selected.candidateNome}
                </h2>
                <p className="text-xs text-white/60 mt-1">
                  Lançado por: <span className="text-white/80">{selected.lancadoPor || '—'}</span>
                </p>
              </div>

              <span className={`text-xs px-2 py-1 rounded-lg border ${badgeTipo(selected.tipo)}`}>
                {selected.tipo.toUpperCase()}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-xs tracking-widest text-white/70">DESCRIÇÃO</label>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/80">
                {selected.descricao}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-xs tracking-widest text-white/70">PUNIÇÃO</label>
              <textarea
                value={punicao}
                onChange={(e) => setPunicao(e.target.value)}
                placeholder="Digite a punição..."
                className="w-full min-h-28 rounded-xl bg-black/30 border border-white/15 px-4 py-3 outline-none resize-none"
                disabled={saving}
              />
            </div>

            {error && (
              <div className="mt-4 text-sm text-red-300 bg-red-500/10 border border-red-400/20 rounded-xl p-3">
                {error}
              </div>
            )}

            <div className="mt-5 space-y-3">
              <button
                onClick={marcarComoJulgado}
                disabled={saving}
                className="
                  w-full rounded-xl py-4
                  bg-white text-black
                  font-semibold tracking-widest text-sm
                  shadow-lg shadow-black/25
                  hover:brightness-95 active:scale-[0.99]
                  transition
                  disabled:opacity-60 disabled:cursor-not-allowed
                "
              >
                {saving ? 'SALVANDO...' : 'MARCAR COMO JULGADO'}
              </button>

              <button
                onClick={closeModal}
                disabled={saving}
                className="
                  w-full rounded-xl py-4
                  border border-white/20
                  bg-transparent text-white
                  font-semibold tracking-widest text-sm
                  hover:bg-white/5 active:scale-[0.99]
                  transition
                  disabled:opacity-60 disabled:cursor-not-allowed
                "
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

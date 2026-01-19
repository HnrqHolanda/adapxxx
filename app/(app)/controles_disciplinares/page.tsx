'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

// ✅ PDF no front (sem Storage)
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type StatusControle = 'NAO_JULGADO' | 'JULGADO_PENDENTE_CONTROLE' | 'EM_CONTROLE';

type FoDoc = {
  id: string;
  tipo: 'positivo' | 'negativo';
  descricao: string;

  candidateNome: string;
  candidateNomeLower?: string;

  lancadoPor: string;
  punicao: string;
  jaJulgado: boolean;
  julgadoPor: string;

  createdAt?: number;

  // controle disciplinar
  entrouEmControle?: boolean;
  controleId?: string | null;
  controleFechadoAt?: number | null;
  controleFechadoPor?: string | null;
  statusControle?: StatusControle;
};

type ControleLinha = {
  candidateNome: string;
  descricao: string;
  lancadoPor: string;
  punicao: string;
  julgadoPor: string;
};

type ControleDoc = {
  id: string; // docId firestore
  controleId: string;
  titulo: string;

  fileName: string;

  createdBy: string;
  totalFos: number;

  createdAt?: any; // serverTimestamp
  linhas?: ControleLinha[];
};

function formatDateBR(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function makeControleId(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `CD-${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function resolveUserLabel(user: any) {
  const posto = (user as any)?.posto?.trim?.() ?? '';
  const nome = (user as any)?.nomeGuerra?.trim?.() ?? '';
  const label = `${posto} ${nome}`.trim();
  return label || (user?.email ?? '—');
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function gerarPdfBlob(titulo: string, linhas: ControleLinha[]) {
  const docPdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const marginX = 40;

  docPdf.setFont('helvetica', 'bold');
  docPdf.setFontSize(14);
  docPdf.text(titulo, marginX, 50);

  docPdf.setFont('helvetica', 'normal');
  docPdf.setFontSize(10);
  docPdf.text(`Gerado em: ${formatDateBR(new Date())}`, marginX, 70);

  const head = [[
    'Nome',
    'Descrição do FO',
    'Lançado por',
    'Punição',
    'Julgado por',
  ]];

  const body = linhas.map((l) => [
    l.candidateNome ?? '—',
    l.descricao ?? '—',
    l.lancadoPor ?? '—',
    l.punicao ?? '—',
    l.julgadoPor ?? '—',
  ]);

  // ✅ forma estável no Next: autoTable(doc, options)
  autoTable(docPdf, {
    head,
    body,
    startY: 90,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 6,
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 85 },
      1: { cellWidth: 170 },
      2: { cellWidth: 95 },
      3: { cellWidth: 95 },
      4: { cellWidth: 95 },
    },
    margin: { left: marginX, right: marginX },
  });

  return docPdf.output('blob') as Blob;
}

export default function ControlesDisciplinaresPage() {
  const router = useRouter();
  const { user, userRole } = useAuth(); // ✅ MUDANÇA: adicionar userRole

  const [loadingPendentes, setLoadingPendentes] = useState(true);
  const [loadingControles, setLoadingControles] = useState(true);
  const [closing, setClosing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [pendentes, setPendentes] = useState<FoDoc[]>([]);
  const [controles, setControles] = useState<ControleDoc[]>([]);

  // ✅ MUDANÇA: Proteção de rota - redireciona se não for admin
  useEffect(() => {
    if (userRole !== 'admin') {
      router.replace('/dashboard');
    }
  }, [userRole, router]);

  const loadPendentes = async () => {
    setError(null);
    setLoadingPendentes(true);
    try {
      const q = query(
        collection(db, 'fos'),
        where('statusControle', '==', 'JULGADO_PENDENTE_CONTROLE')
      );

      const snap = await getDocs(q);
      const list: FoDoc[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      list.sort((a, b) => ((b.createdAt ?? 0) as number) - ((a.createdAt ?? 0) as number));
      setPendentes(list);
    } catch (e) {
      console.error(e);
      setError('Erro ao carregar FOs julgados pendentes.');
    } finally {
      setLoadingPendentes(false);
    }
  };

  const loadControles = async () => {
    setError(null);
    setLoadingControles(true);
    try {
      const q = query(collection(db, 'controles_disciplinares'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);

      const list: ControleDoc[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      setControles(list);
    } catch (e) {
      console.error(e);
      setError('Erro ao carregar lista de controles disciplinares.');
    } finally {
      setLoadingControles(false);
    }
  };

  const loadAll = async () => {
    await Promise.all([loadPendentes(), loadControles()]);
  };

  // ✅ MUDANÇA: Só carrega se for admin
  useEffect(() => {
    if (userRole === 'admin') {
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);

  const fecharControle = async () => {
    setError(null);

    if (!user) {
      setError('Sessão inválida. Faça login novamente.');
      return;
    }
    if (pendentes.length === 0) {
      setError('Não há FOs julgados pendentes para fechar um controle.');
      return;
    }

    setClosing(true);

    try {
      const now = new Date();
      const controleId = makeControleId(now);
      const titulo = `Controle disciplinar - Dia ${formatDateBR(now)}`;
      const fileName = `${controleId}.pdf`;
      const createdBy = resolveUserLabel(user);

      const linhas: ControleLinha[] = pendentes.map((fo) => ({
        candidateNome: fo.candidateNome ?? '—',
        descricao: fo.descricao ?? '—',
        lancadoPor: fo.lancadoPor ?? '—',
        punicao: fo.punicao ?? '—',
        julgadoPor: fo.julgadoPor ?? '—',
      }));

      // 1) gera e baixa imediatamente
      const blob = gerarPdfBlob(titulo, linhas);
      downloadBlob(blob, fileName);

      // 2) salva o controle no Firestore (metadados + linhas)
      await addDoc(collection(db, 'controles_disciplinares'), {
        controleId,
        titulo,
        fileName,
        totalFos: pendentes.length,
        createdBy,
        createdAt: serverTimestamp(),
        linhas,
      });

      // 3) marca os FOs como EM_CONTROLE (batch)
      const CHUNK = 450;
      for (let i = 0; i < pendentes.length; i += CHUNK) {
        const slice = pendentes.slice(i, i + CHUNK);
        const batch = writeBatch(db);

        for (const fo of slice) {
          batch.update(doc(db, 'fos', fo.id), {
            entrouEmControle: true,
            controleId,
            controleFechadoAt: Date.now(),
            controleFechadoPor: createdBy,
            statusControle: 'EM_CONTROLE',
          });
        }

        await batch.commit();
      }

      await loadAll();
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Erro ao fechar controle disciplinar.');
    } finally {
      setClosing(false);
    }
  };

  const baixarControle = (c: ControleDoc) => {
    setError(null);
    try {
      const linhas = (c.linhas ?? []) as ControleLinha[];
      if (!linhas.length) {
        setError('Este controle não possui linhas salvas (linhas).');
        return;
      }
      const blob = gerarPdfBlob(c.titulo ?? 'Controle disciplinar', linhas);
      downloadBlob(blob, c.fileName ?? `${c.controleId}.pdf`);
    } catch (e) {
      console.error(e);
      setError('Erro ao gerar/baixar o PDF deste controle.');
    }
  };

  const cardBase =
    'rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md p-5 space-y-4';

  // ✅ MUDANÇA: Se não for admin, não renderiza nada (evita flash de conteúdo)
  if (userRole !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-dvh w-full text-white relative overflow-hidden">
      {/* fundo */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-br from-[#070A12] via-[#0C1530] to-[#070A12]" />
        <div className="absolute -top-44 left-1/2 h-130 w-130 -translate-x-1/2 rounded-full bg-white/10 blur-[150px]" />
        <div className="absolute -bottom-65 -right-50 h-140 w-140 rounded-full bg-white/5 blur-[170px]" />
        <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/30 to-black/60" />
      </div>

      <div className="min-h-dvh px-4 py-10 flex items-start justify-center">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-[0.22em]">CONTROLES DISCIPLINARES</h1>
            <p className="text-white/70 text-sm mt-2">
              Feche um controle para gerar o PDF e registrar no sistema.
            </p>
          </div>

          <div className={cardBase}>
            {/* contador + fechar */}
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
              <div className="text-xs tracking-widest text-white/60">FOs JULGADOS PENDENTES</div>

              <div className="text-4xl font-semibold">
                {loadingPendentes ? '—' : pendentes.length}
              </div>

              <div className="text-[11px] text-white/55">
                São os FOs já julgados que ainda não entraram em nenhum controle disciplinar.
              </div>

              <button
                onClick={fecharControle}
                disabled={closing || loadingPendentes || pendentes.length === 0}
                className="
                  mt-2 w-full rounded-xl py-3
                  text-sm font-semibold tracking-widest
                  bg-white text-black
                  shadow-lg shadow-black/25
                  hover:brightness-95 active:scale-[0.99]
                  disabled:opacity-60 disabled:cursor-not-allowed
                  transition
                "
              >
                {closing ? 'FECHANDO...' : 'FECHAR CONTROLE DISCIPLINAR'}
              </button>
            </div>

            {/* lista controles */}
            <div className="pt-2">
              <div className="text-xs tracking-widest text-white/60 mb-3">CONTROLES GERADOS</div>

              {loadingControles && (
                <div className="text-sm text-white/70">Carregando controles...</div>
              )}

              {!loadingControles && controles.length === 0 && (
                <div className="text-sm text-white/70">
                  Nenhum controle disciplinar gerado ainda.
                </div>
              )}

              {!loadingControles && controles.length > 0 && (
                <div className="space-y-3">
                  {controles.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="font-semibold tracking-wide">
                        {c.titulo ?? c.controleId}
                      </div>

                      <div className="mt-1 text-[11px] text-white/55">
                        Criado por: <span className="text-white/75">{c.createdBy ?? '—'}</span>
                      </div>

                      <div className="mt-1 text-[11px] text-white/55">
                        Total de FOs: <span className="text-white/75">{c.totalFos ?? 0}</span>
                      </div>

                      <button
                        onClick={() => baixarControle(c)}
                        className="
                          mt-3 w-full rounded-xl py-3
                          border border-white/20
                          bg-transparent text-white
                          font-semibold tracking-widest text-sm
                          hover:bg-white/5 active:scale-[0.99]
                          transition
                        "
                      >
                        BAIXAR PDF
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-400/20 rounded-xl p-3">
                {error}
              </div>
            )}

            {/* ações */}
            <div className="pt-2 space-y-3">
              <button
                onClick={loadAll}
                className="
                  w-full rounded-xl py-4
                  border border-white/20
                  bg-transparent text-white
                  font-semibold tracking-widest text-sm
                  hover:bg-white/5 active:scale-[0.99]
                  transition
                "
              >
                ATUALIZAR
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
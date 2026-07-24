"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/app/utils/supabase";

const BLUE = "#11224E";
const ORANGE = "#eb670e";

type MediaMeta = {
  id: string;
  type: string;
  label: string | null;
  downloadable: boolean;
};

export default function DocumentViewerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [meta, setMeta] = useState<MediaMeta | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let revoked: string | null = null;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError("Connecte-toi pour ouvrir ce document.");
          return;
        }

        const headers = { Authorization: `Bearer ${session.access_token}` };

        const metaRes = await fetch(`/api/lesson-media/${id}?meta=1`, { headers });
        if (!metaRes.ok) {
          const body = await metaRes.json().catch(() => ({}));
          throw new Error(body.error || "Document introuvable.");
        }
        const metaJson = (await metaRes.json()) as MediaMeta;
        if (cancelled) return;
        setMeta({ ...metaJson, downloadable: metaJson.downloadable !== false });

        if (metaJson.type === "video_link") {
          throw new Error("Ce lien s'ouvre à l'extérieur de l'application.");
        }

        const fileRes = await fetch(`/api/lesson-media/${id}`, { headers });
        if (!fileRes.ok) {
          const body = await fileRes.json().catch(() => ({}));
          throw new Error(body.error || "Impossible de charger le fichier.");
        }

        const blob = await fileRes.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revoked = url;
        setBlobUrl(url);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur de chargement.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [id]);

  const canDownload = meta?.downloadable === true;

  const handleDownload = async () => {
    if (!id || !canDownload) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch(`/api/lesson-media/${id}?download=1`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = meta?.label || "document";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] flex flex-col" style={{ color: BLUE }}>
      <header className="shrink-0 border-b border-neutral-200 bg-white px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-orange-600"
        >
          <ArrowLeft size={14} /> Retour
        </button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText size={16} style={{ color: ORANGE }} className="shrink-0" />
          <h1 className="text-sm font-black truncate">
            {meta?.label || "Document"}
          </h1>
        </div>
        {canDownload && blobUrl && (
          <button
            type="button"
            onClick={() => void handleDownload()}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest text-white shrink-0"
            style={{ backgroundColor: ORANGE }}
          >
            <Download size={13} /> Télécharger
          </button>
        )}
        {meta && !canDownload && !loading && !error && (
          <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 shrink-0">
            Lecture seule
          </span>
        )}
      </header>

      <main className="flex-1 min-h-0 flex flex-col">
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-neutral-400">
            <Loader2 size={28} className="animate-spin" style={{ color: ORANGE }} />
            <p className="text-xs font-bold">Chargement du document…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm font-bold text-red-500">{error}</p>
            <button
              type="button"
              onClick={() => router.back()}
              className="mt-2 h-10 px-4 rounded-xl text-xs font-black uppercase tracking-widest text-white"
              style={{ backgroundColor: BLUE }}
            >
              Retour
            </button>
          </div>
        )}

        {!loading && !error && blobUrl && meta?.type === "pdf" && (
          <iframe
            title={meta.label || "PDF"}
            src={`${blobUrl}#toolbar=${canDownload ? 1 : 0}`}
            className="flex-1 w-full border-0 bg-neutral-200"
          />
        )}

        {!loading && !error && blobUrl && meta?.type === "video_upload" && (
          <div className="flex-1 flex items-center justify-center p-4 bg-black">
            <video
              src={blobUrl}
              controls
              controlsList={canDownload ? undefined : "nodownload"}
              className="max-w-full max-h-full rounded-lg"
              onContextMenu={canDownload ? undefined : (e) => e.preventDefault()}
            />
          </div>
        )}

        {!loading && !error && blobUrl && meta && meta.type !== "pdf" && meta.type !== "video_upload" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
            {canDownload ? (
              <>
                <p className="text-sm font-bold text-neutral-500">Fichier prêt.</p>
                <button
                  type="button"
                  onClick={() => void handleDownload()}
                  className="h-10 px-5 rounded-xl text-xs font-black uppercase tracking-widest text-white flex items-center gap-2"
                  style={{ backgroundColor: ORANGE }}
                >
                  <Download size={14} /> Télécharger
                </button>
              </>
            ) : (
              <p className="text-sm font-bold text-neutral-500 text-center">
                Ce cours n&apos;autorise pas le téléchargement. Ouvre le document depuis la leçon en lecture seule.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

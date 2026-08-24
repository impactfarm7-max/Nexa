"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Check, X, CalendarClock, ArrowRightLeft, CheckCircle2,
  Users, User, MapPin, RotateCcw, Ban, Video,
} from "lucide-react";
import { sessionStartMs, sessionEndMs, JOIN_BEFORE_MS } from "@/app/utils/collectiveLive";

const BLUE = "#11224E";
const ORANGE = "#eb670e";

export type TcfPlanningKind = "collective" | "individual";

type KanbanKey = "planifie" | "annule" | "reporte" | "bascule" | "realise";

const ALL_COLUMNS: { key: KanbanKey; label: string; color: string }[] = [
  { key: "planifie", label: "Planifié", color: "border-emerald-200 bg-emerald-50" },
  { key: "reporte", label: "Reporté", color: "border-amber-200 bg-amber-50" },
  { key: "bascule", label: "Basculé", color: "border-blue-200 bg-blue-50" },
  { key: "annule", label: "Annulé", color: "border-red-200 bg-red-50" },
  { key: "realise", label: "Réalisé", color: "border-neutral-200 bg-neutral-50" },
];

type PlanningItem = {
  id: string;
  kind: string;
  kanban: KanbanKey;
  student_name?: string;
  classroom_name?: string | null;
  title?: string;
  date: string;
  occurrence_date?: string;
  time?: string;
  start_time?: string;
  end_time?: string;
  note?: string | null;
  group_names?: string[];
  formateur?: string | null;
  room_name?: string | null;
  slot_id?: string;
  exception_id?: string | null;
  mode?: string;
  reason?: string | null;
  raw_status?: string;
};

const INDIVIDUAL_END_MS = 30 * 60 * 1000;

function isConfirmedIndividual(item: PlanningItem) {
  return item.raw_status === "confirmed" || item.raw_status === "confirme";
}

function individualSessionEndMs(item: PlanningItem) {
  const start = sessionStartMs(item.date, (item.time || "09:00").slice(0, 5));
  return start + INDIVIDUAL_END_MS;
}

function canJoinIndividualItem(item: PlanningItem) {
  if (!isConfirmedIndividual(item)) return false;
  const start = sessionStartMs(item.date, (item.time || "09:00").slice(0, 5));
  const now = Date.now();
  return now >= start - JOIN_BEFORE_MS && now <= start + INDIVIDUAL_END_MS;
}

function canJoinCollectiveItem(item: PlanningItem) {
  if (item.mode !== "en_ligne" || item.kanban !== "planifie" || !item.slot_id) return false;
  const start = sessionStartMs(item.date, (item.start_time || "09:00").slice(0, 5));
  const end = sessionEndMs(item.date, item.end_time || "10:00");
  const now = Date.now();
  return now >= start - JOIN_BEFORE_MS && now <= end;
}

function collectiveSessionEnded(item: PlanningItem) {
  return Date.now() > sessionEndMs(item.date, item.end_time || "10:00");
}

function JoinSessionButton({
  canJoin,
  ended,
  onJoin,
}: {
  canJoin: boolean;
  ended?: boolean;
  onJoin: () => void;
}) {
  if (ended) return null;
  return (
    <div className="mt-2 pt-2 border-t border-neutral-100" onClick={(e) => e.stopPropagation()}>
      {canJoin ? (
        <button
          type="button"
          onClick={onJoin}
          className="w-full py-1.5 rounded-lg bg-[#11224E] text-white text-[9px] font-black uppercase flex items-center justify-center gap-1 hover:bg-blue-900 transition-colors"
        >
          <Video size={10} /> Rejoindre
        </button>
      ) : (
        <p className="text-[8px] font-bold text-neutral-400 text-center py-1">S&apos;ouvre 15 min avant</p>
      )}
    </div>
  );
}

type Props = {
  kind: TcfPlanningKind;
  token: string;
};

export default function TcfPlanningBoard({ kind, token }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<PlanningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setJoinTick] = useState(0);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selected, setSelected] = useState<PlanningItem | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("10:00");
  const [rescheduleEndTime, setRescheduleEndTime] = useState("11:00");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [mergedSlotId, setMergedSlotId] = useState("");
  const [collectiveSlots, setCollectiveSlots] = useState<Array<{ id: string; label: string }>>([]);
  const [error, setError] = useState("");

  const columns = useMemo(
    () => (kind === "collective" ? ALL_COLUMNS.filter((c) => c.key !== "bascule") : ALL_COLUMNS),
    [kind]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const from = new Date().toISOString().slice(0, 10);
    const to = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
    const res = await fetch(`/api/centre/tcf-planning?kind=${kind}&from=${from}&to=${to}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (res.ok) setItems(json.items ?? []);
    setLoading(false);
  }, [kind, token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = setInterval(() => setJoinTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selected || kind !== "individual") return;
    (async () => {
      const from = new Date().toISOString().slice(0, 10);
      const to = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
      const res = await fetch(`/api/centre/tcf-planning?kind=collective&from=${from}&to=${to}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const opts = (json.items ?? [])
        .filter((i: PlanningItem) => i.kanban === "planifie" && i.slot_id)
        .map((i: PlanningItem) => ({
          id: i.slot_id as string,
          label: `${i.title} · ${i.date} ${i.start_time}–${i.end_time}`,
        }));
      setCollectiveSlots(opts);
    })();
  }, [selected, kind, token]);

  useEffect(() => {
    if (!selected || kind !== "collective") return;
    setRescheduleDate(selected.date);
    setRescheduleTime(selected.start_time || "10:00");
    setRescheduleEndTime(selected.end_time || "11:00");
    setRescheduleReason(selected.reason || "");
    setAdminNote("");
    setError("");
  }, [selected, kind]);

  const byColumn = useMemo(() => {
    const map: Record<KanbanKey, PlanningItem[]> = {
      planifie: [], annule: [], reporte: [], bascule: [], realise: [],
    };
    for (const item of items) {
      const key = (item.kanban in map ? item.kanban : "planifie") as KanbanKey;
      if (kind === "collective" && key === "bascule") {
        map.planifie.push(item);
      } else {
        map[key].push(item);
      }
    }
    return map;
  }, [items, kind]);

  const runAction = async (action: string) => {
    if (!selected) return;
    setActionId(selected.id);
    setError("");
    const res = await fetch("/api/centre/tcf-planning", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id: selected.id,
        kind,
        action,
        admin_note: adminNote.trim() || null,
        reschedule_date: rescheduleDate || null,
        reschedule_time: rescheduleTime || null,
        reschedule_end_time: rescheduleEndTime || null,
        reschedule_reason: rescheduleReason.trim() || null,
        merged_slot_id: mergedSlotId || null,
        exception_id: selected.exception_id || null,
      }),
    });
    const json = await res.json();
    setActionId(null);
    if (!res.ok) {
      setError(json.error || "Erreur.");
      return;
    }
    setSelected(null);
    setAdminNote("");
    setRescheduleDate("");
    setRescheduleReason("");
    setMergedSlotId("");
    await load();
  };

  const openItem = (item: PlanningItem) => setSelected(item);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-neutral-300" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[10px] text-neutral-400 font-medium">
        {kind === "collective"
          ? "Cliquez une carte pour annuler, reporter ou marquer une séance collective comme réalisée."
          : "Cliquez sur une demande au statut « Planifié » pour la confirmer, la refuser, la reporter ou la basculer. Vous pouvez aussi l’annuler ou la reporter après confirmation."}
      </p>

      <div
        className={`grid grid-cols-1 gap-3 min-h-[420px] ${
          kind === "collective" ? "md:grid-cols-4" : "md:grid-cols-5"
        }`}
      >
        {columns.map((col) => (
          <div key={col.key} className={`rounded-2xl border p-3 ${col.color}`}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: BLUE }}>
              {col.label}
              <span className="ml-1 text-neutral-400">({byColumn[col.key].length})</span>
            </p>
            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {byColumn[col.key].map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-neutral-200/80 shadow-sm hover:border-orange-300 transition-colors overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className="w-full text-left p-3 cursor-pointer"
                  >
                  {kind === "individual" ? (
                    <>
                      <p className="text-xs font-black" style={{ color: BLUE }}>{item.student_name}</p>
                      <p className="text-[10px] text-neutral-500 mt-1">
                        {item.date} · {(item.time || "").slice(0, 5)}
                      </p>
                      {item.classroom_name && (
                        <p className="text-[9px] font-bold mt-1 flex items-center gap-1" style={{ color: ORANGE }}>
                          <Users size={9} /> {item.classroom_name}
                        </p>
                      )}
                      {isConfirmedIndividual(item) && (
                        <span className="mt-1 inline-block text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Confirmée
                        </span>
                      )}
                      {item.note && <p className="text-[9px] text-neutral-400 mt-1 line-clamp-2">{item.note}</p>}
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-black" style={{ color: BLUE }}>{item.title}</p>
                      <p className="text-[10px] text-neutral-500 mt-1">
                        {item.date} · {item.start_time}–{item.end_time}
                      </p>
                      {item.formateur && (
                        <p className="text-[9px] text-neutral-400 mt-1 flex items-center gap-1">
                          <User size={9} /> {item.formateur}
                        </p>
                      )}
                      {item.group_names && item.group_names.length > 0 && (
                        <p className="text-[9px] font-bold mt-1 flex items-center gap-1" style={{ color: ORANGE }}>
                          <Users size={9} /> {item.group_names.join(", ")}
                        </p>
                      )}
                      {item.room_name && item.mode !== "en_ligne" && (
                        <p className="text-[9px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={9} /> {item.room_name}
                        </p>
                      )}
                      {item.mode === "en_ligne" && (
                        <p className="text-[9px] text-blue-500 mt-0.5">En ligne · Visio NEXA</p>
                      )}
                      {item.mode === "presentiel" && (
                        <p className="text-[9px] text-neutral-400 mt-0.5">Présentiel</p>
                      )}
                    </>
                  )}
                  </button>

                  {kind === "individual" && isConfirmedIndividual(item) && Date.now() <= individualSessionEndMs(item) && (
                    <div className="px-3 pb-3">
                      <JoinSessionButton
                        canJoin={canJoinIndividualItem(item)}
                        onJoin={() => router.push(`/dashboard/coaching/room/${item.id}`)}
                      />
                    </div>
                  )}

                  {kind === "collective" && item.kanban === "planifie" && item.mode === "en_ligne" && item.slot_id && !collectiveSessionEnded(item) && (
                    <div className="px-3 pb-3">
                      <JoinSessionButton
                        canJoin={canJoinCollectiveItem(item)}
                        onJoin={() => router.push(`/tcf-canada/live/room/${item.slot_id}?date=${item.date}`)}
                      />
                    </div>
                  )}
                </div>
              ))}
              {byColumn[col.key].length === 0 && (
                <p className="text-[10px] text-neutral-400 italic text-center py-6">—</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {selected && kind === "individual" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <ModalHeader
              title={selected.student_name || "Étudiant"}
              subtitle={`${selected.date} à ${(selected.time || "").slice(0, 5)}`}
              onClose={() => setSelected(null)}
            />

            {selected.classroom_name && (
              <p className="text-[11px] font-bold flex items-center gap-1.5 -mt-1" style={{ color: ORANGE }}>
                <Users size={12} /> Salle de classe : {selected.classroom_name}
              </p>
            )}

            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Message / motif (optionnel)"
              rows={2}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs outline-none resize-none"
            />

            {isConfirmedIndividual(selected) && Date.now() <= individualSessionEndMs(selected) && (
              <JoinSessionButton
                canJoin={canJoinIndividualItem(selected)}
                onJoin={() => router.push(`/dashboard/coaching/room/${selected.id}`)}
              />
            )}

            {selected.kanban === "planifie" && !isConfirmedIndividual(selected) && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <ActionBtn disabled={!!actionId} onClick={() => runAction("confirm")} color="emerald" icon={Check}>
                    Confirmer
                  </ActionBtn>
                  <ActionBtn disabled={!!actionId} onClick={() => runAction("refuse")} color="red" icon={X}>
                    Refuser
                  </ActionBtn>
                </div>

                <PostponeBlock
                  rescheduleDate={rescheduleDate}
                  rescheduleTime={rescheduleTime}
                  rescheduleReason={rescheduleReason}
                  onDate={setRescheduleDate}
                  onTime={setRescheduleTime}
                  onReason={setRescheduleReason}
                  onSubmit={() => runAction("postpone")}
                  disabled={!!actionId || !rescheduleDate}
                  loading={actionId === selected.id}
                />

                <div className="border-t border-neutral-100 pt-3 space-y-2">
                  <p className="text-[9px] font-black uppercase text-neutral-400 flex items-center gap-1">
                    <ArrowRightLeft size={10} /> Basculer vers séance collective
                  </p>
                  {collectiveSlots.length === 0 ? (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 font-medium">
                      Aucun coaching de groupe planifié. Créez-en un dans l&apos;onglet Coaching de groupe, puis revenez ici.
                    </p>
                  ) : (
                    <>
                      <select value={mergedSlotId} onChange={(e) => setMergedSlotId(e.target.value)} className="w-full h-9 rounded-lg border px-2 text-xs">
                        <option value="">Choisir un créneau collectif…</option>
                        {collectiveSlots.map((s) => (
                          <option key={`${s.id}-${s.label}`} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                      <button type="button" disabled={!!actionId || !mergedSlotId} onClick={() => runAction("bascule")} className="w-full h-9 rounded-lg text-[10px] font-black uppercase text-white disabled:opacity-50" style={{ backgroundColor: BLUE }}>
                        Basculer
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            {selected.kanban === "planifie" && isConfirmedIndividual(selected) && (
              <>
                <ActionBtn disabled={!!actionId} onClick={() => runAction("cancel")} color="red" icon={Ban}>
                  Annuler la séance
                </ActionBtn>

                <PostponeBlock
                  rescheduleDate={rescheduleDate}
                  rescheduleTime={rescheduleTime}
                  rescheduleReason={rescheduleReason}
                  onDate={setRescheduleDate}
                  onTime={setRescheduleTime}
                  onReason={setRescheduleReason}
                  onSubmit={() => runAction("postpone")}
                  disabled={!!actionId || !rescheduleDate}
                  loading={actionId === selected.id}
                />

                <div className="border-t border-neutral-100 pt-3 space-y-2">
                  <p className="text-[9px] font-black uppercase text-neutral-400 flex items-center gap-1">
                    <ArrowRightLeft size={10} /> Basculer vers séance collective
                  </p>
                  {collectiveSlots.length === 0 ? (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 font-medium">
                      Aucun coaching de groupe planifié. Créez-en un dans l&apos;onglet Coaching de groupe, puis revenez ici.
                    </p>
                  ) : (
                    <>
                      <select value={mergedSlotId} onChange={(e) => setMergedSlotId(e.target.value)} className="w-full h-9 rounded-lg border px-2 text-xs">
                        <option value="">Choisir un créneau collectif…</option>
                        {collectiveSlots.map((s) => (
                          <option key={`${s.id}-${s.label}`} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                      <button type="button" disabled={!!actionId || !mergedSlotId} onClick={() => runAction("bascule")} className="w-full h-9 rounded-lg text-[10px] font-black uppercase text-white disabled:opacity-50" style={{ backgroundColor: BLUE }}>
                        Basculer
                      </button>
                    </>
                  )}
                </div>

                <button type="button" disabled={!!actionId} onClick={() => runAction("complete")} className="w-full h-9 rounded-lg border border-neutral-200 text-[10px] font-black uppercase text-neutral-600 flex items-center justify-center gap-1">
                  <CheckCircle2 size={12} /> Marquer réalisée
                </button>
              </>
            )}

            {selected.kanban !== "planifie" && (
              <button type="button" disabled={!!actionId} onClick={() => runAction("restore")} className="w-full h-9 rounded-lg border border-emerald-200 bg-emerald-50 text-[10px] font-black uppercase text-emerald-700 flex items-center justify-center gap-1">
                <RotateCcw size={12} /> Rétablir en planifié
              </button>
            )}

            {error && <p className="text-xs font-bold text-red-500">{error}</p>}
          </div>
        </div>
      )}

      {selected && kind === "collective" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <ModalHeader
              title={selected.title || "Coaching de groupe"}
              subtitle={`${selected.date} · ${selected.start_time}–${selected.end_time}`}
              onClose={() => setSelected(null)}
            />

            {selected.reason && (
              <p className="text-xs text-neutral-500 bg-neutral-50 rounded-lg p-2 border border-neutral-100">
                Motif : {selected.reason}
              </p>
            )}

            {selected.kanban === "planifie" && selected.mode === "en_ligne" && selected.slot_id && !collectiveSessionEnded(selected) && (
              <JoinSessionButton
                canJoin={canJoinCollectiveItem(selected)}
                onJoin={() => router.push(`/tcf-canada/live/room/${selected.slot_id}?date=${selected.date}`)}
              />
            )}

            {selected.kanban === "planifie" && (
              <>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Motif (optionnel)"
                  rows={2}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs outline-none resize-none"
                />

                <ActionBtn disabled={!!actionId} onClick={() => runAction("cancel")} color="red" icon={Ban}>
                  Annuler la séance
                </ActionBtn>

                <PostponeBlock
                  rescheduleDate={rescheduleDate}
                  rescheduleTime={rescheduleTime}
                  rescheduleReason={rescheduleReason}
                  onDate={setRescheduleDate}
                  onTime={setRescheduleTime}
                  onReason={setRescheduleReason}
                  onSubmit={() => runAction("postpone")}
                  disabled={!!actionId || !rescheduleDate}
                  loading={actionId === selected.id}
                  showEndTime
                  endTime={rescheduleEndTime}
                  onEndTime={setRescheduleEndTime}
                />

                <ActionBtn disabled={!!actionId} onClick={() => runAction("complete")} color="neutral" icon={CheckCircle2}>
                  Marquer réalisée
                </ActionBtn>
              </>
            )}

            {selected.kanban !== "planifie" && (
              <ActionBtn disabled={!!actionId} onClick={() => runAction("restore")} color="emerald" icon={RotateCcw}>
                Rétablir en planifié
              </ActionBtn>
            )}

            {error && <p className="text-xs font-bold text-red-500">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-sm font-black" style={{ color: BLUE }}>{title}</p>
        <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>
      </div>
      <button type="button" onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-700">
        <X size={18} />
      </button>
    </div>
  );
}

function ActionBtn({
  children, onClick, disabled, color, icon: Icon,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  color: "emerald" | "red" | "neutral";
  icon: ComponentType<{ size?: number }>;
}) {
  const cls =
    color === "emerald" ? "bg-emerald-500 text-white"
    : color === "red" ? "bg-red-500 text-white"
    : "border border-neutral-200 text-neutral-600 bg-white";
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`w-full h-10 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 disabled:opacity-50 ${cls}`}>
      <Icon size={12} /> {children}
    </button>
  );
}

function PostponeBlock({
  rescheduleDate, rescheduleTime, rescheduleReason, endTime,
  onDate, onTime, onReason, onEndTime, onSubmit, disabled, loading, showEndTime,
}: {
  rescheduleDate: string;
  rescheduleTime: string;
  rescheduleReason: string;
  endTime?: string;
  onDate: (v: string) => void;
  onTime: (v: string) => void;
  onReason: (v: string) => void;
  onEndTime?: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  loading?: boolean;
  showEndTime?: boolean;
}) {
  return (
    <div className="border-t border-neutral-100 pt-3 space-y-2">
      <p className="text-[9px] font-black uppercase text-neutral-400 flex items-center gap-1">
        <CalendarClock size={10} /> Reporter
      </p>
      <div className="flex gap-2">
        <input type="date" value={rescheduleDate} onChange={(e) => onDate(e.target.value)} className="flex-1 h-9 rounded-lg border px-2 text-xs" />
        <input type="time" value={rescheduleTime} onChange={(e) => onTime(e.target.value)} className="w-24 h-9 rounded-lg border px-2 text-xs" />
        {showEndTime && onEndTime && (
          <input type="time" value={endTime} onChange={(e) => onEndTime(e.target.value)} className="w-24 h-9 rounded-lg border px-2 text-xs" title="Heure de fin" />
        )}
      </div>
      <input value={rescheduleReason} onChange={(e) => onReason(e.target.value)} placeholder="Motif du report" className="w-full h-9 rounded-lg border px-3 text-xs" />
      <button type="button" disabled={disabled} onClick={onSubmit} className="w-full h-9 rounded-lg text-[10px] font-black uppercase text-white disabled:opacity-50" style={{ backgroundColor: ORANGE }}>
        {loading ? "..." : "Reporter la séance"}
      </button>
    </div>
  );
}

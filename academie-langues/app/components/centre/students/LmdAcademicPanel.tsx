"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/app/utils/supabase";
import { useI18n } from "@/app/i18n/I18nProvider";
import { emptyAcademicCase, type AcademicCase } from "@/app/utils/lmd-academic";
import type { loadLmdProgress } from "@/app/utils/lmd-progress.server";

type Diploma = { number: string; issuedAt: string; studentName: string; matricule: string | null; centerName: string; programName: string; degree: string; acquiredCredits: number; totalCredits: number; thesisTitle: string | null; defenseDate: string | null };
type Payload = {
  progress: NonNullable<Awaited<ReturnType<typeof loadLmdProgress>>>;
  record: { revision: number; dossier: AcademicCase; diploma: Diploma | null } | null;
  groups: { id: string; nom: string; semestre_id: string | null }[];
  events: { action: string; revision: number; created_at: string }[];
  migrationRequired: boolean;
  canManage: boolean;
  blockers: string[];
  optionalUes?: { id: string; name: string; credits: number }[];
  selectedUeIds?: string[];
};
const input = "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm disabled:opacity-60";
const button = "rounded-lg bg-[#11224E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40";

export default function LmdAcademicPanel({ enrollmentId, onChanged }: { enrollmentId: string; onChanged: () => void }) {
  const { locale } = useI18n();
  const en = locale === "en";
  const activeEnrollment = useRef(enrollmentId);
  activeEnrollment.current = enrollmentId;
  const [data, setData] = useState<Payload | null>(null);
  const [dossier, setDossier] = useState<AcademicCase>(emptyAcademicCase);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [semester, setSemester] = useState("");
  const [group, setGroup] = useState("");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [selectedOptionalIds, setSelectedOptionalIds] = useState<string[]>([]);
  const headers = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error(en ? "Session expired." : "Session expirée.");
    return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
  };
  const load = useCallback(async () => {
    const response = await fetch(`/api/centre/lmd?enrollment_id=${encodeURIComponent(enrollmentId)}`, { headers: await headers() });
    const result = await response.json();
    if (activeEnrollment.current !== enrollmentId) return;
    if (response.status === 400 || response.status === 403) { setData(null); return; }
    if (!response.ok) throw new Error(result.error);
    if (!result.progress) { setData(null); return; }
    setData(result);
    setDossier(result.record?.dossier || emptyAcademicCase);
    setSemester(result.progress.source.semestre_id || "");
    setGroup(result.progress.source.groupe_id || "");
    setSelectedOptionalIds(result.selectedUeIds || []);
    setConfirmIssue(false);
    // Session is resolved on every request; locale does not change the data scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollmentId]);
  useEffect(() => { setData(null); setError(""); void load().catch(e => setError(e.message)); }, [load]);

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/centre/lmd", { method: "POST", headers: await headers(), body: JSON.stringify({ enrollment_id: enrollmentId, action, revision: data?.record?.revision || 0, dossier, ...extra }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await load();
      setMessage(en ? "Saved." : "Enregistré.");
      if (action === "semester" || action === "recover" || action === "ue_choices") onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur"); }
    finally { setBusy(false); }
  };
  const download = async () => {
    const diploma = data?.record?.diploma;
    if (!diploma) return;
    setBusy(true); setError("");
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      pdf.setDrawColor(17, 34, 78); pdf.setLineWidth(0.7); pdf.rect(12, 12, 273, 186);
      const center = (text: string, y: number, size: number) => { pdf.setFontSize(size); pdf.text(pdf.splitTextToSize(text, 245), 148.5, y, { align: "center" }); };
      center(diploma.centerName, 32, 20);
      center(`${en ? "DIPLOMA" : "DIPLÔME"} — ${diploma.degree.toUpperCase()}`, 52, 24);
      center(diploma.programName, 68, 15);
      center(en ? "Awarded to" : "Décerné à", 86, 11);
      center(diploma.studentName, 101, 23);
      center(`${en ? "Student ID" : "Matricule"} : ${diploma.matricule || "—"}`, 113, 11);
      if (diploma.thesisTitle) center(`${en ? "Thesis" : "Thèse"} : ${diploma.thesisTitle}`, 129, 11);
      center(`${diploma.acquiredCredits}/${diploma.totalCredits} ${en ? "credits" : "crédits"}`, 153, 12);
      center(`${en ? "Issued on" : "Délivré le"} ${new Date(diploma.issuedAt).toLocaleDateString(en ? "en-GB" : "fr-FR")}`, 166, 10);
      center(diploma.number, 182, 8);
      pdf.save(`${diploma.number}.pdf`);
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur PDF"); }
    finally { setBusy(false); }
  };
  if (!data || data.progress.source.id !== enrollmentId) return error ? <p role="alert" className="py-4 text-red-700">{error}</p> : null;
  const locked = busy || !data.canManage || !!data.record?.diploma;
  return <section className="space-y-5 rounded-xl border border-neutral-200 bg-neutral-50 p-5 my-6">
    <div><h2 className="text-xl font-bold text-[#11224E]">{en ? "LMD academic record" : "Parcours LMD et diplôme"}</h2>
      <p className="text-sm text-neutral-600">{en ? "Program credits" : "Crédits du parcours"} : <strong>{data.progress.acquiredCredits}/{data.progress.totalCredits}</strong> · {data.progress.pendingCount} {en ? "UE awaiting assessment" : "UE à évaluer"}</p>
    </div>
    {data.progress.unconfiguredCount > 0 && <p className="text-sm text-amber-800">{en ? "Some UE have no credit allocation. Complete the program setup before issuing a diploma." : "Certaines UE n'ont pas de crédits renseignés. Complétez le programme avant de délivrer un diplôme."}</p>}
    <details className="rounded-lg border bg-white p-3"><summary className="cursor-pointer font-semibold">{en ? "UE results by semester" : "Bilan des UE par semestre"}</summary>
      <div className="overflow-x-auto mt-3"><table className="w-full text-sm"><thead><tr className="text-left"><th>UE</th><th>{en ? "Semester" : "Semestre"}</th><th>{en ? "Credits" : "Crédits"}</th><th>{en ? "Status" : "Statut"}</th></tr></thead><tbody>
        {data.progress.results.map(ue => <tr key={ue.id} className="border-t"><td className="py-2">{ue.name}</td><td>{data.progress.semesters.find(s => s.id === ue.semestre_id)?.nom || data.progress.semesters.find(s => s.id === ue.semestre_id)?.ordre}</td><td>{ue.validated ? ue.credits : 0}/{ue.credits}</td><td>{ue.validated ? (en ? "Validated" : "Validée") : ue.debt ? (en ? "Debt" : "Dette") : ue.assessed ? (en ? "Failed" : "Non validée") : (en ? "Awaiting assessment" : "À évaluer")}</td></tr>)}
      </tbody></table></div>
    </details>
    {data.canManage && <div className="space-y-2">
      <h3 className="font-semibold">{en ? "Change semester within this level" : "Changer de semestre dans ce niveau"}</h3>
      <p className="text-xs text-neutral-500">{en ? "The annual enrollment and tuition stay the same. Outstanding UE remain visible." : "L'inscription annuelle et les frais sont conservés. Les UE en dette restent visibles."}</p>
      <div className="flex flex-wrap gap-2">
        <select aria-label={en ? "Semester" : "Semestre"} className={`${input} flex-1`} value={semester} disabled={busy} onChange={e => { setSemester(e.target.value); setGroup(""); }}><option value="">—</option>{data.progress.semesters.filter(s => s.niveau_id === data.progress.source.niveau_id).sort((a,b) => a.ordre-b.ordre).map(s => <option key={s.id} value={s.id}>{s.nom || `${en ? "Semester" : "Semestre"} ${s.ordre}`}</option>)}</select>
        <select aria-label={en ? "Cohort" : "Promotion"} className={`${input} flex-1`} disabled={busy} value={group} onChange={e => setGroup(e.target.value)}><option value="">{en ? "No cohort assigned" : "Sans promotion attribuée"}</option>{data.groups.filter(g => g.semestre_id === semester).map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}</select>
        <button type="button" className={button} disabled={busy || !semester} onClick={() => void act("semester", { semestre_id: semester, groupe_id: group })}>{en ? "Confirm semester" : "Confirmer le semestre"}</button>
      </div>
    </div>}
    {data.canManage && (data.optionalUes?.length ?? 0) > 0 && (
      <div className="space-y-2">
        <h3 className="font-semibold">{en ? "Optional course units (this semester)" : "UE optionnelles (ce semestre)"}</h3>
        <p className="text-xs text-neutral-500">
          {en
            ? "Compulsory units are automatic. Tick the optional units this student takes."
            : "Les UE obligatoires sont automatiques. Cochez les UE optionnelles suivies par cet étudiant."}
        </p>
        <ul className="space-y-1.5 rounded-lg border bg-white p-3">
          {(data.optionalUes || []).map((ue) => {
            const checked = selectedOptionalIds.includes(ue.id);
            return (
              <li key={ue.id}>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={checked}
                    onChange={() => {
                      setSelectedOptionalIds((prev) =>
                        checked ? prev.filter((id) => id !== ue.id) : [...prev, ue.id],
                      );
                    }}
                  />
                  <span className="flex-1">{ue.name}</span>
                  <span className="text-neutral-400">{ue.credits} cr.</span>
                </label>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className={button}
          disabled={busy}
          onClick={() => void act("ue_choices", { ue_ids: selectedOptionalIds })}
        >
          {en ? "Save optional units" : "Enregistrer les UE optionnelles"}
        </button>
      </div>
    )}
    {data.progress.debts.length > 0 && <div className="space-y-2"><h3 className="font-semibold">{en ? "Outstanding UE" : "UE en dette"}</h3>
      {data.progress.debts.map(ue => <div key={ue.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-3"><span className="flex-1 text-sm">{ue.name} · {ue.credits} cr.</span>{data.canManage && <>
        <input aria-label={`${en ? "Recovery grade" : "Note de rattrapage"} ${ue.name}`} className={`${input} max-w-24`} type="number" min="0" max={ue.max_score} step="0.25" placeholder={`/${ue.max_score}`} disabled={busy} value={scores[ue.id] || ""} onChange={e => setScores({ ...scores, [ue.id]: e.target.value })}/>
        <button type="button" className={button} disabled={busy || data.migrationRequired || !scores[ue.id]?.trim()} onClick={() => void act("recover", { ue_id: ue.id, score: Number(scores[ue.id]) })}>{en ? "Save recovery" : "Enregistrer le rattrapage"}</button>
      </>}</div>)}
    </div>}
    {data.migrationRequired ? <p className="text-sm text-amber-800">{en ? "The doctoral record and diploma service still need to be activated for this installation." : "Le dossier doctoral et la délivrance des diplômes doivent encore être activés sur cette installation."}</p> : <>
      <div className="space-y-3 border-t pt-4">
        <label className="block text-sm font-semibold">{en ? "Target diploma" : "Diplôme préparé"}<select className={input} disabled={locked} value={dossier.degree} onChange={e => setDossier({ ...dossier, degree: e.target.value as AcademicCase["degree"] })}><option value="licence">Licence</option><option value="master">Master</option><option value="doctorat">{en ? "Doctorate" : "Doctorat"}</option></select></label>
        {dossier.degree === "doctorat" && <>
          <label className="block text-sm">{en ? "Thesis topic" : "Sujet de thèse"}<input className={input} maxLength={500} disabled={locked} value={dossier.thesisTitle} onChange={e => setDossier({ ...dossier, thesisTitle: e.target.value })}/></label>
          <label className="block text-sm">{en ? "Supervisor" : "Directeur de thèse"}<input className={input} maxLength={300} disabled={locked} value={dossier.supervisor} onChange={e => setDossier({ ...dossier, supervisor: e.target.value })}/></label>
          <h3 className="font-semibold">{en ? "Research milestones" : "Étapes du suivi doctoral"}</h3>
          {dossier.milestones.map((m, i) => <fieldset key={i} disabled={locked} className="space-y-2 rounded-lg border p-3"><legend className="text-sm">{en ? "Milestone" : "Étape"} {i+1}</legend>
            <input aria-label={en ? "Milestone title" : "Intitulé de l'étape"} className={input} maxLength={300} value={m.title} onChange={e => setDossier({ ...dossier, milestones: dossier.milestones.map((v,n) => n===i ? {...v,title:e.target.value}:v) })}/>
            <input aria-label={en ? "Milestone date" : "Date de l'étape"} type="date" className={input} value={m.date} onChange={e => setDossier({ ...dossier, milestones: dossier.milestones.map((v,n) => n===i ? {...v,date:e.target.value}:v) })}/>
            <textarea aria-label={en ? "Progress report" : "Compte rendu"} className={input} maxLength={3000} value={m.report} onChange={e => setDossier({ ...dossier, milestones: dossier.milestones.map((v,n) => n===i ? {...v,report:e.target.value}:v) })}/>
            <label className="text-sm"><input type="checkbox" checked={m.completed} onChange={e => setDossier({ ...dossier, milestones: dossier.milestones.map((v,n) => n===i ? {...v,completed:e.target.checked}:v) })}/> {en ? "Milestone validated" : "Étape validée"}</label>
            <button type="button" className="ml-3 text-sm text-red-700" onClick={() => setDossier({ ...dossier, milestones: dossier.milestones.filter((_,n) => n!==i) })}>{en ? "Remove" : "Retirer"}</button>
          </fieldset>)}
          <button type="button" className={button} disabled={locked || dossier.milestones.length >= 50} onClick={() => setDossier({ ...dossier, milestones: [...dossier.milestones, {title:"",date:"",report:"",completed:false}] })}>{en ? "Add milestone" : "Ajouter une étape"}</button>
          <label className="block text-sm">{en ? "Defense date" : "Date de soutenance"}<input type="date" className={input} disabled={locked} value={dossier.defenseDate} onChange={e => setDossier({ ...dossier, defenseDate:e.target.value })}/></label>
          <label className="block text-sm">{en ? "Jury members and roles" : "Membres et rôles du jury"}<textarea className={input} maxLength={2000} disabled={locked} value={dossier.jury} onChange={e => setDossier({ ...dossier, jury:e.target.value })}/></label>
          <label className="block text-sm">{en ? "Jury decision" : "Décision du jury"}<select className={input} disabled={locked} value={dossier.juryDecision} onChange={e => setDossier({ ...dossier, juryDecision:e.target.value as AcademicCase["juryDecision"] })}><option value="pending">{en ? "Pending" : "En attente"}</option><option value="accepted">{en ? "Accepted" : "Favorable"}</option><option value="revisions">{en ? "Revisions required" : "Corrections demandées"}</option><option value="rejected">{en ? "Rejected" : "Défavorable"}</option></select></label>
          <label className="block text-sm">{en ? "Minutes and reasons" : "Procès-verbal et motifs"}<textarea className={input} rows={5} maxLength={10000} disabled={locked} value={dossier.minutes} onChange={e => setDossier({ ...dossier, minutes:e.target.value })}/></label>
        </>}
        {data.canManage && !data.record?.diploma && <button type="button" className={button} disabled={busy} onClick={() => void act("save")}>{en ? "Save academic record" : "Enregistrer le dossier"}</button>}
      </div>
      {data.record?.diploma ? <div className="space-y-2 rounded-lg bg-emerald-50 p-4"><p className="font-semibold">{en ? "Diploma issued" : "Diplôme délivré"}</p><p className="break-all text-xs">{data.record.diploma.number}</p><button type="button" className={button} disabled={busy} onClick={() => void download()}>{en ? "Download diploma (PDF)" : "Télécharger le diplôme (PDF)"}</button></div> : data.canManage && <div className="space-y-2 border-t pt-3">
        <p className="text-sm">{en ? "Issuance checks the credits and doctoral requirements, then freezes the academic record." : "La délivrance vérifie les crédits et les exigences doctorales, puis fige le dossier."}</p>
        <label className="block text-sm"><input type="checkbox" checked={confirmIssue} disabled={busy} onChange={e => setConfirmIssue(e.target.checked)}/> {en ? "I validate this record and authorize issuance of the diploma." : "Je valide ce dossier et j'autorise la délivrance du diplôme."}</label>
        <button type="button" className={button} disabled={busy || !confirmIssue} onClick={() => void act("issue", { confirm: true })}>{en ? "Issue diploma" : "Délivrer le diplôme"}</button>
      </div>}
      {data.events.length > 0 && <details className="text-sm"><summary className="cursor-pointer">{en ? "Record history" : "Historique du dossier"}</summary>{data.events.map(event => <p key={event.revision}>{new Date(event.created_at).toLocaleString(en ? "en-GB" : "fr-FR")} · v{event.revision} · {event.action === "issue" ? (en ? "Diploma issued" : "Diplôme délivré") : (en ? "Record saved" : "Dossier enregistré")}</p>)}</details>}
    </>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}

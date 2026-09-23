import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/app/utils/center-auth-server";

export type GradeAuditAction =
  | "create"
  | "update"
  | "delete"
  | "validate_session"
  | "reopen_session"
  | "import";

export type GradeAuditSnapshot = {
  score?: number | null;
  max_score?: number | null;
  title?: string | null;
  status?: string | null;
};

export type GradeAuditEventInput = {
  center_id: string;
  actor_id: string;
  action: GradeAuditAction;
  grade_id?: string | null;
  enrollment_id?: string | null;
  filiere_matiere_id?: string | null;
  period_id?: string | null;
  groupe_id?: string | null;
  batch_id?: string | null;
  before?: GradeAuditSnapshot | null;
  after?: GradeAuditSnapshot | null;
  meta?: Record<string, unknown>;
};

/** Insert append-only audit rows. Ignores failures if table missing (503 path handled by caller separately). */
export async function insertGradeAuditEvents(
  events: GradeAuditEventInput[],
): Promise<{ ok: boolean; missingTable?: boolean; error?: string }> {
  if (!events.length) return { ok: true };
  const rows = events.map((e) => ({
    center_id: e.center_id,
    actor_id: e.actor_id,
    action: e.action,
    grade_id: e.grade_id ?? null,
    enrollment_id: e.enrollment_id ?? null,
    filiere_matiere_id: e.filiere_matiere_id ?? null,
    period_id: e.period_id ?? null,
    groupe_id: e.groupe_id ?? null,
    batch_id: e.batch_id ?? null,
    before: e.before ?? null,
    after: e.after ?? null,
    meta: e.meta ?? {},
  }));
  const { error } = await supabaseAdmin.from("grade_audit_events").insert(rows);
  if (!error) return { ok: true };
  if (["42P01", "PGRST205"].includes(error.code || "") || /grade_audit_events/i.test(error.message || "")) {
    return { ok: false, missingTable: true, error: error.message };
  }
  console.error("[grade_audit_events]", error.message);
  return { ok: false, error: error.message };
}

export function newGradeAuditBatchId(): string {
  return randomUUID();
}

export function snapshotFromGrade(row: {
  score?: number | null;
  max_score?: number | null;
  title?: string | null;
  status?: string | null;
}): GradeAuditSnapshot {
  return {
    score: row.score ?? null,
    max_score: row.max_score ?? null,
    title: row.title ?? null,
    status: row.status ?? null,
  };
}

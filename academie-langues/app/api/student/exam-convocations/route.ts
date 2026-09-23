import { NextResponse } from "next/server";
import { getAuthUser } from "@/app/utils/auth-server";
import { supabaseAdmin } from "@/app/utils/center-auth-server";
import { fetchDocumentExportConfig, filterSignatures } from "@/app/utils/documentConfig";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return fail("Non autorisé.", 401);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, prenom, nom, matricule, center_id, role")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.center_id || profile.role !== "student") {
      return NextResponse.json({ convocations: [] });
    }

    const { data: center } = await supabaseAdmin
      .from("centers")
      .select("name, center_type")
      .eq("id", profile.center_id)
      .maybeSingle();
    if (center?.center_type !== "universite") {
      return NextResponse.json({ convocations: [] });
    }

    const { data: assignments, error } = await supabaseAdmin
      .from("exam_convocation_assignments")
      .select("id, status, convocation_id, exam_convocations(*)")
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    if (error) {
      if (["42P01", "PGRST205"].includes(error.code)) return NextResponse.json({ convocations: [] });
      throw error;
    }

    const rows = (assignments ?? [])
      .map((a) => {
        const c = a.exam_convocations as unknown as {
          id: string;
          epreuve_label: string;
          scheduled_at: string;
          duration_minutes: number | null;
          room_name: string;
          instructions: string | null;
          status: string;
        } | null;
        if (!c || c.status !== "published") return null;
        return {
          assignmentId: a.id,
          status: a.status,
          id: c.id,
          epreuveLabel: c.epreuve_label,
          scheduledAt: c.scheduled_at,
          durationMinutes: c.duration_minutes,
          roomName: c.room_name,
          instructions: c.instructions,
        };
      })
      .filter(Boolean);

    const [docConfig, { data: sigRows }, { data: branding }] = await Promise.all([
      fetchDocumentExportConfig(supabaseAdmin, profile.center_id, { documentType: "convocation" }),
      supabaseAdmin
        .from("bulletin_signatures")
        .select("id, name, title, signature_url")
        .eq("center_id", profile.center_id)
        .order("display_order"),
      supabaseAdmin.from("center_branding").select("stamp_url").eq("center_id", profile.center_id).maybeSingle(),
    ]);

    // Fallback title if centre n'a pas encore configuré le type convocation
    if (!docConfig.title || docConfig.title === "Document officiel") {
      docConfig.title = "Convocation d'examen";
    }
    if (!docConfig.legalName) {
      docConfig.legalName = center.name;
    }

    const signatures = filterSignatures(sigRows || [], docConfig.signatureIds);

    return NextResponse.json({
      convocations: rows,
      studentName: `${profile.prenom || ""} ${profile.nom || ""}`.trim(),
      matricule: profile.matricule,
      centerName: center.name,
      docConfig,
      signatures,
      stampUrl: branding?.stamp_url || null,
    });
  } catch (e) {
    console.error("[student/exam-convocations]", e);
    return fail("Impossible de charger les convocations.", 500);
  }
}

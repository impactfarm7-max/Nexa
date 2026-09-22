import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { loadLmdProgress } from "@/app/utils/lmd-progress.server";
import { resolveLmdValidationThreshold } from "@/app/utils/lmd-credits";
import { fetchDocumentExportConfig, filterSignatures } from "@/app/utils/documentConfig";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return fail("Non autorise.", 401);
    const locale = new URL(req.url).searchParams.get("locale") === "en" ? "en" : "fr";

    const { data: enrollment, error: enrollError } = await supabaseAdmin
      .from("enrollments")
      .select("id, filiere_id, niveau_id, semestre_id, status, filieres!inner(center_id, type, name)")
      .eq("student_id", user.id)
      .in("status", ["active", "completed"])
      .order("enrolled_at", { ascending: false });
    if (enrollError) throw enrollError;

    const cursus = (enrollment || []).find((e) => {
      const filiere = e.filieres as unknown as { type: string } | null;
      return filiere?.type === "cursus";
    });
    if (!cursus) return NextResponse.json({ progress: null });

    const program = cursus.filieres as unknown as { center_id: string; type: string; name: string };
    const { data: center, error: centerError } = await supabaseAdmin
      .from("centers")
      .select("name, center_type, lmd_validation_threshold_pct")
      .eq("id", program.center_id)
      .single();
    if (centerError) throw centerError;
    if (center.center_type !== "universite") return NextResponse.json({ progress: null });

    const progress = await loadLmdProgress(supabaseAdmin, cursus.id, resolveLmdValidationThreshold(center.lmd_validation_threshold_pct));
    if (!progress) return NextResponse.json({ progress: null });

    const { data: niveaux, error: niveauxError } = await supabaseAdmin
      .from("niveaux")
      .select("id, annee")
      .eq("filiere_id", cursus.filiere_id);
    if (niveauxError) throw niveauxError;

    const { data: record, error: recordError } = await supabaseAdmin
      .from("lmd_academic_records")
      .select("diploma")
      .eq("student_id", user.id)
      .eq("filiere_id", cursus.filiere_id)
      .maybeSingle();
    const migrationRequired = !!recordError && ["42P01", "PGRST205"].includes(recordError.code);
    if (recordError && !migrationRequired) throw recordError;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("prenom, nom, matricule")
      .eq("id", user.id)
      .single();
    if (profileError) throw profileError;

    const [releveConfig, attestationConfig, { data: sigRows }, { data: branding }] = await Promise.all([
      fetchDocumentExportConfig(supabaseAdmin, program.center_id, { documentType: "bulletin" }),
      fetchDocumentExportConfig(supabaseAdmin, program.center_id, { documentType: "attestation" }),
      supabaseAdmin.from("bulletin_signatures").select("id, name, title, signature_url").eq("center_id", program.center_id).order("display_order"),
      supabaseAdmin.from("center_branding").select("stamp_url").eq("center_id", program.center_id).maybeSingle(),
    ]);
    const releveSignatures = filterSignatures(sigRows || [], releveConfig.signatureIds, locale);
    const attestationSignatures = filterSignatures(sigRows || [], attestationConfig.signatureIds, locale);

    return NextResponse.json({
      progress,
      niveaux: niveaux || [],
      currentNiveauId: cursus.niveau_id || null,
      currentSemestreId: cursus.semestre_id || null,
      diploma: record?.diploma || null,
      studentName: `${profile.prenom || ""} ${profile.nom || ""}`.trim(),
      matricule: profile.matricule,
      centerName: center.name,
      programName: program.name,
      releveConfig,
      releveSignatures,
      attestationConfig,
      attestationSignatures,
      stampUrl: branding?.stamp_url || null,
    });
  } catch (e) {
    console.error("[student/lmd-progress]", e);
    return fail("Impossible de charger le parcours LMD.", 500);
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import {
  TCF_COURSE_DISCIPLINE_CODES,
  TCF_NEUTRAL_DISCIPLINE,
  TCF_TEACHING_SUBJECTS,
} from "@/app/data/tcf-teaching-subjects";

const TCF_SUBJECT_ORDER = [
  ...TCF_TEACHING_SUBJECTS.map((s) => s.key),
  TCF_NEUTRAL_DISCIPLINE.code,
];

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STAFF_ROLES = ["center_manager", "campus_manager", "trainer", "staff"];

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("center_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.center_id || !STAFF_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { data: center } = await supabaseAdmin
    .from("centers")
    .select("center_type")
    .eq("id", profile.center_id)
    .maybeSingle();

  if (center?.center_type !== "tcf_canada") {
    return NextResponse.json({ error: "Centre non TCF." }, { status: 400 });
  }

  let { data: filiere } = await supabaseAdmin
    .from("filieres")
    .select("id")
    .eq("center_id", profile.center_id)
    .eq("name", "TCF Canada")
    .maybeSingle();

  if (!filiere) {
    const { data: created, error } = await supabaseAdmin
      .from("filieres")
      .insert({
        center_id: profile.center_id,
        created_by: user.id,
        name: "TCF Canada",
        type: "formation_courte",
        mode: "presentiel",
        discipline_type: "tcf_canada",
        duree_valeur: 3,
        duree_unite: "mois",
        status: "draft",
      })
      .select("id")
      .single();
    if (error || !created) {
      return NextResponse.json({ error: error?.message || "Filière TCF introuvable." }, { status: 500 });
    }
    filiere = created;
  }

  const tcfCodes = [...TCF_COURSE_DISCIPLINE_CODES];
  const { data: disciplines } = await supabaseAdmin
    .from("exam_disciplines")
    .select("id, name, code")
    .in("code", tcfCodes);

  const discByCode = new Map((disciplines ?? []).map((d) => [d.code, d]));

  const { data: existingFm } = await supabaseAdmin
    .from("filiere_matieres")
    .select("id, discipline_id, exam_disciplines(code, name)")
    .eq("filiere_id", filiere.id);

  const existingDiscIds = new Set((existingFm ?? []).map((fm) => fm.discipline_id));

  for (const code of tcfCodes) {
    const disc = discByCode.get(code);
    if (!disc || existingDiscIds.has(disc.id)) continue;
    await supabaseAdmin.from("filiere_matieres").insert({
      filiere_id: filiere.id,
      discipline_id: disc.id,
      niveau_id: null,
      annee: 1,
      obligatoire: true,
    });
  }

  const { data: allFm } = await supabaseAdmin
    .from("filiere_matieres")
    .select("id, discipline_id, filiere_id, niveau_id, exam_disciplines(name, code), filieres(name), niveaux(annee)")
    .eq("filiere_id", filiere.id);

  let trainerSubjectKeys: string[] | null = null;
  if (profile.role === "trainer") {
    const { data: tcfSubs } = await supabaseAdmin
      .from("staff_tcf_subjects")
      .select("subject_key")
      .eq("profile_id", user.id);
    trainerSubjectKeys = (tcfSubs ?? []).map((s) => s.subject_key);
  }

  const subjects = (allFm ?? [])
    .filter((fm: any) => {
      const code = fm.exam_disciplines?.code;
      if (!tcfCodes.includes(code)) return false;
      if (trainerSubjectKeys && trainerSubjectKeys.length > 0 && !trainerSubjectKeys.includes(code)) return false;
      return true;
    })
    .map((fm: any) => ({
      filiere_matiere_id: fm.id,
      discipline_name: fm.exam_disciplines?.name || "—",
      discipline_code: fm.exam_disciplines?.code || "",
      filiere_name: fm.filieres?.name || "TCF Canada",
      niveau_annee: fm.niveaux?.annee || fm.annee || null,
      filiere_id: fm.filiere_id,
      niveau_id: fm.niveau_id || null,
    }))
    .sort((a, b) => {
      const ai = TCF_SUBJECT_ORDER.indexOf(a.discipline_code);
      const bi = TCF_SUBJECT_ORDER.indexOf(b.discipline_code);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

  return NextResponse.json({ filiere_id: filiere.id, subjects });
}

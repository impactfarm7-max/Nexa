import { NextResponse } from "next/server";
import { getCenterStaffContext, supabaseAdmin } from "@/app/utils/center-auth-server";

type EnrollRow = {
  id: string;
  student_id: string;
  status: string | null;
  filiere_id: string;
  niveau_id: string | null;
  groupe_id: string | null;
  tuition_fee: number | null;
  enrolled_at: string | null;
  duration_value: number | null;
  duration_unit: string | null;
  duration_months: number | null;
  academic_year: string | null;
  passage_decision: string | null;
  passage_reason: string | null;
  filieres: { name?: string; type?: string; duree_valeur?: number | null; duree_unite?: string | null } | null;
  niveaux: { annee?: number; mois?: number; semaines?: number; jours?: number } | null;
  groupes: { nom?: string } | null;
};

function shortDurationLabel(e: EnrollRow): string {
  if (e.duration_months) return `${e.duration_months} mois`;
  if (e.duration_value && e.duration_unit) {
    if (e.duration_unit === "month") return `${e.duration_value} mois`;
    if (e.duration_unit === "week") return `${e.duration_value} sem.`;
    if (e.duration_unit === "day") return `${e.duration_value} j`;
  }
  const f = e.filieres;
  if (f?.duree_valeur && f?.duree_unite) {
    if (f.duree_unite === "mois") return `${f.duree_valeur} mois`;
    if (f.duree_unite === "semaines") return `${f.duree_valeur} sem.`;
    if (f.duree_unite === "jours") return `${f.duree_valeur} j`;
  }
  const niv = e.niveaux;
  if (niv && !niv.annee) {
    if (niv.mois) return `${niv.mois} mois`;
    if (niv.semaines) return `${niv.semaines} sem.`;
    if (niv.jours) return `${niv.jours} j`;
  }
  return "";
}

export async function GET(req: Request) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;

  type ProfileRow = {
    id: string;
    prenom: string | null;
    nom: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    center_status: string | null;
    birth_date?: string | null;
    genre?: string | null;
  };

  const profilesRes = await supabaseAdmin
    .from("profiles")
    .select("id, prenom, nom, email, phone, avatar_url, center_status, birth_date, genre")
    .eq("center_id", ctx!.centerId)
    .eq("role", "student")
    .order("nom");

  let profileRows: ProfileRow[];
  if (profilesRes.error && /birth_date|genre/i.test(profilesRes.error.message)) {
    const fallback = await supabaseAdmin
      .from("profiles")
      .select("id, prenom, nom, email, phone, avatar_url, center_status")
      .eq("center_id", ctx!.centerId)
      .eq("role", "student")
      .order("nom");
    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }
    profileRows = (fallback.data || []) as ProfileRow[];
  } else if (profilesRes.error) {
    return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
  } else {
    profileRows = (profilesRes.data || []) as ProfileRow[];
  }
  const studentIds = profileRows.map((p) => p.id);

  let enrollRows: EnrollRow[] = [];
  if (studentIds.length > 0) {
    const res = await supabaseAdmin
      .from("enrollments")
      .select(`
        id, student_id, status, filiere_id, niveau_id, groupe_id,
        tuition_fee, enrolled_at, duration_value, duration_unit, duration_months,
        academic_year, passage_decision, passage_reason,
        filieres(name, type, duree_valeur, duree_unite),
        niveaux(annee, mois, semaines, jours),
        groupes(nom)
      `)
      .in("student_id", studentIds);
    if (res.error && /passage_reason/i.test(res.error.message)) {
      const fallback = await supabaseAdmin
        .from("enrollments")
        .select(`
          id, student_id, status, filiere_id, niveau_id, groupe_id,
          tuition_fee, enrolled_at, duration_value, duration_unit, duration_months,
          academic_year, passage_decision,
          filieres(name, type, duree_valeur, duree_unite),
          niveaux(annee, mois, semaines, jours),
          groupes(nom)
        `)
        .in("student_id", studentIds);
      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 500 });
      }
      enrollRows = (fallback.data || []).map((e) => ({ ...e, passage_reason: null })) as EnrollRow[];
    } else if (res.error) {
      return NextResponse.json({ error: res.error.message }, { status: 500 });
    } else {
      enrollRows = (res.data || []) as EnrollRow[];
    }
  }

  const students = profileRows.map((p) => {
    const ses = enrollRows.filter((e) => e.student_id === p.id);
    return {
      id: p.id,
      prenom: p.prenom,
      nom: p.nom,
      email: p.email,
      phone: p.phone,
      avatar_url: p.avatar_url,
      birth_date: p.birth_date ?? null,
      genre: p.genre ?? null,
      center_status: p.center_status || "active",
      enrollments: ses.map((e) => {
        const niv = e.niveaux;
        const isShort = e.filieres?.type === "formation_courte" || (niv != null && niv.annee == null);
        let dur = "";
        if (isShort) {
          dur = shortDurationLabel(e);
        } else if (niv?.annee) {
          dur = `Année ${niv.annee}`;
        }
        const nameRaw = e.filieres?.name ?? "";
        return {
          id: e.id,
          filiere_id: e.filiere_id,
          filiere_name: dur ? `${nameRaw} (${dur})` : nameRaw,
          filiere_name_raw: nameRaw,
          niveau_id: e.niveau_id,
          // Masquer le niveau fantôme (annee null) pour les formations courtes
          niveau_annee: isShort ? null : (niv?.annee ?? null),
          duration_label: isShort ? (dur || null) : null,
          academic_year: isShort ? null : (e.academic_year ?? null),
          passage_decision: isShort ? null : (e.passage_decision ?? null),
          passage_reason: isShort ? null : (e.passage_reason ?? null),
          groupe_id: e.groupe_id,
          groupe_nom: e.groupes?.nom ?? null,
          tuition_fee: Number(e.tuition_fee) || 0,
          status: e.status ?? "draft",
          enrolled_at: e.enrolled_at,
        };
      }),
    };
  });

  return NextResponse.json({ students });
}

import { NextResponse } from "next/server";
import { getCenterStaffContext, supabaseAdmin } from "@/app/utils/center-auth-server";

const CAMPUS_MANAGER_PERMISSIONS = [
  "finance",
  "etudiants",
  "filieres",
  "staff",
  "communaute",
  "parametres",
  "cours",
  "planning",
  "examens",
  "rapports",
  "lives",
];

/**
 * GET  ?campus_id=… → { director, staffOptions }
 * POST { campus_id, director_id | null } → assigne / retire le directeur de campus
 */
export async function GET(req: Request) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;

  const campusId = new URL(req.url).searchParams.get("campus_id");
  if (!campusId) {
    return NextResponse.json({ error: "campus_id requis." }, { status: 400 });
  }

  const { data: campus } = await supabaseAdmin
    .from("campuses")
    .select("id")
    .eq("id", campusId)
    .eq("center_id", ctx!.centerId)
    .maybeSingle();
  if (!campus) {
    return NextResponse.json({ error: "Campus introuvable." }, { status: 404 });
  }

  const [{ data: accessRows }, { data: staffRows }] = await Promise.all([
    supabaseAdmin
      .from("staff_campus_access")
      .select("profile_id, profiles:profile_id(id, prenom, nom, role)")
      .eq("campus_id", campusId),
    supabaseAdmin
      .from("profiles")
      .select("id, prenom, nom, role")
      .eq("center_id", ctx!.centerId)
      .in("role", ["campus_manager", "staff", "trainer", "center_admin", "admin"])
      .order("nom"),
  ]);

  const directors = (accessRows || [])
    .map((r: any) => r.profiles)
    .filter((p: any) => p && (p.role === "campus_manager" || p.role === "center_admin" || p.role === "admin"));

  // Prefer campus_manager as the "directeur"
  const director =
    directors.find((p: any) => p.role === "campus_manager") ||
    directors[0] ||
    null;

  const staffOptions = (staffRows || []).map((s: any) => ({
    id: s.id,
    prenom: s.prenom || "",
    nom: s.nom || "",
    role: s.role,
    label: `${(s.prenom || "").toUpperCase()} ${(s.nom || "").toUpperCase()}`.trim() || s.id,
  }));

  return NextResponse.json({
    director: director
      ? {
          id: director.id,
          prenom: director.prenom || "",
          nom: director.nom || "",
          role: director.role,
          label: `${(director.prenom || "").toUpperCase()} ${(director.nom || "").toUpperCase()}`.trim(),
        }
      : null,
    staffOptions,
  });
}

export async function POST(req: Request) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;

  // Seul le directeur de centre peut nommer / retirer un directeur de campus
  if (ctx!.role !== "center_manager") {
    return NextResponse.json(
      { error: "Seul le directeur de centre peut assigner un directeur de campus." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const campusId = typeof body.campus_id === "string" ? body.campus_id : "";
  const directorId =
    body.director_id === null || body.director_id === ""
      ? null
      : typeof body.director_id === "string"
        ? body.director_id
        : null;

  if (!campusId) {
    return NextResponse.json({ error: "campus_id requis." }, { status: 400 });
  }

  const { data: campus } = await supabaseAdmin
    .from("campuses")
    .select("id, name")
    .eq("id", campusId)
    .eq("center_id", ctx!.centerId)
    .maybeSingle();
  if (!campus) {
    return NextResponse.json({ error: "Campus introuvable." }, { status: 404 });
  }

  // Retirer les campus_manager actuels de CE campus uniquement
  const { data: currentAccess } = await supabaseAdmin
    .from("staff_campus_access")
    .select("profile_id, profiles:profile_id(id, role)")
    .eq("campus_id", campusId);

  const previousManagerIds = (currentAccess || [])
    .filter((r: any) => r.profiles?.role === "campus_manager")
    .map((r: any) => r.profile_id as string);

  if (previousManagerIds.length > 0) {
    await supabaseAdmin
      .from("staff_campus_access")
      .delete()
      .eq("campus_id", campusId)
      .in("profile_id", previousManagerIds);
  }

  if (!directorId) {
    return NextResponse.json({ ok: true, director: null });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, prenom, nom, role, center_id")
    .eq("id", directorId)
    .eq("center_id", ctx!.centerId)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Collaborateur introuvable dans ce centre." }, { status: 404 });
  }

  // Promouvoir en campus_manager si besoin (sauf admins centre)
  if (profile.role !== "campus_manager" && profile.role !== "center_admin" && profile.role !== "admin") {
    const { error: roleErr } = await supabaseAdmin
      .from("profiles")
      .update({ role: "campus_manager" })
      .eq("id", directorId);
    if (roleErr) {
      return NextResponse.json({ error: roleErr.message }, { status: 500 });
    }
    await supabaseAdmin
      .from("center_users")
      .update({ permissions: CAMPUS_MANAGER_PERMISSIONS })
      .eq("user_id", directorId)
      .eq("center_id", ctx!.centerId);
  }

  // Upsert access (ignore duplicate)
  const { error: accessErr } = await supabaseAdmin.from("staff_campus_access").upsert(
    { profile_id: directorId, campus_id: campusId },
    { onConflict: "profile_id,campus_id" },
  );
  if (accessErr) {
    // fallback insert if no unique constraint name
    const { error: insErr } = await supabaseAdmin
      .from("staff_campus_access")
      .insert({ profile_id: directorId, campus_id: campusId });
    if (insErr && !/duplicate|unique/i.test(insErr.message)) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    director: {
      id: profile.id,
      prenom: profile.prenom || "",
      nom: profile.nom || "",
      role: "campus_manager",
      label: `${(profile.prenom || "").toUpperCase()} ${(profile.nom || "").toUpperCase()}`.trim(),
    },
  });
}

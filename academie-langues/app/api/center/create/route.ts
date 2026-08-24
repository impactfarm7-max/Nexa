import { NextResponse } from "next/server";
import { getAuthUser } from "@/app/utils/auth-server";
import { supabaseAdmin } from "@/app/utils/center-auth-server";
import { normalizeCenterType } from "@/app/data/center-types";

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { name, city, centerType } = await req.json();
  if (!name?.trim() || !city?.trim()) return NextResponse.json({ error: "Le nom et la ville sont requis." }, { status: 400 });

  const [{ data: profile }, { data: ownerMembership }] = await Promise.all([
    supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabaseAdmin.from("center_users").select("id").eq("user_id", user.id).in("role", ["owner", "manager"]).limit(1).maybeSingle(),
  ]);
  const isResponsible = ["center_manager", "admin", "manager"].includes(profile?.role || "") || Boolean(ownerMembership);
  if (!isResponsible) return NextResponse.json({ error: "Seul un responsable peut créer un autre centre." }, { status: 403 });

  const type = normalizeCenterType(centerType);
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const base = name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const slug = `${base || "centre"}-${Date.now().toString(36)}`;
  const { data: center, error: centerError } = await supabaseAdmin.from("centers").insert({ name: name.trim(), city: city.trim(), center_type: type, slug, signup_slug: slug, status: "pending", trial_ends_at: trialEndsAt, email: user.email || null }).select("id, name, status, trial_ends_at").single();
  if (centerError || !center) return NextResponse.json({ error: centerError?.message || "Création impossible." }, { status: 400 });

  const { error: membershipError } = await supabaseAdmin.from("center_users").insert({ center_id: center.id, user_id: user.id, role: "manager", role_label: "Directeur", permissions: ["finance", "etudiants", "filieres", "staff", "communaute", "parametres", "planning", "examens", "rapports", "cours", "lives", "bibliotheque", "abonnements"] });
  if (membershipError) { await supabaseAdmin.from("centers").delete().eq("id", center.id); return NextResponse.json({ error: membershipError.message }, { status: 400 }); }
  const { data: existingMainCampus } = await supabaseAdmin.from("campuses").select("id").eq("center_id", center.id).eq("is_main", true).maybeSingle();
  if (!existingMainCampus) {
    const { error: campusError } = await supabaseAdmin.from("campuses").insert({ center_id: center.id, name: `Campus ${city.trim()}`, city: city.trim(), is_main: true, status: "actif" });
    if (campusError) {
      const { data: mainCampusAfterConflict } = await supabaseAdmin.from("campuses").select("id").eq("center_id", center.id).eq("is_main", true).maybeSingle();
      if (!mainCampusAfterConflict) { await supabaseAdmin.from("centers").delete().eq("id", center.id); return NextResponse.json({ error: campusError.message }, { status: 400 }); }
    }
  }
  await supabaseAdmin.from("center_branding").upsert({ center_id: center.id, legal_name: name.trim() }, { onConflict: "center_id" });
  try {
    await supabaseAdmin.rpc("ensure_center_general_room", { p_center_id: center.id, p_created_by: user.id });
  } catch (error) {
    console.error("ensure_center_general_room:", error);
  }
  if (type === "tcf_canada") {
    await supabaseAdmin.from("filieres").insert({ center_id: center.id, created_by: user.id, name: "TCF Canada", type: "formation_courte", mode: "presentiel", discipline_type: "tcf_canada", duree_valeur: 3, duree_unite: "mois", status: "draft" });
  }
  const { error: activeError } = await supabaseAdmin.from("profiles").update({ center_id: center.id }).eq("id", user.id);
  if (activeError) return NextResponse.json({ error: activeError.message }, { status: 500 });
  return NextResponse.json({ center }, { status: 201 });
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { CENTER_STAFF_ROLES } from "@/app/utils/student-routes";
import { filterModulePermissions, ensureTcfCommunautePermission, ensureDefaultLivesPermission, TRAINER_DEFAULT_MODULE_PERMISSIONS } from "@/app/data/tcf-teaching-subjects";
import { normalizeCenterType } from "@/app/data/center-types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CAMPUS_MANAGER_PERMISSIONS = [
  "finance", "etudiants", "filieres", "staff", "communaute", "parametres",
  "cours", "planning", "examens", "rapports", "lives",
];

function relatedCenter(value: unknown): Record<string, unknown> | null {
  const row = Array.isArray(value) ? value[0] : value;
  return row && typeof row === "object" ? row as Record<string, unknown> : null;
}

async function loadStaffPermissions(profileId: string, role: string, centerType?: string | null) {
  if (role === "campus_manager" || role === "center_manager") {
    return CAMPUS_MANAGER_PERMISSIONS;
  }
  const { data: rows } = await supabaseAdmin
    .from("staff_permissions")
    .select("permission")
    .eq("profile_id", profileId);
  const fromTable = filterModulePermissions((rows || []).map((r) => r.permission as string));
  let permissions: string[];
  if (fromTable.length > 0) {
    permissions = fromTable;
  } else if (role === "trainer") {
    permissions = [...TRAINER_DEFAULT_MODULE_PERMISSIONS];
  } else {
    permissions = [];
  }
  return ensureDefaultLivesPermission(ensureTcfCommunautePermission(permissions, centerType));
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const { data: profileRow } = await supabaseAdmin
    .from("profiles")
    .select("role, center_id, created_by_center_id, job_title, onboarding_step")
    .eq("id", user.id)
    .maybeSingle();

  let { data: memberships, error } = await supabaseAdmin
    .from("center_users")
    .select("center_id, role, permissions, centers:center_id(id, name, code, signup_slug, city, address, phone, email, status, created_at, trial_ends_at, renewal_at, plan_type, center_type, nexa_offer)")
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const historicalCenterIds = [...new Set([
    profileRow?.created_by_center_id,
    typeof user.user_metadata?.center_id === "string" ? user.user_metadata.center_id : null,
  ].filter(Boolean))] as string[];
  if (historicalCenterIds.length > 0) {
    const { data: validHistoricalCenters } = await supabaseAdmin.from("centers").select("id").in("id", historicalCenterIds);
    if (validHistoricalCenters?.length) {
      await supabaseAdmin.from("center_users").upsert(
        validHistoricalCenters.map(({ id }) => ({ center_id: id, user_id: user.id, role: "manager", role_label: "Directeur", permissions: ["finance", "etudiants", "filieres", "staff", "communaute", "parametres", "planning", "examens", "rapports", "cours", "lives", "bibliotheque", "abonnements"] })),
        { onConflict: "center_id,user_id" },
      );
      const refreshed = await supabaseAdmin
        .from("center_users")
        .select("center_id, role, permissions, centers:center_id(id, name, code, signup_slug, city, address, phone, email, status, created_at, trial_ends_at, renewal_at, plan_type, center_type, nexa_offer)")
        .eq("user_id", user.id);
      if (!refreshed.error) memberships = refreshed.data;
    }
  }

  // Rattrapage des centres créés avant le support multi-centres : certaines
  // demandes existaient bien dans `centers`, sans liaison `center_users`.
  if (user.email) {
    const normalizedEmail = user.email.trim().toLowerCase();

    // Une partie des premiers comptes utilisait uniquement profiles.center_id.
    // Une demande déjà approuvée conserve toutefois l'identifiant du centre
    // d'origine : on restaure ici sa liaison multi-centres.
    const { data: approvedApplications } = await supabaseAdmin
      .from("center_applications")
      .select("approved_center_id")
      .ilike("email", normalizedEmail)
      .not("approved_center_id", "is", null);
    const approvedCenterIds = [...new Set((approvedApplications || []).map((row) => row.approved_center_id).filter(Boolean))] as string[];
    if (approvedCenterIds.length > 0) {
      await supabaseAdmin.from("center_users").upsert(
        approvedCenterIds.map((centerId) => ({ center_id: centerId, user_id: user.id, role: "manager", role_label: "Directeur", permissions: ["finance", "etudiants", "filieres", "staff", "communaute", "parametres", "planning", "examens", "rapports", "cours", "lives", "bibliotheque", "abonnements"] })),
        { onConflict: "center_id,user_id" },
      );
    }

    // Les anciennes créations passaient uniquement par `center_applications`.
    // Le propriétaire déjà connecté peut les récupérer comme essais sans qu'un
    // second compte Auth soit créé par le processus d'approbation historique.
    const { data: legacyApplications } = await supabaseAdmin
      .from("center_applications")
      .select("id, center_name, center_type, city, address, phone, email, approved_center_id, status")
      .ilike("email", normalizedEmail)
      .is("approved_center_id", null)
      .in("status", ["new", "contacted"]);
    for (const application of legacyApplications || []) {
      const { data: existingCenter } = await supabaseAdmin
        .from("centers")
        .select("id")
        .eq("application_id", application.id)
        .maybeSingle();
      let claimedCenterId = existingCenter?.id || null;
      if (!claimedCenterId) {
        const slugBase = application.center_name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "centre";
        const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: claimedCenter } = await supabaseAdmin.from("centers").insert({
          name: application.center_name,
          center_type: normalizeCenterType(application.center_type),
          city: application.city,
          address: application.address,
          phone: application.phone,
          email: normalizedEmail,
          application_id: application.id,
          signup_slug: `${slugBase}-${Date.now().toString(36)}`,
          status: "pending",
          trial_ends_at: trialEndsAt,
        }).select("id").single();
        claimedCenterId = claimedCenter?.id || null;
        if (claimedCenterId) {
          await supabaseAdmin.from("campuses").insert({ center_id: claimedCenterId, name: `Campus ${application.city}`, city: application.city, is_main: true, status: "actif" });
        }
      }
      if (claimedCenterId) {
        await supabaseAdmin.from("center_users").upsert({ center_id: claimedCenterId, user_id: user.id, role: "manager", role_label: "Directeur", permissions: ["finance", "etudiants", "filieres", "staff", "communaute", "parametres", "planning", "examens", "rapports", "cours", "lives", "bibliotheque", "abonnements"] }, { onConflict: "center_id,user_id" });
        await supabaseAdmin.from("center_applications").update({ status: "approved", approved_center_id: claimedCenterId, updated_at: new Date().toISOString() }).eq("id", application.id).is("approved_center_id", null);
      }
    }

    const linkedIds = new Set((memberships || []).map((item) => item.center_id));
    const { data: ownedCenters } = await supabaseAdmin
      .from("centers")
      .select("id")
      .ilike("email", normalizedEmail);
    const missingIds = (ownedCenters || []).map((center) => center.id).filter((id) => !linkedIds.has(id));
    if (missingIds.length > 0) {
      const permissions = ["finance", "etudiants", "filieres", "staff", "communaute", "parametres", "planning", "examens", "rapports", "cours", "lives", "bibliotheque", "abonnements"];
      await supabaseAdmin.from("center_users").upsert(
        missingIds.map((centerId) => ({ center_id: centerId, user_id: user.id, role: "manager", role_label: "Directeur", permissions })),
        { onConflict: "center_id,user_id" },
      );
      const refreshed = await supabaseAdmin
        .from("center_users")
        .select("center_id, role, permissions, centers:center_id(id, name, code, signup_slug, city, address, phone, email, status, created_at, trial_ends_at, renewal_at, plan_type, center_type, nexa_offer)")
        .eq("user_id", user.id);
      if (!refreshed.error) memberships = refreshed.data;
    }
    if (approvedCenterIds.length > 0 && missingIds.length === 0) {
      const refreshed = await supabaseAdmin
        .from("center_users")
        .select("center_id, role, permissions, centers:center_id(id, name, code, signup_slug, city, address, phone, email, status, created_at, trial_ends_at, renewal_at, plan_type, center_type, nexa_offer)")
        .eq("user_id", user.id);
      if (!refreshed.error) memberships = refreshed.data;
    }
  }

  const membership = (memberships || []).find((item) => item.center_id === profileRow?.center_id) || memberships?.[0] || null;
  const canonicalRole = profileRow?.role || membership?.role || null;
  const rawOnboarding = profileRow?.onboarding_step ?? "completed";
  // Onboarding centre = PDG uniquement ; le reste est toujours considéré comme terminé.
  const onboardingStep =
    canonicalRole === "center_manager" || canonicalRole === "admin"
      ? rawOnboarding
      : "completed";

  if (membership?.centers) {
    const centerType = (membership.centers as { center_type?: string }).center_type ?? null;
    const rawPermissions = (membership.permissions?.length
      ? membership.permissions
      : await loadStaffPermissions(user.id, canonicalRole || "staff", centerType)) as string[];
    const permissions = ensureTcfCommunautePermission(
      filterModulePermissions(rawPermissions.map(String)),
      centerType,
    );

    // Auto-heal : formateurs/staff créés sans onboarding_step completed
    if (
      profileRow &&
      canonicalRole &&
      canonicalRole !== "center_manager" &&
      canonicalRole !== "admin" &&
      profileRow.onboarding_step &&
      profileRow.onboarding_step !== "completed"
    ) {
      void supabaseAdmin
        .from("profiles")
        .update({ onboarding_step: "completed" })
        .eq("id", user.id);
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      role: canonicalRole,
      permissions,
      center: membership.centers,
      centers: (memberships || []).map((item) => ({
        ...relatedCenter(item.centers),
        membership_role: item.role,
      })),
      onboarding_step: onboardingStep,
    });
  }

  // Personnel sans center_users (comptes staff créés avant la correction)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role, center_id, job_title, onboarding_step, centers:center_id(id, name, code, signup_slug, city, address, phone, email, status, created_at, plan_type, center_type, nexa_offer)")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  if (!profile?.centers || !profile.role || !CENTER_STAFF_ROLES.has(profile.role)) {
    return NextResponse.json({ error: "Aucun centre lie a ce compte." }, { status: 403 });
  }

  const centerType = (profile.centers as { center_type?: string }).center_type ?? null;
  const permissions = await loadStaffPermissions(user.id, profile.role, centerType);

  await supabaseAdmin.from("center_users").upsert(
    {
      center_id: profile.center_id,
      user_id: user.id,
      role: profile.role === "campus_manager" || profile.role === "center_manager" ? "manager" : "staff",
      role_label: profile.job_title || profile.role,
      permissions,
    },
    { onConflict: "center_id,user_id" },
  );

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    role: profile.role,
    permissions,
    center: profile.centers,
    onboarding_step:
      profile.role === "center_manager" || profile.role === "admin"
        ? (profile.onboarding_step ?? "completed")
        : "completed",
  });
}

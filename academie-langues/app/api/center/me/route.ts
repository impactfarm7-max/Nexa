import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { CENTER_STAFF_ROLES } from "@/app/utils/student-routes";
import { filterModulePermissions, ensureTcfCommunautePermission, ensureDefaultLivesPermission, TRAINER_DEFAULT_MODULE_PERMISSIONS } from "@/app/data/tcf-teaching-subjects";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CAMPUS_MANAGER_PERMISSIONS = [
  "finance", "etudiants", "filieres", "staff", "communaute", "parametres",
  "cours", "planning", "examens", "rapports", "lives",
];

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
    .select("role, center_id, job_title, onboarding_step")
    .eq("id", user.id)
    .maybeSingle();

  const { data: membership, error } = await supabaseAdmin
    .from("center_users")
    .select("role, permissions, centers:center_id(id, name, code, signup_slug, city, address, phone, email, status, created_at, plan_type, center_type, nexa_offer)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
    { onConflict: "user_id" },
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

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_PERMISSIONS = new Set([
  "students",
  "trainers",
  "overview",
  "radar",
  "missions",
  "submissions",
  "coaching",
  "messages",
  "forum",
  "support",
  "reviews",
  "push",
]);

function generatePassword(name: string): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  const clean = name.trim().replace(/[^a-zA-Z]/g, "");
  const base = clean.charAt(0).toUpperCase() + clean.slice(1, 4).toLowerCase();
  return `${base || "Iag"}${digits}`;
}

async function getCenterForUser(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return { user: null, centerId: null, role: null, permissions: [], response: NextResponse.json({ error: "Non autorise." }, { status: 401 }) };

  const { data: membership } = await supabaseAdmin
    .from("center_users")
    .select("center_id, role, permissions")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.center_id) {
    return { user: null, centerId: null, role: null, permissions: [], response: NextResponse.json({ error: "Compte centre requis." }, { status: 403 }) };
  }

  return {
    user,
    centerId: membership.center_id as string,
    role: membership.role as string,
    permissions: (membership.permissions || []) as string[],
    response: null,
  };
}

function canManageTrainers(role: string | null, permissions: string[]) {
  return role !== "staff" || permissions.includes("trainers");
}

function sanitizePermissions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).filter((permission) => ALLOWED_PERMISSIONS.has(permission)))];
}

export async function GET(req: Request) {
  const { centerId, role, permissions, response } = await getCenterForUser(req);
  if (response) return response;
  if (!canManageTrainers(role, permissions)) {
    return NextResponse.json({ error: "Acces formateurs non autorise." }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, prenom, email, phone, ville, current_activity, last_seen_at, last_sign_in_at, created_at, tag_status")
    .eq("center_id", centerId)
    .eq("role", "trainer")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const trainerIds = (data || []).map((trainer: any) => trainer.id);
  const { data: memberships } = trainerIds.length
    ? await supabaseAdmin
        .from("center_users")
        .select("user_id, permissions, role_label")
        .eq("center_id", centerId)
        .in("user_id", trainerIds)
    : { data: [] as any[] };
  const permissionMap = new Map((memberships || []).map((membership: any) => [membership.user_id, membership.permissions || []]));
  const roleLabelMap = new Map((memberships || []).map((membership: any) => [membership.user_id, membership.role_label || "Formateur"]));

  return NextResponse.json({
    trainers: (data || []).map((trainer: any) => ({
      ...trainer,
      permissions: permissionMap.get(trainer.id) || [],
      role_label: roleLabelMap.get(trainer.id) || "Formateur",
    })),
  });
}

export async function POST(req: Request) {
  const { centerId, role, permissions: currentPermissions, response } = await getCenterForUser(req);
  if (response) return response;
  if (!canManageTrainers(role, currentPermissions)) {
    return NextResponse.json({ error: "Creation de formateur non autorisee." }, { status: 403 });
  }

  const { prenom, email, phone, ville, genre, permissions, roleLabel } = await req.json();
  if (!prenom?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Prenom et email sont requis." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const password = generatePassword(prenom);
  const trainerPermissions = sanitizePermissions(permissions);
  const cleanRoleLabel = String(roleLabel || "Formateur").trim().slice(0, 60) || "Formateur";

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { prenom: prenom.trim(), center_id: centerId, role: "trainer" },
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || "Compte formateur non cree." }, { status: 400 });
  }

  const userId = authData.user.id;
  const createdAt = new Date().toISOString();

  const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
    id: userId,
    prenom: prenom.trim(),
    email: normalizedEmail,
    phone: phone?.trim() || null,
    ville: ville?.trim() || null,
    genre: genre || null,
    role: "trainer",
    center_id: centerId,
    created_by_center_id: centerId,
    tag_status: "normal",
    simulations_completed: 0,
    created_at: createdAt,
  });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileError.message || "Profil formateur non cree." }, { status: 500 });
  }

  const { error: membershipError } = await supabaseAdmin.from("center_users").insert({
    center_id: centerId,
    user_id: userId,
    role: "staff",
    role_label: cleanRoleLabel,
    permissions: trainerPermissions,
  });

  if (membershipError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: membershipError.message || "Lien formateur/centre non cree." }, { status: 500 });
  }

  return NextResponse.json({ email: normalizedEmail, password, userId, prenom: prenom.trim(), roleLabel: cleanRoleLabel, permissions: trainerPermissions }, { status: 201 });
}

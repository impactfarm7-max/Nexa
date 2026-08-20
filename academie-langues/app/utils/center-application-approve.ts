import { createClient } from "@supabase/supabase-js";
import { generateSecureTemporaryPassword } from "@/app/utils/secure-password";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generatePassword(name: string) {
  void name;
  return generateSecureTemporaryPassword();
}

function codePrefix(name: string) {
  const clean = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 4);
  return clean || "IAG";
}

function slugBase(name: string) {
  const clean = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return clean || "centre";
}

async function generateUniqueCenterCode(centerName: string) {
  const prefix = codePrefix(centerName);
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const code = `${prefix}${suffix}`;
    const { data } = await supabaseAdmin
      .from("centers")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!data) return code;
  }
  return `${prefix}${Date.now().toString(36).slice(-5).toUpperCase()}`;
}

async function generateUniqueCenterSlug(centerName: string) {
  const base = slugBase(centerName);
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = attempt === 0 ? "" : `-${Math.floor(100 + Math.random() * 900)}`;
    const slug = `${base}${suffix}`;
    const { data } = await supabaseAdmin
      .from("centers")
      .select("id")
      .eq("signup_slug", slug)
      .maybeSingle();
    if (!data) return slug;
  }
  return `${base}-${Date.now().toString(36).slice(-5)}`;
}

export type ApproveCenterApplicationResult =
  | {
      ok: true;
      center: Record<string, unknown>;
      credentials: {
        email: string;
        password: string;
        name: string;
        centerName: string;
        centerCode: string;
      };
    }
  | { ok: false; status: number; error: string };

/** Approuve une demande centre : crée centre + compte manager + lien center_users. */
export async function approveCenterApplication(
  applicationId: string,
): Promise<ApproveCenterApplicationResult> {
  if (!applicationId) {
    return { ok: false, status: 400, error: "Demande manquante." };
  }

  const { data: application, error: appError } = await supabaseAdmin
    .from("center_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (appError || !application) {
    return { ok: false, status: 404, error: "Demande introuvable." };
  }

  if (application.status === "approved" && application.approved_center_id) {
    return { ok: false, status: 409, error: "Cette demande est deja approuvee." };
  }

  const centerCode = await generateUniqueCenterCode(application.center_name);
  const signupSlug = await generateUniqueCenterSlug(application.center_name);

  const { data: center, error: centerError } = await supabaseAdmin
    .from("centers")
    .insert([{
      name: application.center_name,
      city: application.city,
      address: application.address,
      phone: application.phone,
      email: application.email,
      code: centerCode,
      signup_slug: signupSlug,
      application_id: application.id,
      status: "active",
    }])
    .select("*")
    .single();

  if (centerError || !center) {
    return { ok: false, status: 500, error: centerError?.message || "Centre non cree." };
  }

  const password = generatePassword(application.manager_name || application.center_name);
  const email = application.email.trim().toLowerCase();

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      prenom: application.manager_name,
      center_id: center.id,
      role: "center_manager",
    },
  });

  if (authError || !authData.user) {
    await supabaseAdmin.from("centers").delete().eq("id", center.id);
    return { ok: false, status: 400, error: authError?.message || "Compte responsable non cree." };
  }

  const userId = authData.user.id;
  const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
    id: userId,
    prenom: application.manager_name,
    email,
    phone: application.phone,
    ville: application.city,
    role: "center_manager",
    center_id: center.id,
    simulations_completed: 0,
    created_at: new Date().toISOString(),
  });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    await supabaseAdmin.from("centers").delete().eq("id", center.id);
    return { ok: false, status: 500, error: profileError.message || "Profil responsable non cree." };
  }

  const { error: centerUserError } = await supabaseAdmin.from("center_users").insert([{
    center_id: center.id,
    user_id: userId,
    role: "owner",
  }]);

  if (centerUserError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    await supabaseAdmin.from("centers").delete().eq("id", center.id);
    return { ok: false, status: 500, error: "Lien centre/responsable non cree." };
  }

  try {
    await supabaseAdmin.rpc("ensure_center_general_room", {
      p_center_id: center.id,
      p_created_by: userId,
    });
  } catch (e) {
    console.error("ensure_center_general_room:", e);
  }

  await supabaseAdmin
    .from("center_applications")
    .update({
      status: "approved",
      approved_center_id: center.id,
      center_code: centerCode,
      updated_at: new Date().toISOString(),
    })
    .eq("id", application.id);

  return {
    ok: true,
    center,
    credentials: {
      email,
      password,
      name: application.manager_name,
      centerName: application.center_name,
      centerCode,
    },
  };
}

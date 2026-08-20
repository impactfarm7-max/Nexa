import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { generateSecureTemporaryPassword } from "@/app/utils/secure-password";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generatePassword(prenom: string): string {
  void prenom;
  return generateSecureTemporaryPassword();
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  const { prenom, email, phone, ville, genre, formation, formations } = await req.json();

  if (!prenom?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Prénom et email sont requis." }, { status: 400 });
  }

  const password = generatePassword(prenom);

  // Create Supabase auth user (email already confirmed, no verification email)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { prenom: prenom.trim() },
  });

  if (authError || !authData.user) {
    const msg = authError?.message || "Erreur lors de la création du compte.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const userId = authData.user.id;

  // Insert/update profile (le trigger on_auth_user_created peut déjà avoir créé la ligne
  // avec un tag_status par défaut — on force actif + normal).
  const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
    id: userId,
    prenom: prenom.trim(),
    email: email.trim().toLowerCase(),
    phone: phone?.trim() || null,
    ville: ville?.trim() || null,
    genre: genre || null,
    formation: formation || "tcf",
    formations: formations?.length ? formations : [formation || "tcf"],
    role: "student",
    tag_status: "actif",
    simulations_completed: 0,
    created_at: new Date().toISOString(),
  });

  if (profileError) {
    // Fallback si la contrainte DB n'accepte pas "actif"
    const { error: fallbackErr } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      prenom: prenom.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      ville: ville?.trim() || null,
      genre: genre || null,
      formation: formation || "tcf",
      formations: formations?.length ? formations : [formation || "tcf"],
      role: "student",
      tag_status: "normal",
      simulations_completed: 0,
      created_at: new Date().toISOString(),
    });
    if (fallbackErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Erreur lors de la création du profil." }, { status: 500 });
    }
  }

  return NextResponse.json({ email: email.trim().toLowerCase(), password, userId, prenom: prenom.trim() });
}

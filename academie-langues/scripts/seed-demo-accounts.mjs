/**
 * Crée/rafraîchit les 4 comptes démo publics (bouton "Visiter" landing).
 * Idempotent : rejouable sans dupliquer (upsert par email).
 * Usage: node --env-file=.env.local scripts/seed-demo-accounts.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("FAIL: env Supabase manquante (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const ok = (m) => console.log(`✓ ${m}`);
const fail = (m) => {
  console.error(`✗ ${m}`);
  process.exit(1);
};

const DEMO_PASSWORD = "Demo-Nexa-2026!";

async function ensureAuthUser(email) {
  const { data: existing } = await sb
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) fail(`création auth ${email}: ${error?.message}`);
  return data.user.id;
}

async function ensureCenter({ name, centerType }) {
  const { data: existing } = await sb
    .from("centers")
    .select("id")
    .eq("name", name)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await sb
    .from("centers")
    .insert({ name, center_type: centerType, status: "active", city: "Yaoundé" })
    .select("id")
    .single();
  if (error || !data) fail(`création centre ${name}: ${error?.message}`);
  return data.id;
}

async function ensureCampus(centerId, name) {
  const { data: existing } = await sb
    .from("campuses")
    .select("id")
    .eq("center_id", centerId)
    .eq("name", name)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await sb
    .from("campuses")
    .insert({ center_id: centerId, name })
    .select("id")
    .single();
  if (error || !data) fail(`création campus ${name}: ${error?.message}`);
  return data.id;
}

async function ensureFiliere(centerId, name, type, createdById) {
  const { data: existing } = await sb
    .from("filieres")
    .select("id")
    .eq("center_id", centerId)
    .eq("name", name)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await sb
    .from("filieres")
    .insert({ center_id: centerId, name, type, nb_niveaux: 3, created_by: createdById })
    .select("id")
    .single();
  if (error || !data) fail(`création filière ${name}: ${error?.message}`);
  return data.id;
}

async function upsertProfile({ id, email, prenom, nom, role, centerId }) {
  const { error } = await sb.from("profiles").upsert({
    id,
    email,
    prenom,
    nom,
    role,
    center_id: centerId,
    created_by_center_id: centerId,
    center_status: "active",
    tag_status: "actif",
    is_demo_account: true,
  });
  if (error) fail(`upsert profil ${email}: ${error.message}`);
}

async function seedCenter({ centerName, centerType, filiereName, filiereType, managerEmail, studentEmail }) {
  const centerId = await ensureCenter({ name: centerName, centerType });
  await ensureCampus(centerId, "Campus principal");

  const managerId = await ensureAuthUser(managerEmail);
  await upsertProfile({
    id: managerId,
    email: managerEmail,
    prenom: "Démo",
    nom: "Responsable",
    role: "center_manager",
    centerId,
  });

  await ensureFiliere(centerId, filiereName, filiereType, managerId);

  const studentId = await ensureAuthUser(studentEmail);
  await upsertProfile({
    id: studentId,
    email: studentEmail,
    prenom: "Démo",
    nom: "Étudiant",
    role: "student",
    centerId,
  });

  ok(`${centerName} : manager=${managerEmail} étudiant=${studentEmail}`);
}

async function main() {
  await seedCenter({
    centerName: "Centre Libre Démo",
    centerType: "generic",
    filiereName: "Anglais Général",
    filiereType: "cursus",
    managerEmail: "demo-libre-centre@nexa-demo.app",
    studentEmail: "demo-libre-etudiant@nexa-demo.app",
  });

  await seedCenter({
    centerName: "Centre TCF Démo",
    centerType: "tcf_canada",
    filiereName: "TCF Canada",
    filiereType: "cursus",
    managerEmail: "demo-tcf-centre@nexa-demo.app",
    studentEmail: "demo-tcf-etudiant@nexa-demo.app",
  });

  ok("Seed terminé.");
}

main();

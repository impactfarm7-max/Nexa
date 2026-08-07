import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/app/utils/email-server";
import { filterModulePermissions, TCF_SUBJECT_KEYS, ensureTcfCommunautePermission, ensureDefaultLivesPermission, TRAINER_DEFAULT_MODULE_PERMISSIONS } from "@/app/data/tcf-teaching-subjects";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_MODULE_PERMISSIONS = new Set([
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
]);

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

/** Mot de passe temporaire simple : Nexa + 4 chiffres (ex. Nexa4821). */
function generatePassword(): string {
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `Nexa${digits}`;
}

async function requireCenterManager(token: string | undefined) {
  if (!token) return { error: NextResponse.json({ error: "Non authentifié." }, { status: 401 }) };

  const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(token);
  if (callerErr || !callerData.user) {
    return { error: NextResponse.json({ error: "Session invalide." }, { status: 401 }) };
  }

  const { data: callerProfile } = await supabaseAdmin
    .from("profiles")
    .select("role, center_id")
    .eq("id", callerData.user.id)
    .single();

  if (!callerProfile || !["admin", "center_manager"].includes(callerProfile.role)) {
    return {
      error: NextResponse.json(
        { error: "Seuls le PDG ou un administrateur peuvent gérer le personnel." },
        { status: 403 }
      ),
    };
  }

  return { callerProfile };
}

async function getCenterType(centerId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from("centers").select("center_type").eq("id", centerId).maybeSingle();
  return data?.center_type ?? null;
}

function applyTcfStaffPermissions(permissions: string[], centerType: string | null) {
  return ensureDefaultLivesPermission(ensureTcfCommunautePermission(permissions, centerType));
}

function sanitizeModulePermissions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return filterModulePermissions(
    [...new Set(raw.map(String))].filter((p) => ALLOWED_MODULE_PERMISSIONS.has(p))
  );
}

async function replaceStaffPermissions(profileId: string, modulePerms: string[]) {
  const { error: permDeleteErr } = await supabaseAdmin
    .from("staff_permissions")
    .delete()
    .eq("profile_id", profileId);
  if (permDeleteErr) {
    return { error: `Suppression des permissions échouée : ${permDeleteErr.message}` };
  }

  if (modulePerms.length === 0) return { error: null };

  const { error: permInsertErr } = await supabaseAdmin
    .from("staff_permissions")
    .insert(modulePerms.map((permission: string) => ({ profile_id: profileId, permission })));
  if (permInsertErr) {
    return { error: `Enregistrement des permissions échoué : ${permInsertErr.message}` };
  }
  return { error: null };
}

/** Accès RH du centre (service role) — contourne le RLS client sur staff_permissions. */
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    const auth = await requireCenterManager(token);
    if ("error" in auth && auth.error) return auth.error;
    const { callerProfile } = auth as { callerProfile: { role: string; center_id: string } };

    const { data: staffRows, error: staffErr } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("center_id", callerProfile.center_id)
      .in("role", ["campus_manager", "trainer", "staff"]);

    if (staffErr) {
      return NextResponse.json({ error: staffErr.message }, { status: 500 });
    }

    const ids = (staffRows || []).map((s) => s.id);
    const access: Record<string, { permissions: string[]; campus_ids: string[] }> = {};
    for (const s of staffRows || []) {
      access[s.id] = { permissions: [], campus_ids: [] };
    }

    if (ids.length > 0) {
      const [{ data: campusLinks }, { data: permLinks }] = await Promise.all([
        supabaseAdmin.from("staff_campus_access").select("profile_id, campus_id").in("profile_id", ids),
        supabaseAdmin.from("staff_permissions").select("profile_id, permission").in("profile_id", ids),
      ]);

      for (const link of campusLinks || []) {
        const row = access[link.profile_id];
        if (row) row.campus_ids.push(link.campus_id);
      }
      for (const link of permLinks || []) {
        const row = access[link.profile_id];
        if (row) row.permissions.push(link.permission);
      }
    }

    const centerType = await getCenterType(callerProfile.center_id);

    // Directeurs : droits complets affichables même sans lignes staff_permissions
    for (const s of staffRows || []) {
      if (s.role === "campus_manager") {
        access[s.id].permissions = CAMPUS_MANAGER_PERMISSIONS;
      } else {
        access[s.id].permissions = filterModulePermissions(access[s.id].permissions);
        // Formateurs créés avant la persistance modules : afficher les droits par défaut
        if (s.role === "trainer" && access[s.id].permissions.length === 0) {
          access[s.id].permissions = [...TRAINER_DEFAULT_MODULE_PERMISSIONS];
        }
        access[s.id].permissions = applyTcfStaffPermissions(access[s.id].permissions, centerType);
      }
    }

    return NextResponse.json({ access });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    const auth = await requireCenterManager(token);
    if ("error" in auth && auth.error) return auth.error;
    const { callerProfile } = auth as { callerProfile: { role: string; center_id: string } };

    const body = await req.json();
    const profileId = String(body.profile_id || "").trim();
    if (!profileId) {
      return NextResponse.json({ error: "profile_id manquant." }, { status: 400 });
    }

    const { data: target, error: targetErr } = await supabaseAdmin
      .from("profiles")
      .select("id, role, center_id")
      .eq("id", profileId)
      .single();

    if (targetErr || !target) {
      return NextResponse.json({ error: "Collaborateur introuvable." }, { status: 404 });
    }
    if (target.center_id !== callerProfile.center_id) {
      return NextResponse.json({ error: "Ce collaborateur n'appartient pas à votre centre." }, { status: 403 });
    }

    const rawCampusIds: unknown[] = Array.isArray(body.campus_ids) ? body.campus_ids : [];
    const campusIds: string[] = [...new Set(rawCampusIds.map((v) => String(v)))];

    if (campusIds.length > 0) {
      const { data: campusCheck } = await supabaseAdmin
        .from("campuses")
        .select("id")
        .eq("center_id", callerProfile.center_id)
        .in("id", campusIds);
      if (!campusCheck || campusCheck.length !== campusIds.length) {
        return NextResponse.json(
          { error: "Un ou plusieurs campus ne correspondent pas à votre centre." },
          { status: 403 }
        );
      }
    }

    const { error: campusDeleteErr } = await supabaseAdmin
      .from("staff_campus_access")
      .delete()
      .eq("profile_id", profileId);
    if (campusDeleteErr) {
      return NextResponse.json(
        { error: `Suppression des accès campus échouée : ${campusDeleteErr.message}` },
        { status: 500 }
      );
    }

    if (campusIds.length > 0) {
      const { error: campusInsertErr } = await supabaseAdmin
        .from("staff_campus_access")
        .insert(campusIds.map((campus_id: string) => ({ profile_id: profileId, campus_id })));
      if (campusInsertErr) {
        return NextResponse.json(
          { error: `Enregistrement des campus échoué : ${campusInsertErr.message}` },
          { status: 500 }
        );
      }
    }

    let modulePerms: string[];
    const centerType = await getCenterType(callerProfile.center_id);
    if (target.role === "campus_manager") {
      modulePerms = CAMPUS_MANAGER_PERMISSIONS;
      // Pas d’édition modules pour les directors ; sync center_users seulement
    } else {
      // staff + trainer : persister les modules choisis dans l’UI
      modulePerms = sanitizeModulePermissions(body.permissions);
      if (target.role === "trainer" && modulePerms.length === 0) {
        modulePerms = [...TRAINER_DEFAULT_MODULE_PERMISSIONS];
      }
      modulePerms = applyTcfStaffPermissions(modulePerms, centerType);

      const replaced = await replaceStaffPermissions(profileId, modulePerms);
      if (replaced.error) {
        return NextResponse.json({ error: replaced.error }, { status: 500 });
      }
    }

    const { error: membershipErr } = await supabaseAdmin
      .from("center_users")
      .update({ permissions: modulePerms })
      .eq("user_id", profileId)
      .eq("center_id", callerProfile.center_id);

    if (membershipErr) {
      return NextResponse.json(
        { error: `Mise à jour center_users échouée : ${membershipErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      permissions: modulePerms,
      campus_ids: campusIds,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(token);
    if (callerErr || !callerData.user) return NextResponse.json({ error: "Session invalide." }, { status: 401 });

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, center_id")
      .eq("id", callerData.user.id)
      .single();

    if (!callerProfile || !["admin", "center_manager"].includes(callerProfile.role)) {
      return NextResponse.json({ error: "Seuls le PDG ou un administrateur peuvent créer du personnel." }, { status: 403 });
    }

    const body = await req.json();
    
    const { prenom, nom, phone, role, job_title, campus_ids, permissions, country, country_code, region, city, tcf_subjects } = body;
    const normalizedEmail = String(body.email || "").trim().toLowerCase();
    const genreRaw = typeof body.genre === "string" ? body.genre.trim() : "";
    const birthDateRaw = typeof body.birth_date === "string" ? body.birth_date.trim() : "";
    const genreOk = genreRaw === "Homme" || genreRaw === "Femme" || genreRaw === "Autre";
    const birthOk = /^\d{4}-\d{2}-\d{2}$/.test(birthDateRaw);

    if (!prenom || !nom || !normalizedEmail || !role) {
      return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
    }
    const genre = genreOk ? genreRaw : "Autre";
    const birthDate = birthOk ? birthDateRaw : "2000-01-01";

    const validRoles = ["campus_manager", "trainer", "staff"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
    }

    // Vérifier que les campus appartiennent bien au centre de l'appelant
    if (Array.isArray(campus_ids) && campus_ids.length > 0) {
      const { data: campusCheck } = await supabaseAdmin
        .from("campuses")
        .select("id")
        .eq("center_id", callerProfile.center_id)
        .in("id", campus_ids);
      if (!campusCheck || campusCheck.length !== campus_ids.length) {
        return NextResponse.json({ error: "Un ou plusieurs campus ne correspondent pas à votre centre." }, { status: 403 });
      }
    }

    const password = generatePassword();

    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { prenom, nom, center_id: callerProfile.center_id, role },
    });
    if (createErr || !newUser.user) {
      return NextResponse.json({ error: createErr?.message || "Création du compte échouée." }, { status: 500 });
    }

    // Réapplique le MDP côté Auth (évite les écarts createUser / affichage popup)
    const { error: pwdErr } = await supabaseAdmin.auth.admin.updateUserById(newUser.user.id, {
      password,
      email_confirm: true,
    });
    if (pwdErr) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ error: `Mot de passe non enregistré : ${pwdErr.message}` }, { status: 500 });
    }

    // Le trigger on_auth_user_created crée déjà une ligne profiles — on la complète
    const baseProfileUpdate = {
      prenom,
      nom,
      phone: phone || null,
      role,
      job_title: job_title || null,
      center_id: callerProfile.center_id,
      center_status: "active",
      must_change_password: true,
      email: normalizedEmail,
      country: country || null,
      city: city || null,
      // Le personnel n'a pas à passer l'onboarding "création de centre"
      onboarding_step: "completed",
    };
    const optionalProfileUpdate = {
      country_code: country_code || null,
      region: region || null,
      genre,
      birth_date: birthDate,
    };

    let { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({ ...baseProfileUpdate, ...optionalProfileUpdate })
      .eq("id", newUser.user.id);

    if (updateErr && /genre|birth_date/i.test(updateErr.message)) {
      const { genre: _g, birth_date: _b, ...withoutIdentity } = optionalProfileUpdate;
      const { error: retryErr } = await supabaseAdmin
        .from("profiles")
        .update({ ...baseProfileUpdate, ...withoutIdentity })
        .eq("id", newUser.user.id);
      updateErr = retryErr;
    }

    if (updateErr) {
      const { error: fallbackErr } = await supabaseAdmin
        .from("profiles")
        .update(baseProfileUpdate)
        .eq("id", newUser.user.id);
      updateErr = fallbackErr;
    }

    if (updateErr) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ error: `Compte créé mais profil incomplet : ${updateErr.message}` }, { status: 500 });
    }

    const centerType = await getCenterType(callerProfile.center_id);

    // Lien center_users pour /api/center/me et connexion unifiée /login
    const emailLocale = centerType === "tcf_canada" ? "fr" : (body.locale === "en" ? "en" : "fr");
    let staffPermissions = role === "staff"
      ? sanitizeModulePermissions(permissions || [])
      : role === "campus_manager"
        ? CAMPUS_MANAGER_PERMISSIONS
        : role === "trainer"
          ? [...TRAINER_DEFAULT_MODULE_PERMISSIONS]
          : [];

    if (role !== "campus_manager") {
      staffPermissions = applyTcfStaffPermissions(staffPermissions, centerType);
    }

    const { error: membershipErr } = await supabaseAdmin.from("center_users").insert({
      center_id: callerProfile.center_id,
      user_id: newUser.user.id,
      role: role === "campus_manager" || role === "center_manager" ? "manager" : "staff",
      role_label: job_title || role,
      permissions: staffPermissions,
    });

    if (membershipErr) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ error: `Compte créé mais lien centre échoué : ${membershipErr.message}` }, { status: 500 });
    }

    // Rattachement aux campus (campus_manager et trainer)
    if (Array.isArray(campus_ids) && campus_ids.length > 0) {
      const { error: campusErr } = await supabaseAdmin
        .from("staff_campus_access")
        .insert(campus_ids.map((cid: string) => ({ profile_id: newUser.user.id, campus_id: cid })));
      if (campusErr) {
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        return NextResponse.json({ error: `Rattachement campus échoué : ${campusErr.message}` }, { status: 500 });
      }
    }

    // Permissions de module (staff + formateur — Sessions Live inclus par défaut)
    const modulePerms = role === "staff" || role === "trainer" ? staffPermissions : [];

    if (modulePerms.length > 0) {
      const { error: permErr } = await supabaseAdmin
        .from("staff_permissions")
        .insert(modulePerms.map((p: string) => ({ profile_id: newUser.user.id, permission: p })));
      if (permErr) {
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        return NextResponse.json({ error: `Compte créé mais permissions échouées : ${permErr.message}` }, { status: 500 });
      }
    }

    // Matières TCF (formateurs centres TCF) — table dédiée
    const tcfSubjectKeys = Array.isArray(tcf_subjects)
      ? [...new Set(tcf_subjects.map(String).filter((k) => TCF_SUBJECT_KEYS.has(k)))]
      : [];

    if (tcfSubjectKeys.length > 0) {
      const { error: tcfErr } = await supabaseAdmin
        .from("staff_tcf_subjects")
        .insert(tcfSubjectKeys.map((subject_key: string) => ({ profile_id: newUser.user.id, subject_key })));
      if (tcfErr) {
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        return NextResponse.json({ error: `Compte créé mais matières TCF échouées : ${tcfErr.message}` }, { status: 500 });
      }
    }

    // Envoi synchrone (comme /api/etudiants) : `after()` + void ne garde pas
    // le runtime assez longtemps pour finir le SMTP Gmail.
    const loginBase = (process.env.NEXT_PUBLIC_SITE_URL || "https://nexa.fr").replace(/\/$/, "");
    const loginUrl = `${loginBase}/login?lang=${emailLocale}`;
    let emailResult = { sent: false, skipped: false };
    try {
      emailResult = await sendEmail({
        to: normalizedEmail,
        subject: emailLocale === "en" ? "Your Nexa Academy access" : "Vos accès Nexa Academy",
        text: emailLocale === "en"
          ? `Hello ${prenom},\n\nYour staff account has been created.\nEmail: ${normalizedEmail}\nTemporary password: ${password}\n\nSign in here: ${loginUrl}\n\nYou will be asked to change your password the first time you sign in.`
          : `Bonjour ${prenom},\n\nVotre compte personnel a été créé.\nIdentifiant : ${normalizedEmail}\nMot de passe temporaire : ${password}\n\nConnectez-vous sur : ${loginUrl}\n\nVous devrez modifier votre mot de passe à la première connexion.`,
      });
      if (!emailResult.sent) {
        console.error("[staff] email non envoyé:", emailResult.skipped ? "GMAIL_* manquant" : "échec SMTP");
      }
    } catch (mailErr) {
      console.error("[staff] email échoué (non bloquant):", mailErr);
      emailResult = { sent: false, skipped: false };
    }

    return NextResponse.json({
      id: newUser.user.id,
      prenom,
      nom,
      email: normalizedEmail,
      emailQueued: false,
      emailSent: emailResult.sent,
      // Toujours renvoyé : le centre doit pouvoir copier/envoyer le MDP (WhatsApp, etc.)
      temporaryPassword: password,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erreur serveur." }, { status: 500 });
  }
}

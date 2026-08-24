import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeCenterType } from "@/app/data/center-types";
import { normalizeNexaOffer } from "@/app/data/nexaOffers";
import { normalizeTcfPlan } from "@/app/data/tcfOffers";
import { checkPasswordStrength, PASSWORD_POLICY_HINT } from "@/app/utils/password-policy";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const {
      centerName, city, phone, address, country, region,
      ownerPrenom, ownerNom, ownerEmail, ownerPassword, ownerRole,
      centerType,
      nexaOffer,
      planType,
    } = await req.json();

    if (!centerName?.trim()) return NextResponse.json({ error: "Le nom du centre est requis." }, { status: 400 });
    if (!city?.trim()) return NextResponse.json({ error: "La ville est requise." }, { status: 400 });
    if (!ownerPrenom?.trim() || !ownerNom?.trim()) return NextResponse.json({ error: "Prénom et nom du responsable requis." }, { status: 400 });
    if (!ownerEmail?.trim()) return NextResponse.json({ error: "L'email est requis." }, { status: 400 });
    const pwdCheck = checkPasswordStrength(String(ownerPassword || ""));
    if (!pwdCheck.ok) {
      return NextResponse.json({ error: pwdCheck.message || PASSWORD_POLICY_HINT }, { status: 400 });
    }

    // tcf_canada | formation_courte | generic — jamais de collapse silencieux vers un autre type
    const type = normalizeCenterType(centerType);
    // Libre → nexa_offer ; TCF → plan_type (Starter/Pro/Ultra/custom sur devis)
    const offer = type === "tcf_canada" ? null : normalizeNexaOffer(nexaOffer);
    const tcfPlan = type === "tcf_canada" ? normalizeTcfPlan(planType) : null;

    // ── 1. Compte auth ────────────────────────────────────────────────────────
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: ownerEmail.trim().toLowerCase(),
      password: ownerPassword,
      email_confirm: true,
    });
    if (authErr || !authData.user) {
      const msg = authErr?.message || "Erreur création du compte.";
      if (msg.includes("already")) return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 400 });
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const userId = authData.user.id;

    // ── 2. Slug du centre ─────────────────────────────────────────────────────
    const baseSlug = centerName.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    // S'assurer qu'il est unique
    const { data: existingSlug } = await supabaseAdmin
      .from("centers").select("slug").eq("slug", baseSlug).maybeSingle();
    const slug = existingSlug
      ? `${baseSlug}-${Date.now().toString(36)}`
      : baseSlug;

    // ── 3. Centre (status: pending = en attente d'approbation NEXA) ───────────
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: center, error: centerErr } = await supabaseAdmin
      .from("centers")
      .insert({
        name: centerName.trim(),
        city: city.trim(),
        country: country || null,
        region: region || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        center_type: type,
        slug,
        signup_slug: slug,
        status: "pending",
        plan_type: tcfPlan,
        nexa_offer: offer,
        email: ownerEmail.trim().toLowerCase(),
        trial_ends_at: trialEndsAt,
      })
      .select("id, slug")
      .single();

    if (centerErr || !center) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: centerErr?.message || "Erreur création du centre." }, { status: 400 });
    }

    // ── 4. Campus principal ───────────────────────────────────────────────────
    await supabaseAdmin.from("campuses").insert({
      center_id: center.id,
      name: `Campus ${city.trim()}`,
      city: city.trim(),
      is_main: true,
      status: "actif",
    });

    // ── 5. Profil manager ─────────────────────────────────────────────────────
    const { error: profileErr } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      prenom: ownerPrenom.trim(),
      nom: ownerNom.trim(),
      email: ownerEmail.trim().toLowerCase(),
      phone: phone?.trim() || null,
      role: "center_manager",
      center_id: center.id,
      onboarding_step: "welcome",
      job_title: ownerRole?.trim() || null,
    }, { onConflict: "id" });

    if (profileErr) {
      await supabaseAdmin.from("centers").delete().eq("id", center.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    // ── 6. Lien center_users ──────────────────────────────────────────────────
    await supabaseAdmin.from("center_users").upsert({
      center_id: center.id,
      user_id: userId,
      role: "manager",
      role_label: ownerRole?.trim() || "Directeur",
      permissions: ["finance", "etudiants", "filieres", "staff", "communaute", "parametres", "planning", "examens", "rapports", "cours", "lives"],
    }, { onConflict: "center_id,user_id" });

    // ── 7. Branding initial ───────────────────────────────────────────────────
    await supabaseAdmin.from("center_branding").upsert({
      center_id: center.id,
      legal_name: centerName.trim(),
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      country: country || null,
    }, { onConflict: "center_id" });

    // ── 7 bis. Canal « Général » : annonces regroupant tous les étudiants ──────
    // Idempotent et non bloquant : ne doit pas faire échouer la création du centre.
    try {
      await supabaseAdmin.rpc("ensure_center_general_room", {
        p_center_id: center.id,
        p_created_by: userId,
      });
    } catch (e) {
      console.error("ensure_center_general_room:", e);
    }

    // ── 8. Filière TCF (si centre TCF) ────────────────────────────────────────
    let tcfFiliereId: string | null = null;
    if (type === "tcf_canada") {
      // Vérifie si elle existe déjà (idempotent)
      const { data: existing } = await supabaseAdmin
        .from("filieres")
        .select("id")
        .eq("center_id", center.id)
        .eq("name", "TCF Canada")
        .maybeSingle();

      if (existing) {
        tcfFiliereId = existing.id;
      } else {
        const { data: newFiliere } = await supabaseAdmin
          .from("filieres")
          .insert({
            center_id: center.id,
            created_by: userId,
            name: "TCF Canada",
            type: "formation_courte",
            mode: "presentiel",
            discipline_type: "tcf_canada",
            duree_valeur: 3,
            duree_unite: "mois",
            status: "draft",
          })
          .select("id")
          .single();
        tcfFiliereId = newFiliere?.id || null;
      }
    }

    // Notification NEXA (non bloquante — s'il existe une table admin_notifications)
    supabaseAdmin.from("admin_notifications").insert({
      type: "new_center_request",
      title: `Nouvelle demande : ${centerName.trim()}`,
      body: `Type : ${type} · Ville : ${city.trim()}${country ? " · " + country : ""} · Contact : ${ownerEmail.trim()}${ownerRole ? " · Rôle : " + ownerRole : ""}`,
      status: "unread",
      metadata: { centerId: center.id, centerType: type },
    }).then(() => {}).then(undefined, () => {});

    return NextResponse.json({
      centerId: center.id,
      slug: center.slug,
      centerType: type,
      tcfFiliereId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur serveur." }, { status: 500 });
  }
}

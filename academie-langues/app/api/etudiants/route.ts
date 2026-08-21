import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/app/utils/email-server";
import {
  finalizeStudentClassroom,
  countGroupesForFiliere,
  resolveSignupGroupeId,
} from "@/app/utils/studentClassroom.server";
import {
  getNexaB2bProfileQuotas,
  resolveEffectiveNexaOfferKey,
  type NexaOfferKey,
} from "@/app/data/nexaOffers";
import { assertCenterHasStudentSeat } from "@/app/utils/center-student-quota";
import {
  catalogTotalShort,
  isShortPricingMode,
  parsePaymentPlanInstallments,
  scaleInstallmentsToTotal,
  sumPaymentPlanFees,
  type ShortPricingMode,
} from "@/app/utils/short-pricing";
import {
  isCursusFeeMode,
  resolveCursusTuition,
} from "@/app/utils/cursus-passage";
import { isPluriannualCenter, normalizeCenterType } from "@/app/data/center-types";
import { TUTOR_EXCHANGE_QUOTA } from "@/app/utils/tutor-quota";
import {
  computeCouponDiscount,
  fetchValidCoupon,
  incrementCouponUse,
} from "@/app/utils/coupon.server";
import { getPublicSiteUrl } from "@/app/utils/public-site-url";
import { generateSecureTemporaryPassword } from "@/app/utils/secure-password";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generatePassword(): string {
  return generateSecureTemporaryPassword();
}

type CallerAuth = {
  userId: string;
  centerId: string | null;
  isGlobalAdmin: boolean;
  canCreateStudents: boolean;
  canHardDeleteStudents: boolean;
};

/** Managers + staff/trainer avec permission `etudiants`. Hard-delete = managers seulement. */
async function authorizeStudentManagement(token: string | undefined): Promise<
  | { auth: CallerAuth; error: null }
  | { auth: null; error: NextResponse }
> {
  if (!token) {
    return { auth: null, error: NextResponse.json({ error: "Non authentifié." }, { status: 401 }) };
  }

  const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(token);
  if (callerErr || !callerData.user) {
    return { auth: null, error: NextResponse.json({ error: "Session invalide." }, { status: 401 }) };
  }

  const userId = callerData.user.id;
  const { data: callerProfile } = await supabaseAdmin
    .from("profiles")
    .select("role, center_id")
    .eq("id", userId)
    .single();

  const { data: centerMembership } = await supabaseAdmin
    .from("center_users")
    .select("center_id, role, permissions")
    .eq("user_id", userId)
    .maybeSingle();

  const centerId = (centerMembership?.center_id || callerProfile?.center_id) as string | null;
  const role = callerProfile?.role || "";
  const isGlobalAdmin = role === "admin";
  const isManager = role === "center_manager" || role === "campus_manager";

  let hasEtudiantsPerm = false;
  if (!isGlobalAdmin && !isManager && (role === "staff" || role === "trainer") && centerId) {
    const membershipPerms = Array.isArray(centerMembership?.permissions)
      ? (centerMembership!.permissions as string[])
      : [];
    if (membershipPerms.includes("etudiants")) {
      hasEtudiantsPerm = true;
    } else {
      const { data: permRow } = await supabaseAdmin
        .from("staff_permissions")
        .select("permission")
        .eq("profile_id", userId)
        .eq("permission", "etudiants")
        .maybeSingle();
      hasEtudiantsPerm = Boolean(permRow);
    }
  }

  const canCreateStudents = isGlobalAdmin || isManager || hasEtudiantsPerm;
  const canHardDeleteStudents = isGlobalAdmin || isManager;

  if (!canCreateStudents && !canHardDeleteStudents) {
    return {
      auth: null,
      error: NextResponse.json({ error: "Action non autorisée." }, { status: 403 }),
    };
  }
  if (!centerId && !isGlobalAdmin) {
    return {
      auth: null,
      error: NextResponse.json({ error: "Centre introuvable pour ce compte." }, { status: 403 }),
    };
  }

  return {
    auth: {
      userId,
      centerId,
      isGlobalAdmin,
      canCreateStudents,
      canHardDeleteStudents,
    },
    error: null,
  };
}

function shortDureeToNiveauFields(valeur: number, unite: string | null) {
  const v = Math.max(0, Math.floor(Number(valeur) || 0));
  return {
    mois: unite === "mois" ? v : 0,
    semaines: unite === "semaines" ? v : 0,
    jours: unite === "jours" ? v : 0,
  };
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { auth, error: authError } = await authorizeStudentManagement(token);
    if (authError || !auth) return authError!;
    if (!auth.canCreateStudents) {
      return NextResponse.json({ error: "Action non autorisée." }, { status: 403 });
    }

    const isGlobalAdmin = auth.isGlobalAdmin;
    const callerCenterId = auth.centerId;

    // ---- 2. Lire et valider le corps ----
    const body = await req.json();
    const {
      prenom, nom, phone,
      filiere_id, niveau_id, groupe_id, campus_id, tuition_fee,
    } = body;
    const normalizedEmail = String(body.email || "").trim().toLowerCase();

    if (!prenom || !nom || !normalizedEmail || !filiere_id) {
      return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
    }

    // ---- 3. Vérifier la filière ----
    const { data: filiere, error: filErr } = await supabaseAdmin
      .from("filieres")
      .select("center_id, type, pricing_mode, default_tuition_fee, duree_valeur, duree_unite, payment_plan, cursus_fee_mode")
      .eq("id", filiere_id)
      .single();
    if (filErr || !filiere) return NextResponse.json({ error: "Programme introuvable." }, { status: 404 });
    if (filiere.center_id !== callerCenterId) {
      return NextResponse.json({ error: "Programme hors de votre centre." }, { status: 403 });
    }

    const isShortFiliere = filiere.type === "formation_courte";
    const isCursusFiliere = filiere.type === "cursus";
    const shortPricingMode: ShortPricingMode = isShortFiliere
      ? (isShortPricingMode(filiere.pricing_mode) ? filiere.pricing_mode : "forfaitaire")
      : "forfaitaire";

    // Durée / total pour formation courte uniquement
    let shortDurationMonths: number | null = null;
    let shortDurationValue: number | null = null;
    let shortDurationUnit: string | null = null;
    let shortCatalogTotal: number | null = null;
    let resolvedTuition = Number(tuition_fee) || 0;

    if (isShortFiliere) {
      const extras = sumPaymentPlanFees(filiere.payment_plan);
      const baseFee = Number(filiere.default_tuition_fee) || 0;

      if (shortPricingMode === "mensuel") {
        const months = Math.floor(Number(body.duration_months || body.duration_value) || 0);
        if (months < 1) {
          return NextResponse.json({ error: "Durée en mois requise pour ce programme." }, { status: 400 });
        }
        shortDurationMonths = months;
        shortDurationValue = months;
        shortDurationUnit = "month";
        shortCatalogTotal = catalogTotalShort({
          pricingMode: "mensuel",
          defaultTuitionFee: baseFee,
          months,
          extraFees: extras,
        });
        resolvedTuition = shortCatalogTotal;
      } else {
        shortCatalogTotal = catalogTotalShort({
          pricingMode: "forfaitaire",
          defaultTuitionFee: baseFee,
          extraFees: extras,
        });
        resolvedTuition = shortCatalogTotal;
        if (filiere.duree_valeur) {
          shortDurationValue = Number(filiere.duree_valeur) || null;
          shortDurationUnit =
            filiere.duree_unite === "mois"
              ? "month"
              : filiere.duree_unite === "semaines"
                ? "week"
                : filiere.duree_unite === "jours"
                  ? "day"
                  : null;
          if (shortDurationUnit === "month") {
            shortDurationMonths = shortDurationValue;
          }
        }
      }
    }

    // Cursus : prix formation + frais du niveau (payment_plan.fees) ou de la filière (uniforme)
    let cursusPaymentPlan: unknown = null;
    if (isCursusFiliere && niveau_id) {
      const feeMode = isCursusFeeMode(filiere.cursus_fee_mode)
        ? filiere.cursus_fee_mode
        : "par_niveau";
      const { data: nivRow } = await supabaseAdmin
        .from("niveaux")
        .select("tuition_fee, payment_plan")
        .eq("id", niveau_id)
        .maybeSingle();
      // Uniforme → échéancier filière ; par_niveau → échéancier du niveau
      cursusPaymentPlan =
        feeMode === "uniforme" ? filiere.payment_plan : (nivRow?.payment_plan ?? null);
      // Frais configurés par niveau ou par filière (UI « Frais supplémentaires »)
      const extras =
        feeMode === "par_niveau"
          ? sumPaymentPlanFees(nivRow?.payment_plan)
          : sumPaymentPlanFees(filiere.payment_plan);
      resolvedTuition = resolveCursusTuition({
        feeMode,
        filiereDefault: filiere.default_tuition_fee,
        niveauTuition: nivRow?.tuition_fee ?? null,
        extraFees: extras,
      });
    }

    const academicYear =
      isCursusFiliere && typeof body.academic_year === "string" && body.academic_year.trim()
        ? body.academic_year.trim()
        : null;

    const couponCode =
      typeof body.coupon_code === "string" ? body.coupon_code.trim() : "";
    let couponDiscount = 0;
    let couponId: string | null = null;
    if (couponCode) {
      if (!callerCenterId) {
        return NextResponse.json({ error: "Centre introuvable pour ce coupon." }, { status: 403 });
      }
      const couponResult = await fetchValidCoupon(supabaseAdmin, callerCenterId, couponCode);
      if (!couponResult.ok) {
        return NextResponse.json({ error: couponResult.error }, { status: 400 });
      }
      couponDiscount = computeCouponDiscount(couponResult.coupon, resolvedTuition);
      couponId = couponResult.coupon.id;
      if (couponDiscount <= 0) {
        return NextResponse.json({ error: "Coupon sans effet sur ce montant." }, { status: 400 });
      }
    }

    // ---- 4. Résoudre le campus via filiere_campus ----
    let resolvedCampusId: string | null = campus_id || null;

    if (!resolvedCampusId) {
      // Priorité 1 : chercher dans filiere_campus
      const { data: linkedCampuses } = await supabaseAdmin
        .from("filiere_campus")
        .select("campus_id")
        .eq("filiere_id", filiere_id);

      if (linkedCampuses && linkedCampuses.length === 1) {
        // Un seul campus lié → auto-assignation
        resolvedCampusId = linkedCampuses[0].campus_id;
      } else if (linkedCampuses && linkedCampuses.length > 1) {
        // Plusieurs campus liés mais aucun choisi → erreur
        return NextResponse.json({
          error: "Ce programme est enseigné sur plusieurs campus. Veuillez en sélectionner un.",
          campuses: linkedCampuses.map((c) => c.campus_id),
        }, { status: 400 });
      } else {
        // Priorité 2 : fallback sur le campus principal du centre
        const { data: mainCampus } = await supabaseAdmin
          .from("campuses")
          .select("id")
          .eq("center_id", callerCenterId!)
          .eq("is_main", true)
          .maybeSingle();
        resolvedCampusId = mainCampus?.id ?? null;
      }
    } else {
      // Vérifier que le campus fourni appartient bien au centre
      const { data: camp } = await supabaseAdmin
        .from("campuses").select("id").eq("id", campus_id).eq("center_id", callerCenterId!).maybeSingle();
      if (!camp) return NextResponse.json({ error: "Campus invalide pour ce centre." }, { status: 403 });
      resolvedCampusId = camp.id;
    }

    if (!resolvedCampusId) {
      return NextResponse.json({ error: "Aucun campus configuré pour ce centre." }, { status: 400 });
    }

    // ---- 4a. Plafond étudiants + type centre selon offre NEXA ----
    let centerTypeRaw: string | null = null;
    let centerQuotaOverrides: Record<string, unknown> | null = null;
    let centerOfferKey: NexaOfferKey = "decouverte";
    if (callerCenterId) {
      const { data: centerRow } = await supabaseAdmin
        .from("centers")
        .select("nexa_offer, status, created_at, center_type, quota_overrides")
        .eq("id", callerCenterId)
        .maybeSingle();
      centerTypeRaw = centerRow?.center_type ?? null;
      centerOfferKey = resolveEffectiveNexaOfferKey(centerRow);
      centerQuotaOverrides =
        centerRow?.quota_overrides && typeof centerRow.quota_overrides === "object"
          ? (centerRow.quota_overrides as Record<string, unknown>)
          : null;
      const seatCheck = await assertCenterHasStudentSeat(callerCenterId, supabaseAdmin);
      if (!seatCheck.ok) {
        return NextResponse.json(
          {
            error: `Quota utilisateurs atteint pour l'offre ${seatCheck.offerName} (${seatCheck.occupied}/${seatCheck.max}). Contactez votre responsable pour passer à une offre supérieure.`,
            code: "SEAT_LIMIT_REACHED",
            occupied: seatCheck.occupied,
            max: seatCheck.max,
            offerName: seatCheck.offerName,
          },
          { status: 403 },
        );
      }
    }

    const isPluri = Boolean(callerCenterId) && isPluriannualCenter(centerTypeRaw);
    const centerType = normalizeCenterType(centerTypeRaw);
    const emailLocale = centerTypeRaw === "tcf_canada" ? "fr" : (body.locale === "en" ? "en" : "fr");

    // Centres libres (generic) : genre + date de naissance obligatoires — sans toucher TCF / courte
    const genreRaw = typeof body.genre === "string" ? body.genre.trim() : "";
    const birthDateRaw = typeof body.birth_date === "string" ? body.birth_date.trim() : "";
    const genreOk = genreRaw === "Homme" || genreRaw === "Femme" || genreRaw === "Autre";
    const birthOk = /^\d{4}-\d{2}-\d{2}$/.test(birthDateRaw);
    if (isPluri) {
      if (!genreOk) {
        return NextResponse.json({ error: "Genre requis (Homme, Femme ou Autre)." }, { status: 400 });
      }
      if (!birthOk) {
        return NextResponse.json({ error: "Date de naissance requise (AAAA-MM-JJ)." }, { status: 400 });
      }
    }

    // ---- 4b. Résolution du niveau pour les programmes courts ----
    let resolvedNiveauId = niveau_id || null;

    if (!resolvedNiveauId && isShortFiliere) {
      const durFields =
        shortPricingMode === "forfaitaire" && filiere.duree_valeur
          ? shortDureeToNiveauFields(Number(filiere.duree_valeur), filiere.duree_unite)
          : shortDurationMonths
            ? { mois: shortDurationMonths, semaines: 0, jours: 0 }
            : { mois: 0, semaines: 0, jours: 0 };

      const { data: existingNiveau } = await supabaseAdmin
        .from("niveaux")
        .select("id, mois, semaines, jours")
        .eq("filiere_id", filiere_id)
        .is("annee", null)
        .maybeSingle();

      if (existingNiveau) {
        resolvedNiveauId = existingNiveau.id;
        const needsDur =
          !(existingNiveau.mois || existingNiveau.semaines || existingNiveau.jours) &&
          (durFields.mois || durFields.semaines || durFields.jours);
        if (needsDur) {
          await supabaseAdmin.from("niveaux").update(durFields).eq("id", existingNiveau.id);
        }
      } else {
        const { data: newNiveau, error: nivErr } = await supabaseAdmin
          .from("niveaux")
          .insert({
            filiere_id: filiere_id,
            annee: null,
            ...durFields,
          })
          .select("id")
          .single();

        if (!nivErr && newNiveau) {
          resolvedNiveauId = newNiveau.id;
        }
      }
    }

    if (!resolvedNiveauId && filiere.type === "cursus") {
      return NextResponse.json({ error: "Niveau requis pour ce programme." }, { status: 400 });
    }

    const resolvedGroupeId = await resolveSignupGroupeId(
      supabaseAdmin,
      filiere_id,
      groupe_id || null,
      resolvedNiveauId,
    );

    if (!resolvedGroupeId) {
      const groupeCount = await countGroupesForFiliere(
        supabaseAdmin,
        filiere_id,
        resolvedNiveauId,
      );
      if (groupeCount > 1) {
        return NextResponse.json({
          error: "Choisissez une salle de classe pour cet étudiant.",
        }, { status: 400 });
      }
    }

    // ---- 5. Créer le compte auth ----
    const password = generatePassword();
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { prenom, nom, center_id: callerCenterId },
    });
    if (createErr || !newUser.user) {
      const msg = createErr?.message || "Création du compte échouée.";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
        return NextResponse.json({
          error: "Cet e-mail est déjà utilisé. Utilisez un autre e-mail ou réinitialisez le mot de passe existant.",
        }, { status: 409 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    const newStudentId = newUser.user.id;

    const subscriptionEndsAt = (() => {
      if (isShortFiliere && shortDurationMonths && shortDurationMonths > 0) {
        return new Date(Date.now() + shortDurationMonths * 30 * 24 * 60 * 60 * 1000).toISOString();
      }
      if (isShortFiliere && shortDurationValue && shortDurationUnit) {
        const days =
          shortDurationUnit === "month"
            ? shortDurationValue * 30
            : shortDurationUnit === "week"
              ? shortDurationValue * 7
              : shortDurationValue;
        return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }
      return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    })();
    // Pluri : pas de pack TCF. Autres centres : quotas B2B NEXA (TCF / courte).
    const quotas = isPluri
      ? {
          pack_name: "pluriannuel",
          ee_total: 0,
          ee_used: 0,
          exam_total: 0,
          exam_used: 0,
          exam_4m_total: 0,
          exam_4m_used: 0,
          eo_total: 0,
          eo_used: 0,
          coaching_total: 0,
          coaching_used: 0,
          tutor_ia_total: TUTOR_EXCHANGE_QUOTA,
          tutor_ia_used: 0,
        }
      : getNexaB2bProfileQuotas(centerQuotaOverrides, 1, centerOfferKey);

    // ---- 6. Renseigner le profil ----
    // Le trigger on_auth_user_created peut pré-créer la ligne avec un tag_status
    // indésirable (ex. revoque) — on force toujours active/normal (fallback actif).
    const profilePayload: Record<string, unknown> = {
      id: newStudentId,
      prenom,
      nom,
      email: normalizedEmail,
      phone: phone || null,
      role: "student",
      center_id: callerCenterId,
      center_status: "active",
      tag_status: "normal",
      formation: isPluri ? "pluriannuel" : centerType === "formation_courte" ? "formation_courte" : "tcf",
      formations: isPluri
        ? ["pluriannuel"]
        : centerType === "formation_courte"
          ? ["formation_courte"]
          : ["tcf"],
      activated_at: new Date().toISOString(),
      subscription_ends_at: subscriptionEndsAt,
      ...quotas,
      must_change_password: true,
      simulations_completed: 0,
      created_at: new Date().toISOString(),
    };
    if (isPluri) {
      profilePayload.genre = genreRaw;
      profilePayload.birth_date = birthDateRaw;
    }

    let { error: profErr } = await supabaseAdmin.from("profiles").upsert(profilePayload);
    // Colonnes optionnelles absentes en DB : réessayer sans genre / birth_date
    if (profErr && isPluri && /genre|birth_date/i.test(profErr.message)) {
      delete profilePayload.genre;
      delete profilePayload.birth_date;
      ({ error: profErr } = await supabaseAdmin.from("profiles").upsert(profilePayload));
    }

    if (profErr) {
      const { error: fallbackErr } = await supabaseAdmin.from("profiles").upsert({
        ...profilePayload,
        tag_status: "actif",
      });
      profErr = fallbackErr;
    }

    if (profErr) {
      await supabaseAdmin.auth.admin.deleteUser(newStudentId);
      return NextResponse.json({ error: "Échec du profil : " + profErr.message }, { status: 500 });
    }

    // ---- 7. Inscription ----
    // On utilise supabaseAdmin directement car l'appelant est déjà vérifié
    const { data: enrollmentId, error: enrollErr } = await supabaseAdmin.rpc("enroll_student", {
      p_student_id: newStudentId,
      p_filiere_id: filiere_id,
      p_niveau_id: resolvedNiveauId,
      p_groupe_id: resolvedGroupeId,
      p_tuition_fee: resolvedTuition,
      p_creator: auth.userId,
      p_campus_id: resolvedCampusId,
    });

    if (enrollErr) {
      await supabaseAdmin.auth.admin.deleteUser(newStudentId);
      return NextResponse.json({ error: "Échec de l'inscription : " + enrollErr.message }, { status: 500 });
    }

    const enrollmentPatch: Record<string, unknown> = { status: "active" };
    if (isShortFiliere) {
      if (shortCatalogTotal != null) enrollmentPatch.catalog_tuition_fee = shortCatalogTotal;
      if (shortDurationValue != null) enrollmentPatch.duration_value = shortDurationValue;
      if (shortDurationUnit) enrollmentPatch.duration_unit = shortDurationUnit;
      if (shortDurationMonths != null) enrollmentPatch.duration_months = shortDurationMonths;
      enrollmentPatch.tuition_fee = resolvedTuition;
    }
    if (isCursusFiliere) {
      enrollmentPatch.tuition_fee = resolvedTuition;
      if (academicYear) enrollmentPatch.academic_year = academicYear;
    }

    await supabaseAdmin
      .from("enrollments")
      .update(enrollmentPatch)
      .eq("id", enrollmentId);

    // Échéancier catalogue (formation courte = filiere ; cursus = niveau)
    if (enrollmentId && resolvedTuition > 0) {
      const planSource = isShortFiliere
        ? filiere.payment_plan
        : isCursusFiliere
          ? cursusPaymentPlan
          : null;
      if (planSource) {
        const { count: existingInstallmentsCount } = await supabaseAdmin
          .from("enrollment_installments")
          .select("id", { count: "exact", head: true })
          .eq("enrollment_id", enrollmentId);

        const templates = parsePaymentPlanInstallments(planSource);
        const rows = existingInstallmentsCount ? [] : scaleInstallmentsToTotal(templates, resolvedTuition);
        if (rows.length > 0) {
          const { error: instErr } = await supabaseAdmin.from("enrollment_installments").insert(
            rows.map((r) => ({
              enrollment_id: enrollmentId,
              label: r.label,
              amount: r.amount,
              due_date: r.due_date,
              status: "pending",
              paid_amount: 0,
              position: r.position,
            })),
          );
          if (instErr) {
            console.warn("[etudiants] enrollment_installments:", instErr.message);
          }
        }
      }
    }

    if (couponDiscount > 0 && enrollmentId) {
      const { error: discErr } = await supabaseAdmin.rpc("apply_enrollment_discount", {
        p_enrollment_id: enrollmentId,
        p_amount: couponDiscount,
        p_reason: `Coupon ${couponCode.toUpperCase()}`,
        p_actor: auth.userId,
      });
      if (discErr) {
        console.warn("[etudiants] apply_enrollment_discount:", discErr.message);
      } else if (couponId) {
        await incrementCouponUse(supabaseAdmin, couponId);
      }
    }

    if (resolvedGroupeId && callerCenterId) {
      await finalizeStudentClassroom(supabaseAdmin, {
        studentId: newStudentId,
        centerId: callerCenterId,
        groupeId: resolvedGroupeId,
      });
    }

    // ---- 8. Envoyer les accès ----
    let emailResult = { sent: false };
    try {
      const loginBase = getPublicSiteUrl();
      const loginUrl = `${loginBase}/login?lang=${emailLocale}`;
      emailResult = await sendEmail({
        to: normalizedEmail,
        subject: emailLocale === "en" ? "Your Nexa Academy access" : "Vos accès Nexa Academy",
        text: emailLocale === "en"
          ? `Hello ${prenom},\n\nYour learner account has been created.\nEmail: ${normalizedEmail}\nTemporary password: ${password}\n\nSign in here: ${loginUrl}\n\nYou will be asked to change your password the first time you sign in.`
          : `Bonjour ${prenom},\n\nVotre compte étudiant a été créé.\nIdentifiant : ${normalizedEmail}\nMot de passe temporaire : ${password}\n\nConnectez-vous sur : ${loginUrl}\n\nIl vous sera demandé de le changer à la première connexion.`,
      });
    } catch (mailErr) {
      console.error("[etudiants] email échoué (non bloquant):", mailErr);
      emailResult = { sent: false };
    }

    return NextResponse.json({
      success: true,
      studentId: newStudentId,
      enrollmentId,
      emailSent: emailResult.sent,
      temporaryPassword: password,
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { auth, error: authError } = await authorizeStudentManagement(token);
    if (authError || !auth) return authError!;
    if (!auth.canHardDeleteStudents) {
      return NextResponse.json(
        { error: "Seul un directeur peut supprimer définitivement un étudiant." },
        { status: 403 }
      );
    }

    const isGlobalAdmin = auth.isGlobalAdmin;
    const callerCenterId = auth.centerId;

    const studentId = new URL(req.url).searchParams.get("id");
    if (!studentId) return NextResponse.json({ error: "ID manquant." }, { status: 400 });

    const { data: student } = await supabaseAdmin
      .from("profiles")
      .select("center_id, role")
      .eq("id", studentId)
      .eq("role", "student")
      .maybeSingle();

    if (!student) return NextResponse.json({ error: "Étudiant introuvable." }, { status: 404 });

    if (!isGlobalAdmin && student.center_id !== callerCenterId) {
      return NextResponse.json({ error: "Étudiant hors de votre centre." }, { status: 403 });
    }

    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(studentId);
    if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erreur serveur." }, { status: 500 });
  }
}

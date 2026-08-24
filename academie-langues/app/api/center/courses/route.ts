import { NextResponse } from "next/server";
import { getCenterStaffContext, requireCenterPermission, supabaseAdmin } from "@/app/utils/center-auth-server";
import { getOfferQuota, resolveEffectiveNexaOffer, resolveEffectiveNexaOfferKey } from "@/app/data/nexaOffers";

const message = (req: Request, fr: string, en: string) => req.headers.get("x-nexa-locale") === "en" ? en : fr;

export async function POST(req: Request) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;
  const permissionError = await requireCenterPermission(ctx!, "cours");
  if (permissionError) return permissionError;
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const disciplineId = typeof body.disciplineId === "string" ? body.disciplineId : "";
  const groupeIds = Array.isArray(body.groupeIds)
    ? [...new Set<string>(body.groupeIds.filter((id: unknown): id is string => typeof id === "string"))]
    : [];
  if (!title || !disciplineId) {
    return NextResponse.json({ error: message(req, "Titre et matière requis.", "Title and subject are required.") }, { status: 400 });
  }

  const { data: discipline } = await supabaseAdmin
    .from("disciplines")
    .select("id, filieres!inner(center_id)")
    .eq("id", disciplineId)
    .eq("filieres.center_id", ctx!.centerId)
    .maybeSingle();
  if (!discipline) {
    return NextResponse.json({ error: message(req, "Matière invalide pour ce centre.", "Invalid subject for this center.") }, { status: 400 });
  }

  const { data: center } = await supabaseAdmin.from("centers")
    .select("nexa_offer, status, created_at, trial_ends_at, quota_overrides")
    .eq("id", ctx!.centerId).maybeSingle();
  if (!center) return NextResponse.json({ error: message(req, "Centre introuvable.", "Center not found.") }, { status: 404 });

  const overrides = center.quota_overrides && typeof center.quota_overrides === "object"
    ? center.quota_overrides as Record<string, unknown> : null;
  const max = getOfferQuota(resolveEffectiveNexaOfferKey(center), "courseBuilderPerMonth", overrides);
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await supabaseAdmin.from("courses")
    .select("id", { count: "exact", head: true })
    .eq("center_id", ctx!.centerId).gte("created_at", monthStart.toISOString());
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
  if (typeof max === "number" && (count ?? 0) >= max) {
    const offer = resolveEffectiveNexaOffer(center);
    return NextResponse.json({
      error: message(req,
        `Votre offre ${offer.name} est limitée à ${max} créations de cours par mois. Contactez votre responsable pour passer à une offre supérieure.`,
        `Your ${offer.name} plan is limited to ${max} course creations per month. Contact your account manager to upgrade.`),
      code: "COURSE_QUOTA_REACHED",
    }, { status: 409 });
  }

  if (groupeIds.length > 0) {
    const { data: validGroups } = await supabaseAdmin.from("groupes")
      .select("id, filieres!inner(center_id)").in("id", groupeIds).eq("filieres.center_id", ctx!.centerId);
    if ((validGroups ?? []).length !== groupeIds.length) {
      return NextResponse.json({ error: message(req, "Un groupe est invalide.", "A group is invalid.") }, { status: 400 });
    }
  }

  const { data: course, error: insertError } = await supabaseAdmin.from("courses").insert({
    center_id: ctx!.centerId,
    discipline_id: disciplineId,
    title: title.slice(0, 180),
    description: description.slice(0, 4000) || null,
    downloadable: body.downloadable !== false,
    created_by: ctx!.user.id,
  }).select("id").single();
  if (insertError || !course) return NextResponse.json({ error: insertError?.message || "Création impossible." }, { status: 500 });

  if (groupeIds.length > 0) {
    const { error: groupError } = await supabaseAdmin.from("course_groupes")
      .insert(groupeIds.map((groupeId) => ({ course_id: course.id, groupe_id: groupeId })));
    if (groupError) {
      await supabaseAdmin.from("courses").delete().eq("id", course.id);
      return NextResponse.json({ error: groupError.message }, { status: 500 });
    }
  }
  return NextResponse.json({ course }, { status: 201 });
}

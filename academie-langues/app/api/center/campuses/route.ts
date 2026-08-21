import { NextResponse } from "next/server";
import { getCenterStaffContext, supabaseAdmin } from "@/app/utils/center-auth-server";
import { assertCenterHasCampusSlot } from "@/app/utils/center-campus-quota";

function quotaMessage(req: Request, max: number) {
  const en = req.headers.get("x-nexa-locale") === "en";
  return en
    ? `Your current plan is limited to ${max} campus${max === 1 ? "" : "es"}. Contact your account manager to upgrade to a higher plan.`
    : `Votre offre actuelle est limitée à ${max} campus. Contactez votre responsable pour passer à une offre supérieure.`;
}

export async function GET(req: Request) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;

  try {
    const quota = await assertCenterHasCampusSlot(ctx!.centerId, supabaseAdmin);
    return NextResponse.json({
      occupied: quota.occupied,
      max: quota.max,
      offerName: quota.offerName,
      canCreate: quota.ok,
    });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Impossible de vérifier le quota campus." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;
  if (ctx!.role !== "center_manager") {
    return NextResponse.json({ error: "Seul le responsable du centre peut créer un campus." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Le nom du campus est requis." }, { status: 400 });
  if (name.length > 120) return NextResponse.json({ error: "Le nom du campus est trop long." }, { status: 400 });

  try {
    const quota = await assertCenterHasCampusSlot(ctx!.centerId, supabaseAdmin);
    if (!quota.ok) {
      return NextResponse.json(
        { error: quotaMessage(req, quota.max), code: "CAMPUS_QUOTA_REACHED", ...quota },
        { status: 409 },
      );
    }

    const { data, error: insertError } = await supabaseAdmin
      .from("campuses")
      .insert({
        center_id: ctx!.centerId,
        name,
        is_main: quota.occupied === 0,
        status: "en_construction",
      })
      .select()
      .single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json({ campus: data, max: quota.max }, { status: 201 });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Impossible de créer le campus." },
      { status: 500 },
    );
  }
}

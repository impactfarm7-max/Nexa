import { NextResponse } from "next/server";
import { getSuperadminContext, logSuperadminAction, supabaseAdmin } from "@/app/utils/superadmin-auth-server";
import { approveCenterApplication } from "@/app/utils/center-application-approve";

const ALLOWED_STATUS = new Set(["new", "contacted", "approved", "rejected"]);

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const { ctx, error } = await getSuperadminContext(req);
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Demande manquante." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const status = typeof body.status === "string" ? body.status : null;
  if (!status || !ALLOWED_STATUS.has(status)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }
  if (status === "approved") {
    return NextResponse.json(
      { error: "Utilisez POST pour approuver une demande." },
      { status: 400 },
    );
  }

  const { data, error: updateError } = await supabaseAdmin
    .from("center_applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !data) {
    return NextResponse.json(
      { error: updateError?.message || "Demande introuvable." },
      { status: updateError ? 500 : 404 },
    );
  }

  await logSuperadminAction(ctx.user.id, "application.status_update", {
    targetType: "center_application",
    targetId: id,
    metadata: { status },
    req,
  });

  return NextResponse.json({ application: data });
}

export async function POST(req: Request, { params }: RouteParams) {
  const { ctx, error } = await getSuperadminContext(req);
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "approve";
  if (action !== "approve") {
    return NextResponse.json({ error: "Action non supportée." }, { status: 400 });
  }

  const result = await approveCenterApplication(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await logSuperadminAction(ctx.user.id, "application.approve", {
    targetType: "center_application",
    targetId: id,
    metadata: { centerId: (result.center as { id?: string }).id },
    req,
  });

  return NextResponse.json({
    center: result.center,
    credentials: result.credentials,
  });
}

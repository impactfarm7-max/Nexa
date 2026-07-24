import { NextRequest, NextResponse } from "next/server";
import { getSuperadminContext, logSuperadminAction, supabaseAdmin } from "@/app/utils/superadmin-auth-server";

function generatePassword(prenom: string): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  const base = prenom.trim().charAt(0).toUpperCase() + prenom.trim().slice(1, 4).toLowerCase();
  return `${base || "Iag"}${digits}`;
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  if (body?.action !== "reset_password") {
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  }

  const { data: student, error: studentError } = await supabaseAdmin
    .from("profiles")
    .select("id, prenom, email, center_id, role")
    .eq("id", id)
    .eq("role", "student")
    .maybeSingle();

  if (studentError) return NextResponse.json({ error: studentError.message }, { status: 500 });
  if (!student) return NextResponse.json({ error: "Etudiant introuvable." }, { status: 404 });

  const password = generatePassword(student.prenom || "Nexa");
  const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(id, { password });
  if (pwdError) return NextResponse.json({ error: pwdError.message }, { status: 500 });

  await logSuperadminAction(ctx.user.id, "student_password_reset", {
    targetType: "student",
    targetId: id,
    metadata: { email: student.email, centerId: student.center_id },
    req,
  });

  return NextResponse.json({ ok: true, email: student.email, password, prenom: student.prenom });
}

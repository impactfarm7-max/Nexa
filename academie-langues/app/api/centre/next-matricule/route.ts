import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { formatMatricule, resolveStudentIdPrefix } from "@/app/utils/student-matricule.server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** Aperçu en lecture seule du prochain matricule — ne touche jamais le compteur. */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("center_id")
    .eq("id", user.id)
    .maybeSingle();

  const centerId = profile?.center_id;
  if (!centerId) return NextResponse.json({ error: "Centre introuvable." }, { status: 404 });

  const { data: centerRow } = await supabaseAdmin
    .from("centers")
    .select("student_id_prefix")
    .eq("id", centerId)
    .maybeSingle();
  const prefix = resolveStudentIdPrefix(centerRow?.student_id_prefix ?? null);

  const year = new Date().getFullYear();
  const { data: counterRow } = await supabaseAdmin
    .from("center_student_counters")
    .select("counter")
    .eq("center_id", centerId)
    .eq("year", year)
    .maybeSingle();

  const nextSeq = (counterRow?.counter ?? 0) + 1;
  return NextResponse.json({ matricule: formatMatricule(prefix, year, nextSeq) });
}

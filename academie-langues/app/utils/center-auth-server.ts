import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { CENTER_STAFF_ROLES } from "@/app/utils/student-routes";
import { isCenterOperational } from "@/app/utils/center-trial";

const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "https://placeholder.supabase.co";
const adminKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIn0.placeholder";

export const supabaseAdmin = createClient(adminUrl, adminKey);

export type CenterStaffContext = {
  user: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;
  centerId: string;
  role: string;
  centerType: string | null;
};

type CenterStaffResult =
  | { ctx: CenterStaffContext; error: null }
  | { ctx: null; error: NextResponse };

export async function getCenterStaffContext(req: Request): Promise<CenterStaffResult> {
  const user = await getAuthUser(req);
  if (!user) {
    return { ctx: null, error: NextResponse.json({ error: "Non autorise." }, { status: 401 }) };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role, center_id")
    .eq("id", user.id)
    .maybeSingle();

  let centerId = profile?.center_id ?? null;
  let role = profile?.role ?? null;

  if (!centerId) {
    const { data: membership } = await supabaseAdmin
      .from("center_users")
      .select("center_id, role")
      .eq("user_id", user.id)
      .maybeSingle();
    centerId = membership?.center_id ?? null;
    role = role || membership?.role || null;
  }

  if (!centerId || !role || !CENTER_STAFF_ROLES.has(role)) {
    return { ctx: null, error: NextResponse.json({ error: "Compte centre requis." }, { status: 403 }) };
  }

  const { data: center } = await supabaseAdmin
    .from("centers")
    .select("center_type, status, created_at")
    .eq("id", centerId)
    .maybeSingle();

  if (!isCenterOperational(center)) {
    return {
      ctx: null,
      error: NextResponse.json({ error: "Acces centre indisponible.", code: "CENTER_UNAVAILABLE" }, { status: 403 }),
    };
  }

  return {
    ctx: {
      user,
      centerId,
      role,
      centerType: (center?.center_type as string | null) ?? null,
    },
    error: null,
  };
}

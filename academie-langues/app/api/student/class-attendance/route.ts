import { NextResponse } from "next/server";
import { getAuthUser } from "@/app/utils/auth-server";
import { supabaseAdmin } from "@/app/utils/center-auth-server";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return fail("Non autorisé.", 401);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, center_id, role")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.center_id || profile.role !== "student") {
      return NextResponse.json({ records: [], rate: null, enabled: false });
    }

    const { data: center } = await supabaseAdmin
      .from("centers")
      .select("center_type")
      .eq("id", profile.center_id)
      .maybeSingle();
    if (center?.center_type !== "universite") {
      return NextResponse.json({ records: [], rate: null, enabled: false });
    }

    const { data: rows, error } = await supabaseAdmin
      .from("class_attendance")
      .select(
        "id, status, session_date, slot_id, schedule_slots(title, room_name, start_time, end_time, exam_disciplines(name))",
      )
      .eq("user_id", user.id)
      .eq("center_id", profile.center_id)
      .order("session_date", { ascending: false })
      .limit(60);

    if (error) {
      if (["42P01", "PGRST205"].includes(error.code)) {
        return NextResponse.json({ records: [], rate: null, enabled: true });
      }
      throw error;
    }

    const records = (rows ?? []).map((r) => {
      const slot = r.schedule_slots as unknown as {
        title: string | null;
        room_name: string | null;
        start_time: string | null;
        end_time: string | null;
        exam_disciplines: { name?: string } | { name?: string }[] | null;
      } | null;
      const disc = slot?.exam_disciplines;
      const discName = Array.isArray(disc) ? disc[0]?.name : disc?.name;
      return {
        id: r.id,
        status: r.status as "present" | "absent",
        sessionDate: r.session_date as string,
        title: (slot?.title || discName || "Séance").trim(),
        roomName: (slot?.room_name || "").trim(),
        startTime: String(slot?.start_time || "").slice(0, 5),
        endTime: String(slot?.end_time || "").slice(0, 5),
      };
    });

    const present = records.filter((r) => r.status === "present").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const total = present + absent;
    const rate = total > 0 ? Math.round((present / total) * 100) : null;

    return NextResponse.json({
      enabled: true,
      records,
      present,
      absent,
      rate,
    });
  } catch (e) {
    console.error("[student/class-attendance]", e);
    return fail("Impossible de charger l'assiduité.", 500);
  }
}

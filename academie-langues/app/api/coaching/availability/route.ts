import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TIME_ZONE = "Africa/Douala";
const ACTIVE_COACHING = ["en_attente", "confirme", "pending", "confirmed", "reporte"];

function sessionToIso(sessionDate: string, sessionTime: string) {
  return new Date(`${sessionDate}T${sessionTime.slice(0, 5)}:00+01:00`).toISOString();
}

function toDateKey(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

function timeToMinutes(t: string) {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd);
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "Paramètres from et to requis (YYYY-MM-DD)." }, { status: 400 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("center_id")
    .eq("id", user.id)
    .single();

  const centerId = profile?.center_id;
  if (!centerId) {
    return NextResponse.json({ occupied: [] });
  }

  const { data: students } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("center_id", centerId)
    .eq("role", "student");

  const studentIds = (students ?? []).map((s) => s.id);
  const occupied: Array<{ date: string; time: string; end_time?: string; source: string }> = [];

  if (studentIds.length > 0) {
    const { data: coachingRows } = await supabaseAdmin
      .from("coaching_sessions")
      .select("session_date, session_time, rescheduled_date, rescheduled_time, status")
      .in("user_id", studentIds)
      .in("status", ACTIVE_COACHING)
      .gte("session_date", from)
      .lte("session_date", to);

    for (const row of coachingRows ?? []) {
      const date = row.rescheduled_date || row.session_date;
      const time = (row.rescheduled_time || row.session_time)?.slice(0, 5);
      if (date && time && date >= from && date <= to) {
        const endMin = timeToMinutes(time) + 30;
        const endH = Math.floor(endMin / 60) % 24;
        const endM = endMin % 60;
        occupied.push({
          date,
          time,
          end_time: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
          source: "individual",
        });
      }
    }
  }

  const { data: slots } = await supabaseAdmin
    .from("schedule_slots")
    .select("id, day_of_week, start_time, end_time, specific_date, session_scope")
    .eq("center_id", centerId)
    .eq("session_scope", "collective");

  const startDate = new Date(`${from}T12:00:00`);
  const endDate = new Date(`${to}T12:00:00`);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateKey = toDateKey(d);
    const dow = d.getDay() === 0 ? 7 : d.getDay();

    for (const slot of slots ?? []) {
      const matches =
        (slot.specific_date && slot.specific_date === dateKey) ||
        (!slot.specific_date && slot.day_of_week === dow);

      if (!matches) continue;

      occupied.push({
        date: dateKey,
        time: slot.start_time.slice(0, 5),
        end_time: slot.end_time.slice(0, 5),
        source: "collective",
      });
    }
  }

  return NextResponse.json({ occupied });
}

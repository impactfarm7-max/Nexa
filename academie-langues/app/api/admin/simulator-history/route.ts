import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: adminProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  // Récupérer les 30 derniers jours de logs
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: logs, error } = await supabaseAdmin
    .from("simulator_logs")
    .select("user_id, mode, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!logs || logs.length === 0) {
    return NextResponse.json({ days: [] });
  }

  // Récupérer les prénoms
  const userIds = [...new Set(logs.map((l: any) => l.user_id).filter(Boolean))];
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, prenom, center_id")
    .in("id", userIds);

  const profileMap: Record<string, string> = {};
  (profiles ?? []).filter((p: any) => !p.center_id).forEach((p: any) => { profileMap[p.id] = p.prenom ?? "?"; });

  // Grouper par jour
  const dayMap: Record<string, { prenom: string; mode: string; userId: string }[]> = {};
  for (const log of logs as any[]) {
    if (!profileMap[log.user_id]) continue;
    const day = log.created_at.slice(0, 10); // YYYY-MM-DD
    if (!dayMap[day]) dayMap[day] = [];
    dayMap[day].push({
      prenom: profileMap[log.user_id] ?? "?",
      mode: log.mode ?? "zen",
      userId: log.user_id,
    });
  }

  const days = Object.entries(dayMap)
    .map(([date, entries]) => ({
      date,
      count: entries.length,
      uniqueUsers: [...new Map(entries.map(e => [e.userId, e])).values()],
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return NextResponse.json({ days });
}

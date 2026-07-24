import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RETENTION_DAYS = 7;

async function pruneOldLogs() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await supabaseAdmin.from("client_activity_logs").delete().lt("created_at", cutoff);
}

function isWithinRetention(date?: string | null) {
  if (!date) return false;
  return new Date(date).getTime() >= Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  await pruneOldLogs();

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 500);
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("client_activity_logs")
    .select(`
      id,
      user_id,
      action,
      details,
      metadata,
      user_agent,
      created_at,
      profiles:user_id (
        id,
        prenom,
        email,
        phone,
        pack_name,
        role
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, prenom, email, phone, pack_name, role, current_activity, last_sign_in_at, created_at, updated_at, tag_status")
    .neq("role", "admin")
    .neq("tag_status", "supprime");

  const profileById = new Map(
    (profiles ?? []).map((student: any) => [
      student.id,
      {
        id: student.id,
        prenom: student.prenom,
        email: student.email,
        phone: student.phone,
        pack_name: student.pack_name,
        role: student.role,
      },
    ])
  );

  const legacyActivities = (profiles ?? []).flatMap((student: any) => {
    const profile = {
      id: student.id,
      prenom: student.prenom,
      email: student.email,
      phone: student.phone,
      pack_name: student.pack_name,
      role: student.role,
    };

    const items = [];

    if (student.current_activity && isWithinRetention(student.updated_at ?? student.last_sign_in_at)) {
      items.push({
        id: `current-${student.id}`,
        user_id: student.id,
        action: "Activite actuelle",
        details: student.current_activity,
        metadata: { source: "profiles.current_activity" },
        user_agent: null,
        created_at: student.updated_at ?? student.last_sign_in_at ?? new Date().toISOString(),
        profiles: profile,
      });
    }

    if (isWithinRetention(student.last_sign_in_at)) {
      items.push({
        id: `signin-${student.id}-${student.last_sign_in_at}`,
        user_id: student.id,
        action: "Connexion recente",
        details: "Derniere connexion connue",
        metadata: { source: "profiles.last_sign_in_at" },
        user_agent: null,
        created_at: student.last_sign_in_at,
        profiles: profile,
      });
    }

    if (isWithinRetention(student.created_at)) {
      items.push({
        id: `signup-${student.id}`,
        user_id: student.id,
        action: "Inscription",
        details: "Compte client cree",
        metadata: { source: "profiles.created_at" },
        user_agent: null,
        created_at: student.created_at,
        profiles: profile,
      });
    }

    return items;
  });

  const { data: simulatorLogs } = await supabaseAdmin
    .from("simulator_logs")
    .select("user_id, mode, created_at")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(limit);

  const loggedSimulationActivities = (data ?? []).filter((activity: any) =>
    activity.action?.toLowerCase().includes("simulation")
  );

  const simulatorActivities = (simulatorLogs ?? [])
    .filter((log: any) => {
      const logTime = new Date(log.created_at).getTime();
      return !loggedSimulationActivities.some((activity: any) => {
        const activityTime = new Date(activity.created_at).getTime();
        return (
          activity.user_id === log.user_id &&
          Math.abs(activityTime - logTime) < 15000
        );
      });
    })
    .map((log: any) => ({
      id: `simulator-${log.user_id}-${log.mode}-${log.created_at}`,
      user_id: log.user_id,
      action: "Simulation faite",
      details: `Mode : ${log.mode ?? "simulateur"}`,
      metadata: { source: "simulator_logs", mode: log.mode ?? null },
      user_agent: null,
      created_at: log.created_at,
      profiles: profileById.get(log.user_id) ?? null,
    }));

  const activities = [...(data ?? []), ...legacyActivities, ...simulatorActivities]
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);

  return NextResponse.json({ activities });
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const { action, details, metadata } = await req.json();
  if (!action || typeof action !== "string") {
    return NextResponse.json({ error: "Action requise." }, { status: 400 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  await pruneOldLogs();

  const { error } = await supabaseAdmin.from("client_activity_logs").insert({
    user_id: user.id,
    action: action.trim().slice(0, 120),
    details: typeof details === "string" ? details.trim().slice(0, 500) : null,
    metadata: metadata && typeof metadata === "object" ? metadata : {},
    user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

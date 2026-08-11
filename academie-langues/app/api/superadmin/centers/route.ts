import { NextRequest, NextResponse } from "next/server";
import { getSuperadminContext, supabaseAdmin } from "@/app/utils/superadmin-auth-server";

type StudentStatusRow = {
  center_id: string;
  tag_status: string | null;
  subscription_ends_at: string | null;
  subscription_paused_at: string | null;
};

type ManagerProfile = {
  id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
};

type ManagerEntry = {
  center_id: string;
  role: string | null;
  role_label: string | null;
  profiles: ManagerProfile | null;
};

function classifyStudent(row: StudentStatusRow, now: number) {
  if (row.tag_status === "revoque") return "revoques" as const;
  if (row.tag_status === "termine") return "termines" as const;
  if (row.subscription_paused_at) return "pauses" as const;
  if (row.subscription_ends_at && new Date(row.subscription_ends_at).getTime() <= now) return "expires" as const;
  return "actifs" as const;
}

function unwrapProfile(raw: unknown): ManagerProfile | null {
  const p = (Array.isArray(raw) ? raw[0] : raw) as ManagerProfile | null;
  return p?.id ? p : null;
}

type CenterStatusInput = {
  status?: string | null;
  trial_ends_at?: string | null;
  renewal_at?: string | null;
};

export type CenterDerivedStatus =
  | "active"
  | "trial"
  | "trial_expired"
  | "subscription_expired"
  | "paused"
  | "revoked";

export function computeCenterDerivedStatus(center: CenterStatusInput, now = Date.now()): CenterDerivedStatus {
  const status = center.status ?? "";
  if (status === "rejected") return "revoked";
  if (status === "suspended") return "paused";
  if (status === "pending") {
    if (center.trial_ends_at && new Date(center.trial_ends_at).getTime() > now) return "trial";
    return "trial_expired";
  }
  if (status === "active" || status === "expired") {
    if (center.renewal_at && new Date(center.renewal_at).getTime() <= now) return "subscription_expired";
    return "active";
  }
  return "active";
}

export async function GET(req: NextRequest) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;

  const [
    { data: centers, error: centersError },
    { data: students, error: studentsError },
    { data: centerUsers, error: centerUsersError },
    { data: managerProfiles, error: managerProfilesError },
  ] = await Promise.all([
    supabaseAdmin
      .from("centers")
      .select(
        "id, name, city, code, signup_slug, address, country, region, center_type, status, email, phone, created_at, nexa_offer, trial_ends_at, renewal_at, subscription_amount, quota_overrides, pause_reason",
      )
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("profiles")
      .select("center_id, tag_status, subscription_ends_at, subscription_paused_at")
      .not("center_id", "is", null)
      .eq("role", "student"),
    supabaseAdmin
      .from("center_users")
      .select("center_id, role, role_label, profiles:user_id ( id, prenom, nom, email, phone, job_title )")
      .in("role", ["owner", "manager"]),
    supabaseAdmin
      .from("profiles")
      .select("id, prenom, nom, email, phone, job_title, center_id, role")
      .not("center_id", "is", null)
      .in("role", ["center_manager", "campus_manager"]),
  ]);

  if (centersError) {
    return NextResponse.json({ error: centersError.message }, { status: 500 });
  }
  if (studentsError) {
    return NextResponse.json({ error: studentsError.message }, { status: 500 });
  }
  if (centerUsersError) {
    return NextResponse.json({ error: centerUsersError.message }, { status: 500 });
  }
  if (managerProfilesError) {
    return NextResponse.json({ error: managerProfilesError.message }, { status: 500 });
  }

  const managersByCenter = new Map<string, ManagerEntry[]>();

  for (const cu of centerUsers ?? []) {
    if (!cu.center_id) continue;
    const profile = unwrapProfile(cu.profiles);
    const list = managersByCenter.get(cu.center_id) ?? [];
    if (profile) {
      list.push({
        center_id: cu.center_id,
        role: cu.role ?? null,
        role_label: cu.role_label ?? profile.job_title ?? null,
        profiles: profile,
      });
    }
    managersByCenter.set(cu.center_id, list);
  }

  for (const p of managerProfiles ?? []) {
    if (!p.center_id) continue;
    const list = managersByCenter.get(p.center_id) ?? [];
    if (!list.some((m) => m.profiles?.id === p.id)) {
      list.push({
        center_id: p.center_id,
        role: p.role ?? "center_manager",
        role_label: p.job_title ?? null,
        profiles: {
          id: p.id,
          prenom: p.prenom,
          nom: p.nom,
          email: p.email,
          phone: p.phone,
          job_title: p.job_title,
        },
      });
      managersByCenter.set(p.center_id, list);
    }
  }

  // Complète les emails manquants via Auth (surtout candidatures pending)
  const pendingIds = new Set((centers ?? []).filter((c) => c.status === "pending").map((c) => c.id));
  await Promise.all(
    [...managersByCenter.entries()].map(async ([centerId, managers]) => {
      if (!pendingIds.has(centerId)) return;
      await Promise.all(
        managers.map(async (m) => {
          if (m.profiles?.email || !m.profiles?.id) return;
          try {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(m.profiles.id);
            if (authUser?.user?.email) m.profiles.email = authUser.user.email;
          } catch {
            /* ignore */
          }
        }),
      );
    }),
  );

  const now = Date.now();
  const statsByCenter = new Map<string, { actifs: number; pauses: number; expires: number; termines: number; revoques: number; total: number }>();

  for (const row of students ?? []) {
    if (!row.center_id) continue;
    const bucket = statsByCenter.get(row.center_id) ?? { actifs: 0, pauses: 0, expires: 0, termines: 0, revoques: 0, total: 0 };
    bucket[classifyStudent(row as StudentStatusRow, now)]++;
    bucket.total++;
    statsByCenter.set(row.center_id, bucket);
  }

  const result = (centers ?? []).map((center) => {
    const managers = managersByCenter.get(center.id) ?? [];
    const creatorEmail =
      managers.find((m) => m.profiles?.email)?.profiles?.email ||
      (typeof center.email === "string" && center.email.trim() ? center.email.trim() : null);

    return {
      ...center,
      managers,
      creatorEmail,
      derived_status: computeCenterDerivedStatus(center, now),
      stats: statsByCenter.get(center.id) ?? { actifs: 0, pauses: 0, expires: 0, termines: 0, revoques: 0, total: 0 },
    };
  });

  return NextResponse.json({ centers: result });
}

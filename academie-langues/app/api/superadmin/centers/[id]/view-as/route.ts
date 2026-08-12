import { NextRequest, NextResponse } from "next/server";
import {
  getSuperadminContext,
  logSuperadminAction,
  supabaseAdmin,
} from "@/app/utils/superadmin-auth-server";
import { CENTER_HOME, STUDENT_HOME } from "@/app/utils/student-routes";
import type { ViewAsMode } from "@/app/utils/view-as";

type TargetRow = {
  id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  role: string | null;
  tag_status: string | null;
};

function labelOf(row: { prenom?: string | null; nom?: string | null; email?: string | null }) {
  const name = [row.prenom, row.nom].filter(Boolean).join(" ").trim();
  return name || row.email || row.prenom || "—";
}

async function loadCenterMeta(id: string) {
  const { data } = await supabaseAdmin
    .from("centers")
    .select("id, name, center_type, status")
    .eq("id", id)
    .maybeSingle();
  return data;
}

const MANAGER_PROFILE_ROLES = new Set([
  "center_manager",
  "campus_manager",
  "admin",
  "manager",
]);
const MANAGER_MEMBERSHIP_ROLES = new Set(["owner", "manager"]);
const STAFF_PROFILE_ROLES = new Set(["staff", "trainer"]);

function managerRank(role: string | null | undefined): number {
  switch (role) {
    case "center_manager":
    case "admin":
      return 0;
    case "owner":
      return 1;
    case "manager":
      return 2;
    case "campus_manager":
      return 3;
    default:
      return 9;
  }
}

async function listManagers(centerId: string): Promise<TargetRow[]> {
  const [{ data: memberships }, { data: profileManagers }] = await Promise.all([
    supabaseAdmin
      .from("center_users")
      .select("user_id, role")
      .eq("center_id", centerId)
      .in("role", ["owner", "manager"]),
    supabaseAdmin
      .from("profiles")
      .select("id, prenom, nom, email, role, tag_status")
      .eq("center_id", centerId)
      .in("role", ["center_manager", "campus_manager", "admin", "manager"]),
  ]);

  const byId = new Map<string, TargetRow>();

  for (const p of profileManagers || []) {
    if (!p?.id || !p.email) continue;
    if (STAFF_PROFILE_ROLES.has((p.role || "").toLowerCase())) continue;
    if (!MANAGER_PROFILE_ROLES.has((p.role || "").toLowerCase())) continue;
    byId.set(p.id, p as TargetRow);
  }

  const membershipIds = [...new Set((memberships || []).map((m) => m.user_id).filter(Boolean))];
  if (membershipIds.length > 0) {
    const { data: membershipProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, prenom, nom, email, role, tag_status")
      .in("id", membershipIds);

    const roleByUser = new Map((memberships || []).map((m) => [m.user_id as string, m.role as string]));
    for (const p of membershipProfiles || []) {
      if (!p?.id || !p.email) continue;
      const profileRole = (p.role || "").toLowerCase();
      // Jamais un formateur / staff pour la vue « Centre ».
      if (STAFF_PROFILE_ROLES.has(profileRole)) continue;
      const membershipRole = (roleByUser.get(p.id) || "").toLowerCase();
      if (!MANAGER_MEMBERSHIP_ROLES.has(membershipRole) && !MANAGER_PROFILE_ROLES.has(profileRole)) {
        continue;
      }
      const effectiveRole =
        MANAGER_PROFILE_ROLES.has(profileRole) ? profileRole : membershipRole || "manager";
      const existing = byId.get(p.id);
      if (!existing || managerRank(effectiveRole) < managerRank(existing.role)) {
        byId.set(p.id, { ...(p as TargetRow), role: effectiveRole });
      }
    }
  }

  return [...byId.values()].sort(
    (a, b) => managerRank(a.role) - managerRank(b.role) || labelOf(a).localeCompare(labelOf(b)),
  );
}

async function listStaff(centerId: string): Promise<TargetRow[]> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, prenom, nom, email, role, tag_status")
    .eq("center_id", centerId)
    .in("role", ["staff", "trainer"]);
  return (data || []) as TargetRow[];
}

async function listStudents(centerId: string): Promise<TargetRow[]> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, prenom, nom, email, role, tag_status")
    .eq("center_id", centerId)
    .eq("role", "student")
    .neq("tag_status", "revoque")
    .order("created_at", { ascending: false })
    .limit(40);
  return (data || []) as TargetRow[];
}

function mapTargets(rows: TargetRow[]) {
  return rows
    .filter((r) => r.email)
    .map((r) => ({
      id: r.id,
      label: labelOf(r),
      email: r.email as string,
      role: r.role,
      roleLabel: roleBadge(r.role),
      tag_status: r.tag_status,
    }));
}

function roleBadge(role: string | null | undefined): string {
  switch ((role || "").toLowerCase()) {
    case "center_manager":
    case "admin":
    case "owner":
      return "Responsable";
    case "campus_manager":
    case "manager":
      return "Manager";
    case "trainer":
      return "Formateur";
    case "staff":
      return "Staff";
    case "student":
      return "Étudiant";
    default:
      return role || "";
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { ctx, error } = await getSuperadminContext(_req);
  if (error || !ctx) return error!;

  const { id } = await params;
  const center = await loadCenterMeta(id);
  if (!center) return NextResponse.json({ error: "Centre introuvable." }, { status: 404 });

  const [managers, staff, students] = await Promise.all([
    listManagers(id),
    listStaff(id),
    listStudents(id),
  ]);

  return NextResponse.json({
    center: {
      id: center.id,
      name: center.name,
      center_type: center.center_type,
    },
    managers: mapTargets(managers),
    staff: mapTargets(staff),
    students: mapTargets(students),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { ctx, error } = await getSuperadminContext(req);
  if (error || !ctx) return error!;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    mode?: ViewAsMode;
    userId?: string | null;
  };

  const mode = body.mode;
  if (mode !== "center" && mode !== "staff" && mode !== "student") {
    return NextResponse.json({ error: "Mode invalide (center | staff | student)." }, { status: 400 });
  }

  const center = await loadCenterMeta(id);
  if (!center) return NextResponse.json({ error: "Centre introuvable." }, { status: 404 });

  const [managers, staff, students] = await Promise.all([
    listManagers(id),
    listStaff(id),
    listStudents(id),
  ]);

  let target: TargetRow | null = null;
  let forceViewAs: "staff" | null = null;
  let next = CENTER_HOME;

  if (mode === "center") {
    target =
      (body.userId ? managers.find((m) => m.id === body.userId) : null) ||
      managers.find((m) => m.role === "center_manager" || m.role === "admin") ||
      managers[0] ||
      null;
    next = CENTER_HOME;
  } else if (mode === "staff") {
    target =
      (body.userId ? staff.find((s) => s.id === body.userId) : null) || staff[0] || null;
    if (!target) {
      // Pas de staff : on entre comme responsable + aperçu staff (menu View As existant).
      target =
        (body.userId ? managers.find((m) => m.id === body.userId) : null) ||
        managers.find((m) => m.role === "center_manager" || m.role === "admin") ||
        managers[0] ||
        null;
      forceViewAs = "staff";
    }
    next = CENTER_HOME;
  } else {
    target =
      (body.userId ? students.find((s) => s.id === body.userId) : null) || students[0] || null;
    next = STUDENT_HOME;
  }

  if (!target?.email) {
    const msg =
      mode === "student"
        ? "Aucun étudiant disponible pour ce centre."
        : mode === "staff"
          ? "Aucun responsable ni staff disponible pour ce centre."
          : "Aucun responsable disponible pour ce centre.";
    return NextResponse.json({ error: msg }, { status: 404 });
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://nexa.fr").replace(/\/$/, "");
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: target.email,
    options: {
      redirectTo: `${site}/view-as/enter`,
    },
  });

  const hashedToken =
    (linkData as { properties?: { hashed_token?: string } } | null)?.properties?.hashed_token ||
    null;

  if (linkError || !hashedToken) {
    return NextResponse.json(
      { error: linkError?.message || "Impossible de créer la session d'aperçu." },
      { status: 500 },
    );
  }

  await logSuperadminAction(ctx.user.id, "center_view_as", {
    targetType: "center",
    targetId: id,
    req,
    metadata: {
      mode,
      targetUserId: target.id,
      targetEmail: target.email,
      forceViewAs,
      centerType: center.center_type,
    },
  });

  return NextResponse.json({
    token_hash: hashedToken,
    email: target.email,
    next,
    mode,
    forceViewAs,
    target: {
      id: target.id,
      label: labelOf(target),
      email: target.email,
    },
    center: {
      id: center.id,
      name: center.name,
      center_type: center.center_type,
    },
  });
}

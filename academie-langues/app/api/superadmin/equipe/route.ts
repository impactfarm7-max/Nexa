import { NextRequest, NextResponse } from "next/server";
import {
  getSuperadminContext,
  logSuperadminAction,
  requireSuperadminMenu,
  requireSuperadminOwner,
  supabaseAdmin,
} from "@/app/utils/superadmin-auth-server";
import {
  sanitizeSuperadminMenus,
  SUPERADMIN_ASSIGNABLE_MENUS,
  type SuperadminMenuKey,
} from "@/app/data/superadminMenus";

function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

type PermRow = {
  user_id: string;
  is_owner: boolean;
  menus: string[] | null;
  disabled_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET(req: NextRequest) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;

  const denied = requireSuperadminMenu(ctx, "equipe") || requireSuperadminOwner(ctx);
  if (denied) return denied;

  const { data: profiles, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, prenom, nom, email, created_at")
    .eq("role", "superadmin")
    .order("created_at", { ascending: true });

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  const ids = (profiles || []).map((p) => p.id);
  const { data: perms } = ids.length
    ? await supabaseAdmin
        .from("superadmin_permissions")
        .select("user_id, is_owner, menus, disabled_at, created_at, updated_at")
        .in("user_id", ids)
    : { data: [] as PermRow[] };

  const permById = new Map((perms || []).map((p) => [p.user_id, p as PermRow]));

  const members = (profiles || []).map((p) => {
    const perm = permById.get(p.id);
    return {
      id: p.id,
      prenom: p.prenom,
      nom: p.nom,
      email: p.email,
      created_at: p.created_at,
      is_owner: Boolean(perm?.is_owner),
      menus: sanitizeSuperadminMenus(perm?.menus),
      disabled: Boolean(perm?.disabled_at),
      disabled_at: perm?.disabled_at ?? null,
      is_self: p.id === ctx.user.id,
    };
  });

  return NextResponse.json({
    me: {
      id: ctx.user.id,
      isOwner: ctx.access.isOwner,
      menus: ctx.access.isOwner ? SUPERADMIN_ASSIGNABLE_MENUS : ctx.access.menus,
    },
    assignableMenus: SUPERADMIN_ASSIGNABLE_MENUS,
    members,
  });
}

export async function POST(req: NextRequest) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;

  const denied = requireSuperadminMenu(ctx, "equipe") || requireSuperadminOwner(ctx);
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    prenom?: string;
    nom?: string;
    is_owner?: boolean;
    menus?: string[];
  };

  const email = (body.email || "").trim().toLowerCase();
  const prenom = (body.prenom || "").trim();
  const nom = (body.nom || "").trim();
  if (!email || !prenom) {
    return NextResponse.json({ error: "Email et prénom requis." }, { status: 400 });
  }

  const isOwner = Boolean(body.is_owner);
  const menus = isOwner ? [] : sanitizeSuperadminMenus(body.menus);
  if (!isOwner && menus.length === 0) {
    return NextResponse.json({ error: "Sélectionnez au moins un menu." }, { status: 400 });
  }

  const password = generatePassword();
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { prenom, nom, role: "superadmin" },
  });

  if (createErr || !created.user) {
    return NextResponse.json(
      { error: createErr?.message || "Impossible de créer le compte." },
      { status: 400 },
    );
  }

  const userId = created.user.id;
  const now = new Date().toISOString();

  const { error: profileErr } = await supabaseAdmin.from("profiles").upsert({
    id: userId,
    email,
    prenom,
    nom: nom || null,
    role: "superadmin",
    must_change_password: true,
    created_at: now,
    updated_at: now,
  });

  if (profileErr) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  const { error: permErr } = await supabaseAdmin.from("superadmin_permissions").upsert({
    user_id: userId,
    is_owner: isOwner,
    menus,
    created_by: ctx.user.id,
    created_at: now,
    updated_at: now,
    disabled_at: null,
  });

  if (permErr) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      {
        error:
          permErr.message.includes("does not exist") || permErr.code === "42P01"
            ? "Table superadmin_permissions absente — exécutez supabase-superadmin-permissions.sql."
            : permErr.message,
      },
      { status: 500 },
    );
  }

  await logSuperadminAction(ctx.user.id, "superadmin_created", {
    targetType: "superadmin",
    targetId: userId,
    req,
    metadata: { email, is_owner: isOwner, menus },
  });

  return NextResponse.json({
    id: userId,
    email,
    password,
    prenom,
    nom,
    is_owner: isOwner,
    menus,
  });
}

export async function PATCH(req: NextRequest) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;

  const denied = requireSuperadminMenu(ctx, "equipe") || requireSuperadminOwner(ctx);
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as {
    userId?: string;
    is_owner?: boolean;
    menus?: string[];
    disabled?: boolean;
  };

  const userId = body.userId;
  if (!userId) return NextResponse.json({ error: "userId requis." }, { status: 400 });

  const { data: targetProfile } = await supabaseAdmin
    .from("profiles")
    .select("id, role, email")
    .eq("id", userId)
    .maybeSingle();

  if (!targetProfile || targetProfile.role !== "superadmin") {
    return NextResponse.json({ error: "Superadmin introuvable." }, { status: 404 });
  }

  const { data: existing } = await supabaseAdmin
    .from("superadmin_permissions")
    .select("is_owner, menus, disabled_at")
    .eq("user_id", userId)
    .maybeSingle();

  const nextOwner =
    typeof body.is_owner === "boolean" ? body.is_owner : Boolean(existing?.is_owner);
  const nextMenus = nextOwner
    ? []
    : body.menus
      ? sanitizeSuperadminMenus(body.menus)
      : sanitizeSuperadminMenus(existing?.menus);
  const nextDisabled =
    typeof body.disabled === "boolean" ? body.disabled : Boolean(existing?.disabled_at);

  if (!nextOwner && nextMenus.length === 0 && !nextDisabled) {
    return NextResponse.json({ error: "Sélectionnez au moins un menu." }, { status: 400 });
  }

  // Empêche de se retirer le dernier owner / se désactiver soi-même sans autre owner.
  if (existing?.is_owner && (!nextOwner || nextDisabled)) {
    const { count } = await supabaseAdmin
      .from("superadmin_permissions")
      .select("user_id", { count: "exact", head: true })
      .eq("is_owner", true)
      .is("disabled_at", null)
      .neq("user_id", userId);
    if (!count || count < 1) {
      return NextResponse.json(
        { error: "Impossible : il doit rester au moins un owner actif." },
        { status: 400 },
      );
    }
  }

  if (userId === ctx.user.id && nextDisabled) {
    return NextResponse.json({ error: "Vous ne pouvez pas désactiver votre propre compte." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error: upsertErr } = await supabaseAdmin.from("superadmin_permissions").upsert({
    user_id: userId,
    is_owner: nextOwner,
    menus: nextMenus,
    disabled_at: nextDisabled ? now : null,
    updated_at: now,
    created_by: ctx.user.id,
  });

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  await logSuperadminAction(ctx.user.id, "superadmin_updated", {
    targetType: "superadmin",
    targetId: userId,
    req,
    metadata: {
      email: targetProfile.email,
      is_owner: nextOwner,
      menus: nextMenus,
      disabled: nextDisabled,
    },
  });

  return NextResponse.json({
    ok: true,
    id: userId,
    is_owner: nextOwner,
    menus: nextMenus,
    disabled: nextDisabled,
  });
}

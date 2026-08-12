import { NextRequest, NextResponse } from "next/server";
import { getSuperadminContext } from "@/app/utils/superadmin-auth-server";
import {
  resolveEffectiveMenus,
  SUPERADMIN_MENU_PATHS,
  firstAllowedPath,
} from "@/app/data/superadminMenus";

/** Session courante : menus effectifs pour filtrer la nav client. */
export async function GET(req: NextRequest) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;

  const menus = resolveEffectiveMenus(ctx.access);
  return NextResponse.json({
    id: ctx.user.id,
    email: ctx.user.email,
    isOwner: ctx.access.isOwner,
    menus,
    paths: menus.map((m) => SUPERADMIN_MENU_PATHS[m]),
    home: firstAllowedPath(ctx.access),
  });
}

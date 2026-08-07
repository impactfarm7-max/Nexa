import { NextResponse } from "next/server";
import { getReportsContext, reportsCatchError } from "../shared";
import { buildReportsBundle } from "@/app/utils/reports-data.server";

export async function GET(req: Request) {
  try {
    const { ctx, filters, error } = await getReportsContext(req);
    if (error) return error;

    const bundle = await buildReportsBundle(ctx!.centerId, filters!, ctx!.centerType);

    return NextResponse.json(bundle);
  } catch (e) {
    return reportsCatchError(req, e);
  }
}

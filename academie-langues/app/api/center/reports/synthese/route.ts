import { NextResponse } from "next/server";
import { getReportsContext, loadCampuses, loadFilieres } from "../shared";
import { buildSyntheseReport } from "@/app/utils/reports-data.server";

export async function GET(req: Request) {
  try {
    const { ctx, filters, error } = await getReportsContext(req);
    if (error) return error;

    const [report, campuses, filieres] = await Promise.all([
      buildSyntheseReport(ctx!.centerId, filters!, ctx!.centerType),
      loadCampuses(ctx!.centerId),
      loadFilieres(ctx!.centerId),
    ]);

    return NextResponse.json({ report, campuses, filieres });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

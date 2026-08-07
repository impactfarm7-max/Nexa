import { NextResponse } from "next/server";
import { getReportsContext, loadCampuses, loadFilieres, reportsCatchError } from "../shared";
import { buildReductionsReport } from "@/app/utils/reports-data.server";

export async function GET(req: Request) {
  try {
    const { ctx, filters, error } = await getReportsContext(req);
    if (error) return error;

    const [report, campuses, filieres] = await Promise.all([
      buildReductionsReport(ctx!.centerId, filters!),
      loadCampuses(ctx!.centerId),
      loadFilieres(ctx!.centerId),
    ]);

    return NextResponse.json({ report, campuses, filieres });
  } catch (e) {
    return reportsCatchError(req, e);
  }
}

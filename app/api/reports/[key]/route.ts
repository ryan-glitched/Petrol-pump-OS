import { NextResponse, type NextRequest } from "next/server";
import { AuthError, ForbiddenError, requireCapability, scopedBranchId } from "@/lib/auth/guard";
import { buildReport, REPORTS, toCSV, type ReportKey } from "@/lib/reports";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  if (!REPORTS.some((r) => r.key === key)) {
    return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }

  try {
    await requireCapability("runReports");
    const { branchId } = await scopedBranchId();
    const from = req.nextUrl.searchParams.get("from") ?? undefined;
    const to = req.nextUrl.searchParams.get("to") ?? undefined;
    if ((from && !ISO_DATE.test(from)) || (to && !ISO_DATE.test(to))) {
      return NextResponse.json({ error: "Dates must be YYYY-MM-DD" }, { status: 400 });
    }
    const result = await buildReport(branchId, key as ReportKey, from, to);
    const csv = toCSV(result);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${key}.csv"`,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw err;
  }
}

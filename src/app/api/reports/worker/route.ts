import { NextResponse } from "next/server";
import { dispatchReadyReportJobs } from "@/lib/reporting/queue";

export const runtime = "nodejs";

/** Internal recovery endpoint. Invoke from a trusted scheduler only. */
export async function POST(request: Request) {
  const configuredSecret = process.env.REPORT_WORKER_SECRET;
  const suppliedSecret = request.headers.get("x-report-worker-secret");
  if (!configuredSecret || suppliedSecret !== configuredSecret) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    return NextResponse.json(await dispatchReadyReportJobs({ limit: 5 }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not run report worker" }, { status: 503 });
  }
}

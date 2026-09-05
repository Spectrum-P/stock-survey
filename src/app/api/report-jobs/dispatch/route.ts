import { after, NextResponse } from "next/server";
import { jsonError, requestContext } from "@/lib/api";
import { dispatchReadyReportJobs, publicWorkerHealth } from "@/lib/reporting/queue";

export async function POST(request: Request) {
  const context = await requestContext(request);
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const worker = publicWorkerHealth();
  if (!worker.ready) return jsonError(worker.message, 503);
  after(async () => { await dispatchReadyReportJobs({ organizationId: context.organizationId, limit: 5 }).catch(() => undefined); });
  return NextResponse.json({ accepted: true, limit: 5 }, { status: 202 });
}

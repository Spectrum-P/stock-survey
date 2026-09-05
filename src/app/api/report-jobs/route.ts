import { NextResponse } from "next/server";
import { requestContext, jsonError } from "@/lib/api";
import { getReportJobsPage } from "@/lib/data";
import { publicWorkerHealth } from "@/lib/reporting/queue";

export async function GET(request: Request) {
  const context = await requestContext(request);
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const status = url.searchParams.get("status") ?? undefined;
  return NextResponse.json({ ...(await getReportJobsPage(page, 10, status)), worker: publicWorkerHealth() });
}

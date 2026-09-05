type LogLevel = "info" | "warn" | "error";

/**
 * Small structured logger for server-side report events.
 * Keep fields limited to identifiers, timings and provider metadata — never
 * pass API keys, tokens, prompts or complete survey snapshots here.
 */
export function logReportEvent(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {},
) {
  const payload = {
    timestamp: new Date().toISOString(),
    service: "stock-condition-survey",
    flow: "reports.generate",
    event,
    ...fields,
  };
  const line = `[reports.generate] ${JSON.stringify(payload)}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

/** Add request and elapsed-time context to every event in one report flow. */
export function createReportLogger(requestId: string, startedAt = Date.now()) {
  const write = (level: LogLevel, event: string, fields: Record<string, unknown> = {}) =>
    logReportEvent(level, event, {
      requestId,
      elapsedMs: Date.now() - startedAt,
      ...fields,
    });

  return {
    info: (event: string, fields?: Record<string, unknown>) => write("info", event, fields),
    warn: (event: string, fields?: Record<string, unknown>) => write("warn", event, fields),
    error: (event: string, fields?: Record<string, unknown>) => write("error", event, fields),
  };
}

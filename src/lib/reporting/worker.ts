import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { createHash } from "node:crypto";
import { reportDocumentSchema, reportNarrativeSchema } from "@/lib/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { STOCK_CONDITION_SYSTEM_PROMPT } from "@/lib/reporting/claude-prompt";
import { logReportEvent } from "@/lib/logger";
import { buildDeterministicReportDocument, mergeGeneratedSection, mergeReportNarrative, REPORT_NARRATIVE_JSON_SCHEMA, type ReportScope } from "@/lib/reporting/document";

/* The Supabase client is intentionally used without generated database types in
 * this project; this row shape is confined to the server-side worker. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((v): v is Row => !!v && typeof v === "object") : [];
}
function one(value: unknown): Row | undefined {
  return Array.isArray(value) ? rows(value)[0] : value && typeof value === "object" ? value as Row : undefined;
}

function claudeInput(surveys: Row[]) {
  return surveys.map((survey) => ({
    surveyId: survey.id, propertyId: survey.property_id, unitId: survey.unit_id, inspectionDate: survey.inspection_date, status: survey.status,
    property: one(survey.properties), unit: one(survey.units),
    elements: rows(survey.survey_elements).filter((element) => element.status !== "not_started").map((element) => ({
      id: element.id, component: one(element.component_categories)?.name ?? element.custom_component_name, element: one(element.elements)?.name ?? element.custom_element_name,
      status: element.status, accessibility: element.accessibility, accessibilityReason: element.accessibility_reason,
      constructionType: element.construction_type, constructionNotes: element.construction_notes, installationYear: element.installation_year,
      typicalLifeYears: element.typical_life_years, lifeReference: element.life_reference, remainingLife: element.remaining_life, replacementYear: element.replacement_year,
      planningHorizon: element.planning_horizon, planningOverrideReason: element.planning_override_reason, recommendedWorks: element.recommended_works,
      estimatedCost: element.estimated_cost, costBasis: element.cost_basis, generalNotes: element.general_notes, accessLimitations: element.access_limitations, furtherInvestigation: element.further_investigation,
      defects: rows(element.defect_findings).map((finding) => ({ defectType: finding.defect_type_label, cause: finding.cause, condition: finding.condition, priority: finding.priority, notes: finding.notes })),
      photos: rows(element.media).map((item) => ({ id: item.id, filename: item.filename, caption: item.caption })),
    })),
  }));
}

export async function processReportJob(jobId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: claimed, error: claimError } = await supabase.from("report_generation_jobs").update({ status: "processing", locked_at: new Date().toISOString(), completed_at: null, last_error: null }).eq("id", jobId).eq("status", "queued").select("*").maybeSingle();
  if (claimError || !claimed) return;
  const job = claimed as Row;
  const startedAt = Date.now();
  const requestId = job.run_id;
  try {
    await supabase.from("report_generation_jobs").update({ attempts: (job.attempts ?? 0) + 1 }).eq("id", job.id);
    await supabase.from("report_generation_runs").update({ status: "running", attempt: (job.attempts ?? 0) + 1, error: null, completed_at: null, started_at: new Date().toISOString(), current_step: "Loading survey evidence", events: [{ at: new Date().toISOString(), event: "worker.started" }] }).eq("id", job.run_id);
    await supabase.from("reports").update({ generation_status: "preparing", progress: 10, current_step: "Loading survey evidence", error_message: null, generation_started_at: new Date().toISOString(), generation_completed_at: null, model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6" }).eq("id", job.report_id);
    let query = supabase.from("surveys").select("id,inspection_date,status,version,property_id,unit_id,properties(name,reference,building_name,property_type,address_line_1,town,postcode,construction_year,number_of_storeys),units(name,reference,flat_type,floor),profiles!surveys_surveyor_id_fkey(full_name),survey_elements(*,elements(name),component_categories(name),defect_findings(*),media(id,survey_element_id,storage_path,filename,caption))").eq("organization_id", job.organization_id);
    const scope = job.scope as ReportScope;
    if (scope.kind === "survey") query = query.eq("id", scope.surveyId);
    if (scope.kind === "property") query = query.eq("property_id", scope.propertyId);
    const { data: surveys, error: surveyError } = await query;
    if (surveyError || !surveys?.length) throw new Error(surveyError?.message ?? "No survey data found for this scope");
    const { data: organization } = await supabase.from("organizations").select("name").eq("id", job.organization_id).maybeSingle();
    const snapshot = { generatedAt: new Date().toISOString(), scope, surveys };
    const input = claudeInput(surveys as Row[]);
    const deterministicDocument = buildDeterministicReportDocument(surveys as Row[], scope, organization?.name ?? "");
    const sourceHash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
    await supabase.from("reports").update({ prompt_input_snapshot: input, source_hash: sourceHash, generation_status: "generating", progress: 20, current_step: "Generating narrative" }).eq("id", job.report_id);
    await supabase.from("report_generation_runs").update({ current_step: "Generating narrative", completed_steps: 1, total_steps: 3 }).eq("id", job.run_id);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
    const headers: Record<string, string> = {};
    if (process.env.ANTHROPIC_WORKSPACE_ID) headers["anthropic-workspace-id"] = process.env.ANTHROPIC_WORKSPACE_ID;
    const anthropic = new Anthropic({ apiKey, defaultHeaders: headers, maxRetries: 2 });
    logReportEvent("info", "claude.request_started", { requestId, reportId: job.report_id, model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6", inputCharacters: JSON.stringify(input).length });
    // Run the schema through Anthropic's strict transformer as well as keeping
    // explicit additionalProperties:false on every object in our source schema.
    // This prevents the provider from treating any nested object as open-ended.
    const strictFormat = jsonSchemaOutputFormat(REPORT_NARRATIVE_JSON_SCHEMA);
    const response = await anthropic.messages.parse({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6", max_tokens: 7000, temperature: 0.1,
      system: `${STOCK_CONDITION_SYSTEM_PROMPT}\nReturn only JSON matching the supplied narrative schema. Write narrative only; preserve all stored surveyor facts and deterministic tables. Do not add facts.`,
      messages: [{ role: "user", content: JSON.stringify({ evidence: input, deterministicDocument }) }],
      output_config: { format: strictFormat },
    });
    const text = response.content.filter((item) => item.type === "text").map((item) => item.text).join("\n");
    const parsed: unknown = response.parsed_output;
    const parsedNarrative = reportNarrativeSchema.safeParse(parsed);
    if (!parsedNarrative.success) {
      logReportEvent("error", "claude.response_validation_failed", {
        requestId,
        reportId: job.report_id,
        providerRequestId: response.id,
        model: response.model,
        stopReason: response.stop_reason,
        validationIssues: parsedNarrative.error.issues,
        contentCharacters: text.length,
      });
    }
    const generatedDocument = parsedNarrative.success
      ? mergeReportNarrative(deterministicDocument, parsedNarrative.data)
      : { ...deterministicDocument, dataQualityIssues: [...new Set([...deterministicDocument.dataQualityIssues, "The generated narrative could not be validated; this report uses the stored survey evidence without AI narrative enrichment."])] };
    const { data: existingReport } = await supabase.from("reports").select("structured_content").eq("id", job.report_id).maybeSingle();
    const existingDocument = reportDocumentSchema.safeParse(existingReport?.structured_content);
    const document = existingDocument.success ? mergeGeneratedSection(existingDocument.data, generatedDocument, scope.sectionKey) : generatedDocument;
    logReportEvent("info", "claude.response_received", { requestId, reportId: job.report_id, providerRequestId: response.id, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens, contentCharacters: text.length });
    await supabase.from("reports").update({ generation_status: "assembling", progress: 80, current_step: "Assembling report", title: document.metadata.title, structured_content: document, draft_content: document.executiveSummary, model_response: parsedNarrative.success ? { provider: response, narrative: parsedNarrative.data } : { provider: response, parsed, validation: parsedNarrative.error.flatten() }, model: response.model, updated_at: new Date().toISOString() }).eq("id", job.report_id);
    const sectionRows = [
      ["metadata", "Report metadata", document.metadata], ["executive_summary", "Executive summary", document.executiveSummary], ["introduction", "Introduction", document.introduction],
      ["methodology", "Methodology", document.methodology], ["limitations", "Scope and limitations", document.limitations], ["stock_profile", "Stock profile", document.stockProfile],
      ["data_quality", "Data quality", document.dataQualityIssues], ["condition_analysis", "Overall stock condition", document.conditionSummary], ["priority_analysis", "Priority and risk", document.prioritySummary],
      ["component_findings", "Component findings", document.componentSections], ["lifecycle_schedule", "Lifecycle schedule", document.lifecycleSchedule], ["planned_maintenance", "Planned maintenance", document.plannedMaintenance],
      ["recommendations", "Recommendations and conclusion", document.recommendations], ["photo_schedule", "Photo schedule", document.photoSchedule],
    ];
    await supabase.from("report_sections").upsert(sectionRows.map(([sectionKey, title, content], index) => ({ organization_id: job.organization_id, report_id: job.report_id, section_key: sectionKey, title, display_order: index, ai_content: content, edited_content: content, generation_status: "ready" })), { onConflict: "report_id,section_key" });
    await supabase.from("report_photos").delete().eq("report_id", job.report_id);
    if (document.photoSchedule.length) await supabase.from("report_photos").insert(document.photoSchedule.map((photo) => ({ ...photo, organization_id: job.organization_id, report_id: job.report_id })));
    await supabase.from("reports").update({ status: "draft", generation_status: "ready", review_status: "draft", progress: 100, current_step: null, error_message: null, generation_completed_at: new Date().toISOString(), updated_at: new Date().toISOString(), draft_content: JSON.stringify(document) }).eq("id", job.report_id);
    await supabase.from("report_generation_runs").update({ status: "completed", completed_steps: 3, current_step: null, error: null, completed_at: new Date().toISOString(), provider_request_ids: [response.id], token_usage: response.usage, events: [{ at: new Date().toISOString(), event: "worker.completed", durationMs: Date.now() - startedAt }] }).eq("id", job.run_id);
    await supabase.from("report_generation_jobs").update({ status: "completed", completed_at: new Date().toISOString(), locked_at: null, last_error: null }).eq("id", job.id);
    logReportEvent("info", "report.completed", { requestId, reportId: job.report_id, durationMs: Date.now() - startedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report generation failed";
    const canRetry = (job.attempts ?? 0) + 1 < 3;
    if (canRetry) {
      const retryAt = new Date(Date.now() + 2 ** ((job.attempts ?? 0) + 1) * 5_000).toISOString();
      await supabase.from("reports").update({ generation_status: "queued", status: "generating", progress: 0, current_step: "Retrying generation", error_message: message, updated_at: new Date().toISOString() }).eq("id", job.report_id);
      await supabase.from("report_generation_runs").update({ status: "queued", error: { message, retrying: true }, current_step: "Retrying generation" }).eq("id", job.run_id);
      await supabase.from("report_generation_jobs").update({ status: "queued", available_at: retryAt, last_error: { message, retrying: true } }).eq("id", job.id);
    } else {
      await supabase.from("reports").update({ generation_status: "failed", status: "failed", progress: 0, current_step: null, error_message: message, updated_at: new Date().toISOString() }).eq("id", job.report_id);
      await supabase.from("report_generation_runs").update({ status: "failed", error: { message }, completed_at: new Date().toISOString(), events: [{ at: new Date().toISOString(), event: "worker.failed", message }] }).eq("id", job.run_id);
      await supabase.from("report_generation_jobs").update({ status: "failed", last_error: { message } }).eq("id", job.id);
    }
    logReportEvent("error", "report.failed", {
      requestId,
      reportId: job.report_id,
      error: message,
      errorName: error instanceof Error ? error.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
      durationMs: Date.now() - startedAt,
    });
  }
}

// Adapted measurement excerpt from the backend vote span collector.
// Schema and workflow labels use public aliases; timing operations are unchanged.
// The allow-list restricts recorded stage names; other fields depend on omitted code.

const allowedStages = new Set([
  "authentication",
  "request_parse_and_validation",
  "poll_and_policy_fetch",
  "eligibility_evaluation",
  "encryption_material_lookup",
  "proof_verification",
  "duplicate_check",
  "database_commit_and_audit",
  "receipt_construction",
]);

async function measure<T>(
  stage: string,
  operation: () => Promise<T> | T,
): Promise<T> {
  if (!allowedStages.has(stage)) {
    throw new Error(`Unsupported experiment stage: ${stage}`);
  }
  const startedAt = performance.now();
  try {
    const value = await operation();
    stages.push({
      stage,
      durationMs: roundMs(performance.now() - startedAt),
      outcome: "success",
    });
    return value;
  } catch (error) {
    stages.push({
      stage,
      durationMs: roundMs(performance.now() - startedAt),
      outcome: "failure",
      errorClass: normalizeErrorClass(error),
    });
    throw error;
  }
}

function buildPrivacySafeSpan() {
  return {
    schemaVersion: "review-server-span-v1",
    experimentId: "E3-E5",
    workflow: "participation_service",
    runId,
    durationMs: roundMs(performance.now() - spanStartedAt),
    outcome: result?.success ? "success" : "failure",
    responseClass: result?.responseClass || "ROUTE_EXIT_BEFORE_SERVICE_RESULT",
    stages,
  };
}

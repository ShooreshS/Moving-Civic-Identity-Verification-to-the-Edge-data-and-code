// Adapted measurement excerpt from the build-89212 mobile vote gateway.
// The run-ID header uses a public alias; serialized payload keys are unchanged.
// It records counts and a random join identifier. It never records a body.

const compactUtf8Bytes = (value) => value == null
    ? 0
    : unescape(encodeURIComponent(JSON.stringify(value))).length;

const serializedBody = body === undefined ? null : JSON.stringify(body);

if (serializedBody !== null) {
    experimentRun?.addStage?.('request_serialization', {
        compactJsonUtf8Bytes: unescape(encodeURIComponent(serializedBody)).length,
        zkpEnvelopeUtf8Bytes: compactUtf8Bytes(body?.privacy?.proof),
        zkpOutputUtf8Bytes: compactUtf8Bytes(body?.privacy?.proof?.proof),
        publicInputEnvelopeUtf8Bytes: compactUtf8Bytes(body?.privacy?.proof?.publicInputs),
        encryptedEnvelopeUtf8Bytes: compactUtf8Bytes(body?.encryptedVote),
        receiptCommitmentUtf8Bytes: compactUtf8Bytes(body?.voteCommitment),
    });
}

if (experimentRun?.runId) {
    headers['X-Review-Run'] = experimentRun.runId;
}

const responseJson = responseBody == null ? '' : JSON.stringify(responseBody);
experimentRun?.addStage?.('application_payload_observation', {
    requestBodyUtf8Bytes: serializedBody == null
        ? 0
        : unescape(encodeURIComponent(serializedBody)).length,
    responseBodyUtf8Bytes: unescape(encodeURIComponent(responseJson)).length,
    httpStatus: response.status,
});

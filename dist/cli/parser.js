"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJsonOutput = parseJsonOutput;
exports.extractResult = extractResult;
exports.isErrorOutput = isErrorOutput;
const errors_1 = require("../types/errors");
/**
 * Attempts to extract a JSON object from CLI stdout.
 *
 * The Aptos CLI often prints informational lines before the JSON payload.
 * This function finds the first `{` or `[` and parses from there.
 *
 * @param stdout - Raw CLI stdout string
 * @returns Parsed JSON value
 * @throws {CliParseError} When no valid JSON can be found in the output
 *
 * @example
 * ```ts
 * // Handles output like: "Compiling...\n{\"Result\": ...}"
 * const data = parseJsonOutput(stdout);
 * ```
 */
function parseJsonOutput(stdout) {
    const trimmed = stdout.trim();
    // Try full string first
    try {
        return JSON.parse(trimmed);
    }
    catch {
        // Find first JSON delimiter
        const braceIdx = trimmed.indexOf("{");
        const bracketIdx = trimmed.indexOf("[");
        let startIdx = -1;
        if (braceIdx >= 0 && bracketIdx >= 0) {
            startIdx = Math.min(braceIdx, bracketIdx);
        }
        else if (braceIdx >= 0) {
            startIdx = braceIdx;
        }
        else if (bracketIdx >= 0) {
            startIdx = bracketIdx;
        }
        if (startIdx >= 0) {
            try {
                return JSON.parse(trimmed.slice(startIdx));
            }
            catch {
                // Fall through to error
            }
        }
        throw new errors_1.CliParseError("Failed to parse JSON from CLI output", trimmed);
    }
}
/**
 * Extracts the `"Result"` field from the standard Aptos CLI JSON response.
 *
 * Most successful CLI commands return `{ "Result": <payload> }`.
 * If the output doesn't have a `Result` key, returns the parsed value directly.
 *
 * @param stdout - Raw CLI stdout string
 * @returns The extracted result value
 *
 * @example
 * ```ts
 * // Input: '{"Result": {"module_ids": ["0x1::foo"]}}'
 * const result = extractResult(stdout); // { module_ids: ["0x1::foo"] }
 * ```
 */
function extractResult(stdout) {
    const parsed = parseJsonOutput(stdout);
    if (parsed && typeof parsed === "object" && "Result" in parsed) {
        return parsed.Result;
    }
    return parsed;
}
/**
 * Checks if CLI output indicates an error response.
 * The Aptos CLI returns `{ "Error": "..." }` on failure.
 */
function isErrorOutput(stdout) {
    try {
        const parsed = parseJsonOutput(stdout);
        return parsed != null && typeof parsed === "object" && "Error" in parsed;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=parser.js.map
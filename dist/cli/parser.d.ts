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
export declare function parseJsonOutput<T = unknown>(stdout: string): T;
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
export declare function extractResult<T = unknown>(stdout: string): T;
/**
 * Checks if CLI output indicates an error response.
 * The Aptos CLI returns `{ "Error": "..." }` on failure.
 */
export declare function isErrorOutput(stdout: string): boolean;
//# sourceMappingURL=parser.d.ts.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeAptosCli = executeAptosCli;
const node_child_process_1 = require("node:child_process");
const errors_1 = require("../types/errors");
/**
 * Executes an Aptos CLI command via `child_process.execFile`.
 *
 * Uses `execFile` (not `exec`) to:
 * - Avoid shell injection — arguments are passed as an array, not interpolated
 * - Skip shell startup overhead
 * - Handle signals properly
 *
 * @param binaryPath - Path to the `aptos` binary
 * @param args - Array of CLI arguments
 * @param options - Execution options (timeout, cwd, env)
 * @returns Resolved with `{ stdout, stderr, exitCode }`
 * @throws {CliExecutionError} When the CLI returns a non-zero exit code (unless `allowFailure` is set)
 *
 * @example
 * ```ts
 * const result = await executeAptosCli('aptos', ['move', 'compile', '--package-dir', './my_module']);
 * console.log(result.stdout);
 * ```
 */
function executeAptosCli(binaryPath, args, options = {}) {
    const { timeout = 120_000, cwd, env, allowFailure = false } = options;
    return new Promise((resolve, reject) => {
        (0, node_child_process_1.execFile)(binaryPath, args, {
            timeout,
            cwd,
            env: { ...process.env, ...env },
            maxBuffer: 10 * 1024 * 1024, // 10 MB
        }, (error, stdout, stderr) => {
            const rawStdout = stdout ?? "";
            const rawStderr = stderr ?? "";
            // When execFile reports an error, extract the exit code.
            // Node sets `error.code` to the exit code number on non-zero exits.
            let exitCode = 0;
            if (error) {
                exitCode =
                    typeof error.code === "number"
                        ? error.code
                        : error.status ?? 1;
            }
            const result = {
                stdout: rawStdout,
                stderr: rawStderr,
                exitCode,
            };
            if (error && !allowFailure) {
                reject(new errors_1.CliExecutionError(`${binaryPath} ${args.join(" ")}`, exitCode, rawStderr, rawStdout));
            }
            else {
                resolve(result);
            }
        });
    });
}
//# sourceMappingURL=executor.js.map
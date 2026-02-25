export interface ExecOptions {
    /** Timeout in milliseconds. Default: 120_000. */
    timeout?: number;
    /** Working directory for the command. */
    cwd?: string;
    /** Extra environment variables merged with `process.env`. */
    env?: Record<string, string>;
    /** If true, do not throw on non-zero exit code. Default: false. */
    allowFailure?: boolean;
}
export interface ExecResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}
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
export declare function executeAptosCli(binaryPath: string, args: string[], options?: ExecOptions): Promise<ExecResult>;
//# sourceMappingURL=executor.d.ts.map
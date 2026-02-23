import { execFile } from "node:child_process";
import { CliExecutionError } from "../types/errors";

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
export function executeAptosCli(
  binaryPath: string,
  args: string[],
  options: ExecOptions = {},
): Promise<ExecResult> {
  const { timeout = 120_000, cwd, env, allowFailure = false } = options;

  return new Promise((resolve, reject) => {
    execFile(
      binaryPath,
      args,
      {
        timeout,
        cwd,
        env: { ...process.env, ...env },
        maxBuffer: 10 * 1024 * 1024, // 10 MB
      },
      (error, stdout, stderr) => {
        const rawStdout = stdout ?? "";
        const rawStderr = stderr ?? "";

        // When execFile reports an error, extract the exit code.
        // Node sets `error.code` to the exit code number on non-zero exits.
        let exitCode = 0;
        if (error) {
          exitCode =
            typeof (error as NodeJS.ErrnoException).code === "number"
              ? ((error as NodeJS.ErrnoException).code as unknown as number)
              : (error as any).status ?? 1;
        }

        const result: ExecResult = {
          stdout: rawStdout,
          stderr: rawStderr,
          exitCode,
        };

        if (error && !allowFailure) {
          reject(
            new CliExecutionError(
              `${binaryPath} ${args.join(" ")}`,
              exitCode,
              rawStderr,
              rawStdout,
            ),
          );
        } else {
          resolve(result);
        }
      },
    );
  });
}

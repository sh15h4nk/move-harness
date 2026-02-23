/**
 * Base error for all move-harness errors.
 * All errors thrown by this package extend this class, making it easy
 * to catch any package error with a single `instanceof` check.
 */
export class HarnessError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "HarnessError";
  }
}

/**
 * Thrown when the Aptos CLI returns a non-zero exit code.
 * Contains the full command, exit code, and raw stdout/stderr for debugging.
 *
 * @example
 * ```ts
 * try {
 *   await session.publish({ ... });
 * } catch (e) {
 *   if (e instanceof CliExecutionError) {
 *     console.error(`Command failed: ${e.command}`);
 *     console.error(`stderr: ${e.stderr}`);
 *   }
 * }
 * ```
 */
export class CliExecutionError extends HarnessError {
  constructor(
    public readonly command: string,
    public readonly exitCode: number | null,
    public readonly stderr: string,
    public readonly stdout: string,
  ) {
    super(`CLI command failed (exit ${exitCode}): ${command}\n${stderr}`);
    this.name = "CliExecutionError";
  }
}

/**
 * Thrown when CLI output cannot be parsed as expected JSON.
 * Contains the raw output string for manual inspection.
 */
export class CliParseError extends HarnessError {
  constructor(
    message: string,
    public readonly rawOutput: string,
  ) {
    super(message);
    this.name = "CliParseError";
  }
}

/**
 * Thrown when Move module compilation fails.
 * Contains the compiler diagnostics (error messages, locations, etc.).
 */
export class CompilationError extends HarnessError {
  constructor(
    message: string,
    public readonly diagnostics: string,
  ) {
    super(message);
    this.name = "CompilationError";
  }
}

/**
 * Thrown when a simulated transaction is aborted by the Move VM.
 * Contains the abort code and module location when available.
 *
 * @example
 * ```ts
 * try {
 *   await session.run({ functionId: '0x1::module::func', ... });
 * } catch (e) {
 *   if (e instanceof SimulationAbortError) {
 *     console.error(`Aborted with code ${e.abortCode} at ${e.location}`);
 *   }
 * }
 * ```
 */
export class SimulationAbortError extends HarnessError {
  constructor(
    message: string,
    public readonly abortCode?: string,
    public readonly location?: string,
  ) {
    super(message);
    this.name = "SimulationAbortError";
  }
}

/**
 * Thrown when any method is called on a session that has been destroyed.
 */
export class SessionDestroyedError extends HarnessError {
  constructor() {
    super("Session has been destroyed and cannot be used");
    this.name = "SessionDestroyedError";
  }
}

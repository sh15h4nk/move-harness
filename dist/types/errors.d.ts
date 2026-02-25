/**
 * Base error for all move-harness errors.
 * All errors thrown by this package extend this class, making it easy
 * to catch any package error with a single `instanceof` check.
 */
export declare class HarnessError extends Error {
    readonly cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
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
export declare class CliExecutionError extends HarnessError {
    readonly command: string;
    readonly exitCode: number | null;
    readonly stderr: string;
    readonly stdout: string;
    constructor(command: string, exitCode: number | null, stderr: string, stdout: string);
}
/**
 * Thrown when CLI output cannot be parsed as expected JSON.
 * Contains the raw output string for manual inspection.
 */
export declare class CliParseError extends HarnessError {
    readonly rawOutput: string;
    constructor(message: string, rawOutput: string);
}
/**
 * Thrown when Move module compilation fails.
 * Contains the compiler diagnostics (error messages, locations, etc.).
 */
export declare class CompilationError extends HarnessError {
    readonly diagnostics: string;
    constructor(message: string, diagnostics: string);
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
export declare class SimulationAbortError extends HarnessError {
    readonly abortCode?: string | undefined;
    readonly location?: string | undefined;
    constructor(message: string, abortCode?: string | undefined, location?: string | undefined);
}
/**
 * Thrown when any method is called on a session that has been destroyed.
 */
export declare class SessionDestroyedError extends HarnessError {
    constructor();
}
//# sourceMappingURL=errors.d.ts.map
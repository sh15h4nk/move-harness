"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionDestroyedError = exports.SimulationAbortError = exports.CompilationError = exports.CliParseError = exports.CliExecutionError = exports.HarnessError = void 0;
/**
 * Base error for all move-harness errors.
 * All errors thrown by this package extend this class, making it easy
 * to catch any package error with a single `instanceof` check.
 */
class HarnessError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = "HarnessError";
    }
}
exports.HarnessError = HarnessError;
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
class CliExecutionError extends HarnessError {
    command;
    exitCode;
    stderr;
    stdout;
    constructor(command, exitCode, stderr, stdout) {
        super(`CLI command failed (exit ${exitCode}): ${command}\n${stderr}`);
        this.command = command;
        this.exitCode = exitCode;
        this.stderr = stderr;
        this.stdout = stdout;
        this.name = "CliExecutionError";
    }
}
exports.CliExecutionError = CliExecutionError;
/**
 * Thrown when CLI output cannot be parsed as expected JSON.
 * Contains the raw output string for manual inspection.
 */
class CliParseError extends HarnessError {
    rawOutput;
    constructor(message, rawOutput) {
        super(message);
        this.rawOutput = rawOutput;
        this.name = "CliParseError";
    }
}
exports.CliParseError = CliParseError;
/**
 * Thrown when Move module compilation fails.
 * Contains the compiler diagnostics (error messages, locations, etc.).
 */
class CompilationError extends HarnessError {
    diagnostics;
    constructor(message, diagnostics) {
        super(message);
        this.diagnostics = diagnostics;
        this.name = "CompilationError";
    }
}
exports.CompilationError = CompilationError;
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
class SimulationAbortError extends HarnessError {
    abortCode;
    location;
    constructor(message, abortCode, location) {
        super(message);
        this.abortCode = abortCode;
        this.location = location;
        this.name = "SimulationAbortError";
    }
}
exports.SimulationAbortError = SimulationAbortError;
/**
 * Thrown when any method is called on a session that has been destroyed.
 */
class SessionDestroyedError extends HarnessError {
    constructor() {
        super("Session has been destroyed and cannot be used");
        this.name = "SessionDestroyedError";
    }
}
exports.SessionDestroyedError = SessionDestroyedError;
//# sourceMappingURL=errors.js.map
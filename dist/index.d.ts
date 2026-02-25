export { SimulationSession } from "./core/session";
export type { GeneratedAccount } from "./core/session";
export type { SessionConfig, CompileOptions, PublishOptions, RunOptions, ViewOptions, RunScriptOptions, FundOptions, ViewResourceOptions, Network, } from "./types/config";
export type { CompileResult, PublishResult, RunResult, ViewResult, FundResult, ViewResourceResult, } from "./types/results";
export { HarnessError, CliExecutionError, CliParseError, CompilationError, SimulationAbortError, SessionDestroyedError, } from "./types/errors";
export { MoveArg } from "./utils/args";
/**
 * Convenience factory for creating a simulation session.
 * Equivalent to `SimulationSession.create(config)`.
 *
 * @param config - Session configuration
 * @returns A fully initialized simulation session
 *
 * @example
 * ```ts
 * import { createSession } from 'move-harness';
 *
 * const session = await createSession({ network: 'mainnet' });
 * ```
 */
export declare function createSession(config?: import("./types/config").SessionConfig): Promise<import("./core/session").SimulationSession>;
//# sourceMappingURL=index.d.ts.map
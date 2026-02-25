/**
 * Result from compiling a Move package.
 */
export interface CompileResult {
    /** Module IDs that were compiled (e.g. `["0xCAFE::my_module"]`). */
    moduleIds: string[];
    /** Path to the build output directory. */
    buildDir: string;
    /** Raw CLI stdout for debugging. */
    raw: string;
}
/**
 * Result from publishing a Move package to the simulation session.
 */
export interface PublishResult {
    /** Whether the publish transaction succeeded. */
    success: boolean;
    /** Transaction hash (local simulation hash). */
    transactionHash?: string;
    /** Gas units consumed. */
    gasUsed?: number;
    /** Raw CLI stdout for debugging. */
    raw: string;
}
/**
 * Result from running an entry function or script in the simulation session.
 */
export interface RunResult {
    /** Whether the transaction succeeded. */
    success: boolean;
    /** VM status string (e.g. `"Executed successfully"` or `"Move abort..."`). */
    vmStatus?: string;
    /** Gas units consumed. */
    gasUsed?: number;
    /** Events emitted during execution. */
    events?: unknown[];
    /** State changes produced by the transaction. */
    changes?: unknown[];
    /** Raw CLI stdout for debugging. */
    raw: string;
    /** Raw CLI stderr — may contain additional diagnostics. */
    stderr?: string;
}
/**
 * Result from calling a view function.
 * @typeParam T - The expected return type of the view function.
 */
export interface ViewResult<T = unknown> {
    /** Parsed return values from the view function. */
    returnValues: T;
    /** Raw CLI stdout for debugging. */
    raw: string;
}
/**
 * Result from funding an account in the simulation session.
 */
export interface FundResult {
    /** Whether the funding succeeded. */
    success: boolean;
    /** Raw CLI stdout for debugging. */
    raw: string;
}
/**
 * Result from reading a resource from the simulation session state.
 * @typeParam T - The expected shape of the resource data.
 */
export interface ViewResourceResult<T = unknown> {
    /** Parsed resource data. */
    data: T;
    /** Raw CLI stdout for debugging. */
    raw: string;
}
//# sourceMappingURL=results.d.ts.map
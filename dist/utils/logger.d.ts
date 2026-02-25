/** Shorten an address to `0xab12…cd34` */
export declare function shortAddr(addr: string): string;
/** Extract `module::function` from a full function ID. */
export declare function shortFn(fnId: string): string;
/**
 * Structured analytical logger for `move-harness`.
 *
 * Writes to `stderr` so it never pollutes programmatic `stdout` output.
 * Respects TTY — uses ANSI colors when stderr is a terminal, plain text otherwise.
 *
 * VM errors are output with indented detail lines so the user can trace
 * the failure context from the parent operation in the log.
 *
 * @example
 * ```
 * [12:34:56.789]  harness  ── fork ─────────────────────────────
 * [12:34:56.790]  harness  │ Forking mainnet...
 * [12:34:58.031]  harness  ✔ fork         Session ready                        1.24s
 *
 * [12:34:58.032]  harness  ── run ──────────────────────────────
 * [12:34:58.033]  harness  │ pool::initialize
 * [12:34:58.873]  harness  ✗ run          FAILED                               840ms
 * [12:34:58.873]  harness  │   status    : Move abort
 * [12:34:58.873]  harness  │   code      : EINSUFFICIENT_BALANCE (0x10006)
 * [12:34:58.873]  harness  │   location  : 0x1::coin
 * ```
 */
export declare class Logger {
    private enabled;
    constructor(enabled: boolean);
    private write;
    private prefix;
    /** Print a section header for a new operation. */
    header(tag: string): void;
    /** Log the start of an operation — appears under the header. */
    step(tag: string, message: string): void;
    /** Log successful completion of an operation. */
    done(tag: string, message: string, ms?: number): void;
    /** Log a failed operation with a single-line summary. */
    fail(tag: string, message: string, ms?: number): void;
    /**
     * Log a VM error with structured, indented detail lines.
     * Each field appears on its own line under the parent operation
     * so the user can scan upward to see which operation caused it.
     */
    vmError(info: {
        vmStatus: string;
        rawVmStatus?: string;
        abortCode?: string;
        location?: string;
        functionId?: string;
        gasUsed?: number;
        description?: string;
    }, ms?: number): void;
    /** Print an indented key-value detail line beneath an operation. */
    detail(key: string, value: string): void;
    /** Print a blank separator line. */
    blank(): void;
}
//# sourceMappingURL=logger.d.ts.map
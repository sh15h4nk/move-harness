const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const WHITE = "\x1b[37m";

const useColor = process.stderr.isTTY ?? false;

function c(color: string, text: string): string {
  return useColor ? `${color}${text}${RESET}` : text;
}

function fmtMs(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function timestamp(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const ms = String(now.getMilliseconds()).padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
}

/** Shorten an address to `0xab12…cd34` */
export function shortAddr(addr: string): string {
  if (addr.length <= 14) return addr;
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

/** Extract `module::function` from a full function ID. */
export function shortFn(fnId: string): string {
  const parts = fnId.split("::");
  return parts.length >= 3 ? parts.slice(-2).join("::") : fnId;
}

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
export class Logger {
  private enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  private write(line: string): void {
    process.stderr.write(line + "\n");
  }

  private prefix(): string {
    return `${c(DIM, `[${timestamp()}]`)}  ${c(BOLD + WHITE, "harness")}`;
  }

  /** Print a section header for a new operation. */
  header(tag: string): void {
    if (!this.enabled) return;
    const label = ` ${tag} `;
    const rule = "─".repeat(Math.max(0, 42 - label.length));
    this.write(`${this.prefix()}  ${c(DIM, "──")}${c(CYAN, label)}${c(DIM, rule)}`);
  }

  /** Log the start of an operation — appears under the header. */
  step(tag: string, message: string): void {
    if (!this.enabled) return;
    this.header(tag);
    this.write(`${this.prefix()}  ${c(DIM, "│")} ${message}`);
  }

  /** Log successful completion of an operation. */
  done(tag: string, message: string, ms?: number): void {
    if (!this.enabled) return;
    const sym = c(GREEN, "✔");
    const t = c(GREEN, tag.padEnd(12));
    const dur = ms != null ? c(DIM, fmtMs(ms).padStart(10)) : "";
    this.write(`${this.prefix()}  ${sym} ${t}  ${message}${dur ? `  ${dur}` : ""}`);
  }

  /** Log a failed operation with a single-line summary. */
  fail(tag: string, message: string, ms?: number): void {
    if (!this.enabled) return;
    const sym = c(RED, "✗");
    const t = c(RED, tag.padEnd(12));
    const dur = ms != null ? c(DIM, fmtMs(ms).padStart(10)) : "";
    this.write(`${this.prefix()}  ${sym} ${t}  ${c(RED + BOLD, "FAILED")}${dur ? `  ${dur}` : ""}`);
    // Print error detail indented under the fail line
    this.detail("reason", message);
  }

  /**
   * Log a VM error with structured, indented detail lines.
   * Each field appears on its own line under the parent operation
   * so the user can scan upward to see which operation caused it.
   */
  vmError(info: {
    vmStatus: string;
    abortCode?: string;
    location?: string;
    functionId?: string;
    gasUsed?: number;
  }, ms?: number): void {
    if (!this.enabled) return;
    const sym = c(RED, "✗");
    const t = c(RED, "run".padEnd(12));
    const dur = ms != null ? c(DIM, fmtMs(ms).padStart(10)) : "";
    this.write(`${this.prefix()}  ${sym} ${t}  ${c(RED + BOLD, "VM ERROR")}${dur ? `  ${dur}` : ""}`);

    this.detail("status", info.vmStatus);
    if (info.abortCode) this.detail("code", info.abortCode);
    if (info.location) this.detail("location", info.location);
    if (info.functionId) this.detail("function", shortFn(info.functionId));
    if (info.gasUsed != null) this.detail("gas used", info.gasUsed.toLocaleString());
  }

  /** Print an indented key-value detail line beneath an operation. */
  detail(key: string, value: string): void {
    if (!this.enabled) return;
    const pipe = c(DIM, "│");
    const k = c(YELLOW, key.padEnd(10));
    this.write(`${this.prefix()}  ${pipe}   ${k} : ${value}`);
  }

  /** Print a blank separator line. */
  blank(): void {
    if (!this.enabled) return;
    this.write("");
  }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
exports.shortAddr = shortAddr;
exports.shortFn = shortFn;
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const WHITE = "\x1b[37m";
const MAGENTA = "\x1b[35m";
const useColor = process.stderr.isTTY ?? false;
function c(color, text) {
    return useColor ? `${color}${text}${RESET}` : text;
}
function fmtMs(ms) {
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}
function timestamp() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    const ms = String(now.getMilliseconds()).padStart(3, "0");
    return `${h}:${m}:${s}.${ms}`;
}
/** Shorten an address to `0xab12…cd34` */
function shortAddr(addr) {
    if (addr.length <= 14)
        return addr;
    return addr.slice(0, 6) + "…" + addr.slice(-4);
}
/** Extract `module::function` from a full function ID. */
function shortFn(fnId) {
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
class Logger {
    enabled;
    constructor(enabled) {
        this.enabled = enabled;
    }
    write(line) {
        process.stderr.write(line + "\n");
    }
    prefix() {
        return `${c(DIM, `[${timestamp()}]`)}  ${c(BOLD + WHITE, "harness")}`;
    }
    /** Print a section header for a new operation. */
    header(tag) {
        if (!this.enabled)
            return;
        const label = ` ${tag} `;
        const rule = "─".repeat(Math.max(0, 42 - label.length));
        this.write(`${this.prefix()}  ${c(DIM, "──")}${c(CYAN, label)}${c(DIM, rule)}`);
    }
    /** Log the start of an operation — appears under the header. */
    step(tag, message) {
        if (!this.enabled)
            return;
        this.header(tag);
        this.write(`${this.prefix()}  ${c(DIM, "│")} ${message}`);
    }
    /** Log successful completion of an operation. */
    done(tag, message, ms) {
        if (!this.enabled)
            return;
        const sym = c(GREEN, "✔");
        const t = c(GREEN, tag.padEnd(12));
        const dur = ms != null ? c(DIM, fmtMs(ms).padStart(10)) : "";
        this.write(`${this.prefix()}  ${sym} ${t}  ${message}${dur ? `  ${dur}` : ""}`);
    }
    /** Log a failed operation with a single-line summary. */
    fail(tag, message, ms) {
        if (!this.enabled)
            return;
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
    vmError(info, ms) {
        if (!this.enabled)
            return;
        const sym = c(RED, "✗");
        const t = c(RED, "run".padEnd(12));
        const dur = ms != null ? c(DIM, fmtMs(ms).padStart(10)) : "";
        this.write(`${this.prefix()}  ${sym} ${t}  ${c(RED + BOLD, "VM ERROR")}${dur ? `  ${dur}` : ""}`);
        this.detail("status", info.vmStatus);
        if (info.abortCode) {
            const decoded = info.category
                ? `${info.abortCode} (${info.category}, reason=${info.reason})`
                : info.abortCode;
            this.detail("code", decoded);
        }
        if (info.location)
            this.detail("location", info.location);
        if (info.message)
            this.detail("message", info.message);
        if (info.functionId)
            this.detail("function", shortFn(info.functionId));
        if (info.gasUsed != null)
            this.detail("gas used", info.gasUsed.toLocaleString());
        // Show the raw vm_status when it carries extra info beyond parsed fields
        if (info.rawVmStatus && info.rawVmStatus !== info.vmStatus) {
            this.detail("vm_status", info.rawVmStatus);
        }
    }
    /** Log inferred module trace from a transaction. */
    moduleTrace(modules) {
        if (!this.enabled || modules.length === 0)
            return;
        const pipe = c(DIM, "│");
        this.write(`${this.prefix()}  ${pipe}   ${c(MAGENTA, "trace")} ${c(DIM, `(${modules.length} modules)`)}`);
        for (let i = 0; i < modules.length; i++) {
            const arrow = i === 0 ? "→" : "↳";
            const mod = modules[i].split("::").length >= 2
                ? `${shortAddr(modules[i].split("::")[0])}::${modules[i].split("::")[1]}`
                : modules[i];
            this.write(`${this.prefix()}  ${pipe}     ${c(DIM, arrow)} ${c(CYAN, mod)}`);
        }
    }
    /** Log balance changes from a transaction. */
    balanceChanges(changes) {
        if (!this.enabled || changes.length === 0)
            return;
        const pipe = c(DIM, "│");
        this.write(`${this.prefix()}  ${pipe}   ${c(MAGENTA, "balances")}`);
        for (const bc of changes) {
            const coin = bc.coinType.split("::").pop() ?? bc.coinType;
            this.write(`${this.prefix()}  ${pipe}     ${shortAddr(bc.address)}  ${coin}  ${c(BOLD, bc.amount)}`);
        }
    }
    /** Log emitted events from a transaction. */
    events(events) {
        if (!this.enabled || events.length === 0)
            return;
        const pipe = c(DIM, "│");
        this.write(`${this.prefix()}  ${pipe}   ${c(MAGENTA, "events")} ${c(DIM, `(${events.length})`)}`);
        for (const ev of events) {
            const evType = ev.type.split("::").slice(-2).join("::");
            const summary = typeof ev.data === "object" && ev.data !== null
                ? Object.entries(ev.data).map(([k, v]) => `${k}=${v}`).join(" ")
                : String(ev.data ?? "");
            const addr = ev.address ? `${shortAddr(ev.address)} ` : "";
            this.write(`${this.prefix()}  ${pipe}     ${addr}${c(CYAN, evType)}  ${c(DIM, summary)}`);
        }
    }
    /** Log resource changes summary from a transaction. */
    resourceChanges(changes) {
        if (!this.enabled || changes.length === 0)
            return;
        const pipe = c(DIM, "│");
        const counts = {};
        for (const rc of changes) {
            counts[rc.type] = (counts[rc.type] ?? 0) + 1;
        }
        const summary = Object.entries(counts).map(([t, n]) => `${t}=${n}`).join(" ");
        this.write(`${this.prefix()}  ${pipe}   ${c(MAGENTA, "changes")} ${c(DIM, summary)}`);
        for (const rc of changes) {
            if (rc.resourceType) {
                const short = rc.resourceType.split("::").slice(-2).join("::").split("<")[0];
                const addr = rc.address ? `${shortAddr(rc.address)} ` : "";
                this.write(`${this.prefix()}  ${pipe}     ${c(DIM, rc.type.replace("write_", "W ").replace("delete_", "D "))} ${addr}${short}`);
            }
        }
    }
    /** Print an indented key-value detail line beneath an operation. */
    detail(key, value) {
        if (!this.enabled)
            return;
        const pipe = c(DIM, "│");
        const k = c(YELLOW, key.padEnd(10));
        this.write(`${this.prefix()}  ${pipe}   ${k} : ${value}`);
    }
    /** Print a blank separator line. */
    blank() {
        if (!this.enabled)
            return;
        this.write("");
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map
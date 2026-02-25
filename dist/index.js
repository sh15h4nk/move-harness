"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoveArg = exports.SessionDestroyedError = exports.SimulationAbortError = exports.CompilationError = exports.CliParseError = exports.CliExecutionError = exports.HarnessError = exports.SimulationSession = void 0;
exports.createSession = createSession;
// Core
var session_1 = require("./core/session");
Object.defineProperty(exports, "SimulationSession", { enumerable: true, get: function () { return session_1.SimulationSession; } });
// Types — Errors
var errors_1 = require("./types/errors");
Object.defineProperty(exports, "HarnessError", { enumerable: true, get: function () { return errors_1.HarnessError; } });
Object.defineProperty(exports, "CliExecutionError", { enumerable: true, get: function () { return errors_1.CliExecutionError; } });
Object.defineProperty(exports, "CliParseError", { enumerable: true, get: function () { return errors_1.CliParseError; } });
Object.defineProperty(exports, "CompilationError", { enumerable: true, get: function () { return errors_1.CompilationError; } });
Object.defineProperty(exports, "SimulationAbortError", { enumerable: true, get: function () { return errors_1.SimulationAbortError; } });
Object.defineProperty(exports, "SessionDestroyedError", { enumerable: true, get: function () { return errors_1.SessionDestroyedError; } });
// Utils — Argument helpers
var args_1 = require("./utils/args");
Object.defineProperty(exports, "MoveArg", { enumerable: true, get: function () { return args_1.MoveArg; } });
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
async function createSession(config) {
    const { SimulationSession } = await Promise.resolve().then(() => __importStar(require("./core/session")));
    return SimulationSession.create(config);
}
//# sourceMappingURL=index.js.map
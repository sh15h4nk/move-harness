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
exports.SimulationSession = void 0;
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
const crypto = __importStar(require("node:crypto"));
const ts_sdk_1 = require("@aptos-labs/ts-sdk");
const executor_1 = require("../cli/executor");
const parser_1 = require("../cli/parser");
const logger_1 = require("../utils/logger");
const errors_1 = require("../types/errors");
/**
 * A simulation session that forks Aptos network state for local testing.
 *
 * This is the primary entry point for the `move-harness` package. It wraps the
 * Aptos CLI's Transaction Simulation Sessions to provide a TypeScript-native
 * interface for:
 *
 * - Forking mainnet/testnet/devnet state (lazy on-demand fetching)
 * - Compiling and publishing Move modules to the fork
 * - Running entry functions and calling view functions
 * - Reading resources from forked state
 * - Funding accounts within the simulation
 *
 * All operations happen locally — nothing touches the real network.
 *
 * @example
 * ```ts
 * import { SimulationSession, MoveArg } from 'move-harness';
 *
 * const session = await SimulationSession.create({
 *   network: 'mainnet',
 *   apiKey: process.env.APTOS_API_KEY,
 * });
 *
 * const account = session.generateAccount();
 * await session.fund({ account: account.address, amount: 100_000_000_00 });
 *
 * await session.compileAndPublish({
 *   packageDir: './move/my_module',
 *   namedAddresses: { my_module: account.address },
 *   senderAddress: account.address,
 *   privateKey: account.privateKey,
 * });
 *
 * const result = await session.run({
 *   functionId: `${account.address}::my_module::do_something`,
 *   args: [MoveArg.u64(42)],
 *   senderAddress: account.address,
 *   privateKey: account.privateKey,
 * });
 *
 * await session.destroy();
 * ```
 */
class SimulationSession {
    /** Absolute path to the session directory on disk. */
    sessionPath;
    /** Network this session was forked from. */
    network;
    aptosBin;
    commandTimeout;
    persist;
    apiKey;
    log;
    destroyed = false;
    buildDirs = new Set();
    constructor(config) {
        this.sessionPath = config.sessionPath;
        this.network = config.network;
        this.aptosBin = config.aptosBinaryPath;
        this.commandTimeout = config.commandTimeout;
        this.persist = config.persist;
        this.apiKey = config.apiKey;
        this.log = new logger_1.Logger(!config.silent);
    }
    // ──────────────────────────────────────────────
    //  Factory
    // ──────────────────────────────────────────────
    /**
     * Creates and initializes a new simulation session by forking network state.
     *
     * This calls `aptos move sim init` under the hood, which sets up a local
     * session directory and configures lazy state fetching from the target network.
     *
     * @param config - Session configuration (network, API key, paths, etc.)
     * @returns A fully initialized `SimulationSession` ready for operations
     * @throws {CliExecutionError} If the Aptos CLI is not installed or the init command fails
     *
     * @example
     * ```ts
     * // Fork mainnet with API key
     * const session = await SimulationSession.create({
     *   network: 'mainnet',
     *   apiKey: process.env.APTOS_API_KEY,
     * });
     *
     * // Fork devnet (no API key needed for testing)
     * const devSession = await SimulationSession.create({
     *   network: 'devnet',
     * });
     * ```
     */
    static async create(config = {}) {
        const resolved = resolveConfig(config);
        const session = new SimulationSession(resolved);
        await session.init();
        return session;
    }
    // ──────────────────────────────────────────────
    //  Lifecycle
    // ──────────────────────────────────────────────
    async init() {
        this.log.step("fork", `Forking ${this.network}...`);
        const start = performance.now();
        const args = ["move", "sim", "init", "--path", this.sessionPath];
        if (this.network) {
            args.push("--network", this.network);
        }
        if (this.apiKey) {
            args.push("--api-key", this.apiKey);
        }
        try {
            await this.exec(args);
            this.log.done("fork", "Session ready", performance.now() - start);
            this.log.detail("path", this.sessionPath);
            this.log.detail("network", this.network);
            this.log.blank();
        }
        catch (err) {
            this.log.fail("fork", extractCliError(err), performance.now() - start);
            this.log.blank();
            throw err;
        }
    }
    /**
     * Removes the build directory for a given package and untracks it.
     */
    cleanBuildDir(packageDir, outputDir) {
        const buildDir = path.resolve(outputDir ?? path.join(packageDir, "build"));
        if (fs.existsSync(buildDir)) {
            fs.rmSync(buildDir, { recursive: true, force: true });
            this.log.detail("cleaned", buildDir);
        }
        this.buildDirs.delete(buildDir);
    }
    /**
     * Destroys the session and cleans up the session directory.
     *
     * If `persist` was set to `true` in the config, the session directory
     * is kept on disk for inspection. Otherwise it is deleted.
     *
     * Safe to call multiple times — subsequent calls are no-ops.
     *
     * @example
     * ```ts
     * await session.destroy();
     * // session is now unusable — any method call will throw SessionDestroyedError
     * ```
     */
    async destroy() {
        if (this.destroyed)
            return;
        this.destroyed = true;
        this.log.step("destroy", "Cleaning up session");
        // Remove build artifacts created by compile()
        for (const dir of this.buildDirs) {
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true });
                this.log.detail("removed", dir);
            }
        }
        this.buildDirs.clear();
        // Remove session directory
        if (!this.persist && fs.existsSync(this.sessionPath)) {
            fs.rmSync(this.sessionPath, { recursive: true, force: true });
        }
        this.log.done("destroy", this.persist ? "Session preserved on disk" : "Session removed");
        this.log.blank();
    }
    // ──────────────────────────────────────────────
    //  Account Generation
    // ──────────────────────────────────────────────
    /**
     * Generates a new random Ed25519 account for use within the simulation.
     *
     * Uses the Aptos TS SDK's `Account.generate()` to create a cryptographically
     * secure keypair. The returned account is ephemeral — it only exists within
     * the simulation session.
     *
     * You must call `fund()` after generating an account to give it APT.
     *
     * @returns Account address, private key, and public key (all hex-encoded)
     *
     * @example
     * ```ts
     * const deployer = session.generateAccount();
     * await session.fund({ account: deployer.address, amount: 100_000_000_00 });
     * ```
     */
    generateAccount() {
        const account = ts_sdk_1.Account.generate();
        const privateKeyHex = account.privateKey.toString();
        const publicKeyHex = account.publicKey.toString();
        const address = account.accountAddress.toString();
        this.log.step("account", `Generated ${(0, logger_1.shortAddr)(address)}`);
        this.log.blank();
        return {
            address,
            privateKey: privateKeyHex,
            publicKey: publicKeyHex,
        };
    }
    // ──────────────────────────────────────────────
    //  Compilation
    // ──────────────────────────────────────────────
    /**
     * Compiles a Move package using the Aptos CLI.
     *
     * This is a local operation — it does not interact with the simulation session.
     * Compilation produces bytecode and metadata in the package's `build/` directory,
     * which is required before calling `publish()`.
     *
     * @param options - Compilation options (package dir, named addresses, etc.)
     * @returns Compiled module IDs and build directory path
     * @throws {CompilationError} If the Move compiler reports errors
     * @throws {CliExecutionError} If the CLI command fails
     *
     * @example
     * ```ts
     * const compiled = await session.compile({
     *   packageDir: './move/my_module',
     *   namedAddresses: { my_module: deployer.address },
     * });
     * console.log('Compiled:', compiled.moduleIds);
     * ```
     */
    async compile(options) {
        this.assertAlive();
        this.log.step("compile", `Compiling ${options.packageDir}`);
        const start = performance.now();
        const args = ["move", "compile"];
        if (options.saveMetadata !== false) {
            args.push("--save-metadata");
        }
        args.push("--package-dir", path.resolve(options.packageDir));
        if (options.namedAddresses) {
            args.push("--named-addresses", formatNamedAddresses(options.namedAddresses));
        }
        if (options.outputDir) {
            args.push("--output-dir", path.resolve(options.outputDir));
        }
        if (options.skipFetchLatestGitDeps) {
            args.push("--skip-fetch-latest-git-deps");
        }
        if (options.dev) {
            args.push("--dev");
        }
        try {
            const result = await this.exec(args, { cwd: options.packageDir });
            const parsed = (0, parser_1.extractResult)(result.stdout);
            const moduleIds = parsed?.module_ids ?? [];
            const buildDir = path.resolve(options.outputDir ?? path.join(options.packageDir, "build"));
            this.buildDirs.add(buildDir);
            this.log.done("compile", `${moduleIds.length} module(s) compiled`, performance.now() - start);
            for (const id of moduleIds) {
                this.log.detail("module", id);
            }
            this.log.blank();
            return {
                moduleIds,
                buildDir,
                raw: result.stdout,
            };
        }
        catch (err) {
            this.log.fail("compile", extractCliError(err), performance.now() - start);
            // Clean up build artifacts on failure
            this.cleanBuildDir(options.packageDir, options.outputDir);
            if (err.stderr) {
                this.log.detail("package", options.packageDir);
                this.log.blank();
                throw new errors_1.CompilationError(`Move compilation failed for ${options.packageDir}`, err.stderr);
            }
            this.log.blank();
            throw err;
        }
    }
    // ──────────────────────────────────────────────
    //  Publishing
    // ──────────────────────────────────────────────
    /**
     * Publishes a compiled Move package to the simulation session.
     *
     * The package must be compiled first (either via `compile()` or `compileAndPublish()`).
     * The modules are deployed to the fork and become callable by subsequent
     * `run()` and `view()` calls — including interactions with real mainnet protocols.
     *
     * @param options - Publish options (package dir, sender, private key, etc.)
     * @returns Publish result with success status and gas used
     * @throws {CliExecutionError} If publishing fails
     *
     * @example
     * ```ts
     * await session.publish({
     *   packageDir: './move/my_module',
     *   namedAddresses: { my_module: deployer.address },
     *   senderAddress: deployer.address,
     *   privateKey: deployer.privateKey,
     * });
     * ```
     */
    async publish(options) {
        this.assertAlive();
        this.log.step("publish", `Publishing to ${(0, logger_1.shortAddr)(options.senderAddress)}`);
        const start = performance.now();
        const args = [
            "move",
            "publish",
            "--session",
            this.sessionPath,
            "--package-dir",
            path.resolve(options.packageDir),
            "--sender-account",
            options.senderAddress,
            "--private-key",
            options.privateKey,
            "--assume-yes",
        ];
        if (options.namedAddresses) {
            args.push("--named-addresses", formatNamedAddresses(options.namedAddresses));
        }
        if (options.includedArtifacts) {
            args.push("--included-artifacts", options.includedArtifacts);
        }
        if (options.overrideSizeCheck) {
            args.push("--override-size-check");
        }
        let result;
        try {
            result = await this.exec(args, { cwd: options.packageDir });
        }
        catch (err) {
            const elapsed = performance.now() - start;
            this.log.fail("publish", extractCliError(err), elapsed);
            // Clean up build artifacts on failure
            this.cleanBuildDir(options.packageDir);
            this.log.blank();
            throw err;
        }
        let success = true;
        let transactionHash;
        let gasUsed;
        let vmStatus;
        try {
            const parsed = (0, parser_1.parseJsonOutput)(result.stdout);
            if ((0, parser_1.isErrorOutput)(result.stdout)) {
                success = false;
                vmStatus = parsed?.Error;
            }
            else {
                const txResult = parsed?.Result;
                transactionHash = txResult?.transaction_hash;
                gasUsed = txResult?.gas_used != null ? Number(txResult.gas_used) : undefined;
                if (txResult?.success === false) {
                    success = false;
                    vmStatus = txResult?.vm_status;
                }
            }
        }
        catch {
            // If parsing fails but CLI exited 0, treat as success
        }
        const elapsed = performance.now() - start;
        if (success) {
            this.log.done("publish", "Published", elapsed);
            if (transactionHash)
                this.log.detail("tx", transactionHash);
            if (gasUsed != null)
                this.log.detail("gas", gasUsed.toLocaleString());
        }
        else {
            this.log.vmError({
                vmStatus: vmStatus ?? "Publish failed",
                gasUsed,
            }, elapsed);
        }
        this.log.blank();
        return { success, transactionHash, gasUsed, raw: result.stdout };
    }
    /**
     * Compiles and publishes a Move package in one call.
     *
     * Convenience method that calls `compile()` then `publish()` sequentially.
     * This is the most common pattern for deploying developing modules to the fork.
     *
     * @param options - Combined compile + publish options
     * @returns Publish result
     *
     * @example
     * ```ts
     * await session.compileAndPublish({
     *   packageDir: './move/my_module',
     *   namedAddresses: { my_module: deployer.address },
     *   senderAddress: deployer.address,
     *   privateKey: deployer.privateKey,
     * });
     * ```
     */
    async compileAndPublish(options) {
        await this.compile(options);
        return this.publish(options);
    }
    // ──────────────────────────────────────────────
    //  Execution
    // ──────────────────────────────────────────────
    /**
     * Runs an entry function against the simulation session.
     *
     * The function executes against the forked state, which includes all
     * mainnet-deployed protocols. Your module can call into live DEXes,
     * lending protocols, oracles, etc.
     *
     * @param options - Function ID, arguments, sender, and private key
     * @returns Execution result with success status, gas used, events, and state changes
     * @throws {CliExecutionError} If the CLI command fails
     *
     * @example
     * ```ts
     * // Call your module which internally swaps on Liquidswap
     * const result = await session.run({
     *   functionId: `${deployer.address}::aggregator::swap`,
     *   typeArgs: ['0x1::aptos_coin::AptosCoin', '0x...::asset::USDC'],
     *   args: [MoveArg.u64(100_000_000)],
     *   senderAddress: deployer.address,
     *   privateKey: deployer.privateKey,
     * });
     *
     * console.log('Success:', result.success);
     * console.log('Gas used:', result.gasUsed);
     * console.log('Events:', result.events);
     * ```
     */
    async run(options) {
        this.assertAlive();
        this.log.step("run", (0, logger_1.shortFn)(options.functionId));
        const start = performance.now();
        const args = [
            "move",
            "run",
            "--session",
            this.sessionPath,
            "--function-id",
            options.functionId,
            "--sender-account",
            options.senderAddress,
            "--private-key",
            options.privateKey,
            "--assume-yes",
        ];
        if (options.typeArgs?.length) {
            args.push("--type-args", ...options.typeArgs);
        }
        if (options.args?.length) {
            args.push("--args", ...options.args);
        }
        if (options.maxGas != null) {
            args.push("--max-gas", String(options.maxGas));
        }
        let result;
        try {
            result = await this.exec(args);
        }
        catch (err) {
            const elapsed = performance.now() - start;
            this.log.fail("run", extractCliError(err), elapsed);
            this.log.blank();
            throw err;
        }
        const runResult = parseRunResult(result.stdout, result.stderr);
        const elapsed = performance.now() - start;
        if (runResult.success) {
            this.log.done("run", "Success", elapsed);
            if (runResult.gasUsed != null)
                this.log.detail("gas", runResult.gasUsed.toLocaleString());
        }
        else {
            const parsed = parseVmStatus(runResult.vmStatus);
            this.log.vmError({
                vmStatus: parsed.status,
                rawVmStatus: runResult.vmStatus,
                abortCode: parsed.abortCode,
                location: parsed.location,
                message: parsed.message,
                category: parsed.category,
                reason: parsed.reason,
                functionId: options.functionId,
                gasUsed: runResult.gasUsed,
            }, elapsed);
        }
        this.log.blank();
        return runResult;
    }
    // ──────────────────────────────────────────────
    //  View Functions
    // ──────────────────────────────────────────────
    /**
     * Calls a view function against the simulation session.
     *
     * View functions are read-only — they do not modify state. Use them to
     * query data from your modules or from forked mainnet protocols.
     *
     * @typeParam T - Expected return type of the view function
     * @param options - Function ID, type args, and arguments
     * @returns Parsed return values from the view function
     * @throws {CliExecutionError} If the CLI command fails
     *
     * @example
     * ```ts
     * const result = await session.view<[string]>({
     *   functionId: '0x1::coin::balance',
     *   typeArgs: ['0x1::aptos_coin::AptosCoin'],
     *   args: [MoveArg.address(deployer.address)],
     * });
     * console.log('Balance:', result.returnValues[0]);
     * ```
     */
    async view(options) {
        this.assertAlive();
        this.log.step("view", (0, logger_1.shortFn)(options.functionId));
        const start = performance.now();
        const args = [
            "move",
            "view",
            "--session",
            this.sessionPath,
            "--function-id",
            options.functionId,
        ];
        if (options.typeArgs?.length) {
            args.push("--type-args", ...options.typeArgs);
        }
        if (options.args?.length) {
            args.push("--args", ...options.args);
        }
        let result;
        try {
            result = await this.exec(args);
        }
        catch (err) {
            const elapsed = performance.now() - start;
            this.log.fail("view", extractCliError(err), elapsed);
            this.log.blank();
            throw err;
        }
        const parsed = (0, parser_1.extractResult)(result.stdout);
        this.log.done("view", "Done", performance.now() - start);
        this.log.blank();
        return { returnValues: parsed, raw: result.stdout };
    }
    // ──────────────────────────────────────────────
    //  Script Execution
    // ──────────────────────────────────────────────
    /**
     * Runs a compiled Move script against the simulation session.
     *
     * Scripts are one-time executable Move programs that can call any
     * published module function. Useful for complex multi-step operations.
     *
     * @param options - Script path, arguments, sender, and private key
     * @returns Execution result
     * @throws {CliExecutionError} If the CLI command fails
     */
    async runScript(options) {
        this.assertAlive();
        this.log.step("script", `Running ${path.basename(options.scriptPath)}`);
        const start = performance.now();
        const args = [
            "move",
            "run-script",
            "--session",
            this.sessionPath,
            "--compiled-script-path",
            path.resolve(options.scriptPath),
            "--sender-account",
            options.senderAddress,
            "--private-key",
            options.privateKey,
            "--assume-yes",
        ];
        if (options.typeArgs?.length) {
            args.push("--type-args", ...options.typeArgs);
        }
        if (options.args?.length) {
            args.push("--args", ...options.args);
        }
        let result;
        try {
            result = await this.exec(args);
        }
        catch (err) {
            const elapsed = performance.now() - start;
            this.log.fail("script", extractCliError(err), elapsed);
            this.log.blank();
            throw err;
        }
        const runResult = parseRunResult(result.stdout, result.stderr);
        const elapsed = performance.now() - start;
        if (runResult.success) {
            this.log.done("script", "Success", elapsed);
            if (runResult.gasUsed != null)
                this.log.detail("gas", runResult.gasUsed.toLocaleString());
        }
        else {
            const parsed = parseVmStatus(runResult.vmStatus);
            this.log.vmError({
                vmStatus: parsed.status,
                rawVmStatus: runResult.vmStatus,
                abortCode: parsed.abortCode,
                location: parsed.location,
                message: parsed.message,
                category: parsed.category,
                reason: parsed.reason,
                gasUsed: runResult.gasUsed,
            }, elapsed);
        }
        this.log.blank();
        return runResult;
    }
    // ──────────────────────────────────────────────
    //  Funding
    // ──────────────────────────────────────────────
    /**
     * Funds an account with APT tokens in the simulation session.
     *
     * This creates APT out of thin air within the fork — it does not
     * affect any real network. Use this to give deployer or test accounts
     * enough gas to execute transactions.
     *
     * @param options - Account address and amount in octas (1 APT = 100_000_000 octas)
     * @returns Fund result
     * @throws {CliExecutionError} If the CLI command fails
     *
     * @example
     * ```ts
     * // Fund with 100 APT
     * await session.fund({
     *   account: deployer.address,
     *   amount: 100_000_000_00,
     * });
     * ```
     */
    async fund(options) {
        this.assertAlive();
        const octas = Number(options.amount);
        const apt = octas / 1_0000_0000;
        this.log.step("fund", `Funding ${(0, logger_1.shortAddr)(options.account)} with ${apt.toLocaleString()} APT`);
        const start = performance.now();
        const args = [
            "move",
            "sim",
            "fund",
            "--session",
            this.sessionPath,
            "--account",
            options.account,
            "--amount",
            String(options.amount),
        ];
        let result;
        try {
            result = await this.exec(args);
        }
        catch (err) {
            const elapsed = performance.now() - start;
            this.log.fail("fund", extractCliError(err), elapsed);
            this.log.blank();
            throw err;
        }
        this.log.done("fund", "Funded", performance.now() - start);
        this.log.blank();
        return { success: true, raw: result.stdout };
    }
    // ──────────────────────────────────────────────
    //  Resource Reading
    // ──────────────────────────────────────────────
    /**
     * Reads a resource from the simulation session state.
     *
     * This can read resources from your deployed modules AND from any
     * mainnet protocol that has been forked. The state is fetched lazily
     * from mainnet if it hasn't been accessed yet.
     *
     * @typeParam T - Expected shape of the resource data
     * @param options - Account address and resource type
     * @returns Parsed resource data
     * @throws {CliExecutionError} If the resource doesn't exist or the CLI fails
     *
     * @example
     * ```ts
     * // Read a real mainnet Liquidswap pool resource
     * const pool = await session.viewResource({
     *   account: '0x05a97986a9d015c4a8153d14ba66dba2b31749f5e7cde17611c8de4a0169bbf8',
     *   resource: '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::liquidity_pool::LiquidityPool<0x1::aptos_coin::AptosCoin, 0x...::asset::USDC, 0x...::curves::Uncorrelated>',
     * });
     * console.log('Pool reserves:', pool.data);
     * ```
     */
    async viewResource(options) {
        this.assertAlive();
        const resShort = options.resource.split("::").slice(-1)[0]?.split("<")[0] ?? options.resource;
        this.log.step("resource", `Reading ${resShort} from ${(0, logger_1.shortAddr)(options.account)}`);
        const start = performance.now();
        const args = [
            "move",
            "sim",
            "view-resource",
            "--session",
            this.sessionPath,
            "--account",
            options.account,
            "--resource",
            options.resource,
        ];
        let result;
        try {
            result = await this.exec(args);
        }
        catch (err) {
            const elapsed = performance.now() - start;
            this.log.fail("resource", extractCliError(err), elapsed);
            this.log.blank();
            throw err;
        }
        const parsed = (0, parser_1.extractResult)(result.stdout);
        this.log.done("resource", "Done", performance.now() - start);
        this.log.blank();
        return { data: parsed, raw: result.stdout };
    }
    // ──────────────────────────────────────────────
    //  Internals
    // ──────────────────────────────────────────────
    assertAlive() {
        if (this.destroyed) {
            throw new errors_1.SessionDestroyedError();
        }
    }
    async exec(args, opts) {
        return (0, executor_1.executeAptosCli)(this.aptosBin, args, {
            timeout: this.commandTimeout,
            cwd: opts?.cwd,
        });
    }
}
exports.SimulationSession = SimulationSession;
// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────
/**
 * Extracts a concise, human-readable error message from a CliExecutionError.
 * Looks for the most informative line in stderr or stdout.
 */
function extractCliError(err) {
    if (err instanceof errors_1.CliExecutionError) {
        // Try stdout for { "Error": "..." } format
        try {
            const parsed = JSON.parse(err.stdout.trim());
            if (parsed?.Error)
                return String(parsed.Error);
        }
        catch { }
        // Try stderr — look for the most informative line
        const lines = err.stderr
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
        // Prefer lines containing "error" (case-insensitive), skip JSON fragments
        const errorLine = lines.find((l) => /error/i.test(l) && !l.startsWith("{") && !l.startsWith("["));
        if (errorLine)
            return errorLine;
        // Fall back to first non-empty stderr line
        if (lines.length > 0)
            return lines[0];
        return `CLI exited with code ${err.exitCode}`;
    }
    if (err instanceof Error)
        return err.message;
    return String(err);
}
function resolveConfig(config) {
    const sessionPath = config.sessionPath ??
        path.join(os.tmpdir(), `move-harness-${crypto.randomBytes(8).toString("hex")}`);
    return {
        sessionPath: path.resolve(sessionPath),
        network: config.network ?? "mainnet",
        aptosBinaryPath: config.aptosBinaryPath ?? "aptos",
        commandTimeout: config.commandTimeout ?? 120_000,
        persist: config.persist ?? false,
        silent: config.silent ?? false,
        apiKey: config.apiKey ?? process.env.APTOS_API_KEY,
    };
}
function formatNamedAddresses(addrs) {
    return Object.entries(addrs)
        .map(([k, v]) => `${k}=${v}`)
        .join(",");
}
/**
 * Aptos canonical error categories from `std::error`.
 * Abort codes using canonical encoding: `(category << 16) | reason`.
 */
const ERROR_CATEGORIES = {
    0x1: "INVALID_ARGUMENT",
    0x2: "OUT_OF_RANGE",
    0x3: "INVALID_STATE",
    0x4: "UNAUTHENTICATED",
    0x5: "PERMISSION_DENIED",
    0x6: "NOT_FOUND",
    0x7: "ABORTED",
    0x8: "ALREADY_EXISTS",
    0x9: "RESOURCE_EXHAUSTED",
    0xA: "CANCELLED",
    0xB: "INTERNAL",
    0xC: "NOT_IMPLEMENTED",
    0xD: "UNAVAILABLE",
};
/**
 * Decodes a canonical Aptos abort code into category + reason.
 * Returns undefined if the code doesn't use canonical encoding.
 */
function decodeAbortCode(code) {
    const num = typeof code === "string" ? parseInt(code, code.startsWith("0x") ? 16 : 10) : code;
    if (isNaN(num) || num < 0)
        return undefined;
    const cat = (num >> 16) & 0xFF;
    const reason = num & 0xFFFF;
    const name = ERROR_CATEGORIES[cat];
    if (!name)
        return undefined;
    return { category: name, reason, hex: `0x${num.toString(16)}` };
}
/**
 * Parses a VM status string into structured components.
 *
 * The Aptos CLI `--session` mode formats VMStatus via its Display impl:
 *   "status ABORTED of type Execution with sub status <code>"
 *   "status ABORTED of type Execution with sub status <code> with message <msg>"
 *   "status FUNCTION_RESOLUTION_FAILURE of type Verification with message <msg>"
 *
 * The REST API / remote simulation uses a different format:
 *   "Move abort in 0x1::coin: EINSUFFICIENT_BALANCE(0x10006)"
 *   "Move abort in 0x1::module: 0x10006"
 *
 * And the KeptVMStatus Display (used in some contexts):
 *   "ABORTED with code <code> and message <msg> in <location>"
 *   "ABORTED with code <code> in <location>"
 *   "EXECUTION_FAILURE at bytecode offset <off> in function index <fn> in <loc>"
 */
function parseVmStatus(vmStatus) {
    if (!vmStatus)
        return { status: "unknown error" };
    // ── KeptVMStatus format (richer, includes location + message) ──
    // "ABORTED with code <code> and message <msg> in <location>"
    // "ABORTED with code <code> in <location>"
    const keptAbortMatch = vmStatus.match(/^status\s+ABORTED\s+with\s+code\s+(\d+)(?:\s+and\s+message\s+(.+?))?\s+in\s+(.+)$/i);
    if (keptAbortMatch) {
        const decoded = decodeAbortCode(keptAbortMatch[1]);
        return {
            status: "ABORTED",
            abortCode: keptAbortMatch[1],
            message: keptAbortMatch[2] || undefined,
            location: keptAbortMatch[3]?.trim() || undefined,
            category: decoded?.category,
            reason: decoded?.reason,
        };
    }
    // "EXECUTION_FAILURE at bytecode offset <off> in function index <fn> in <loc> with error message <msg>"
    const keptExecMatch = vmStatus.match(/EXECUTION_FAILURE\s+at\s+bytecode\s+offset\s+(\d+)\s+in\s+function\s+index\s+(\d+)\s+in\s+(.+?)(?:\s+with\s+error\s+message\s+(.+))?$/i);
    if (keptExecMatch) {
        return {
            status: "EXECUTION_FAILURE",
            location: keptExecMatch[3]?.trim() || undefined,
            message: keptExecMatch[4]?.trim() || undefined,
        };
    }
    // ── REST API format ──
    // "Move abort in 0x1::coin: EINSUFFICIENT_BALANCE(0x10006)"
    const abortMatch = vmStatus.match(/Move abort(?:\s+in\s+(0x[a-fA-F0-9]+::\w+(?:::\w+)?))?[:\s]+(.+)/i);
    if (abortMatch) {
        const rawCode = abortMatch[2]?.trim();
        const decoded = rawCode ? decodeAbortCode(rawCode) : undefined;
        return {
            status: "Move abort",
            location: abortMatch[1] || undefined,
            abortCode: rawCode || undefined,
            category: decoded?.category,
            reason: decoded?.reason,
        };
    }
    // ── VMStatus Display format (session mode) ──
    // "status ABORTED of type Execution with sub status <code>"
    // "status ABORTED of type Execution with sub status <code> with message <msg>"
    const sessionAbortMatch = vmStatus.match(/status\s+ABORTED\s+of\s+type\s+\w+\s+with\s+sub\s+status\s+(\d+)(?:\s+with\s+message\s+(.+))?$/i);
    if (sessionAbortMatch) {
        const decoded = decodeAbortCode(sessionAbortMatch[1]);
        return {
            status: "ABORTED",
            abortCode: sessionAbortMatch[1],
            message: sessionAbortMatch[2]?.trim() || undefined,
            category: decoded?.category,
            reason: decoded?.reason,
        };
    }
    // "status <CODE> of type <type> with message <msg>"  (e.g. FUNCTION_RESOLUTION_FAILURE)
    const sessionErrorMatch = vmStatus.match(/status\s+(\w+)\s+of\s+type\s+\w+(?:\s+with\s+message\s+(.+))?$/i);
    if (sessionErrorMatch) {
        return {
            status: sessionErrorMatch[1],
            message: sessionErrorMatch[2]?.trim() || undefined,
        };
    }
    // ── Fallback: "Execution failed with status: <status>" ──
    const execMatch = vmStatus.match(/failed.*?:\s*(.+)/i);
    if (execMatch) {
        return { status: execMatch[1].trim() };
    }
    return { status: vmStatus };
}
function parseRunResult(stdout, stderr) {
    try {
        const parsed = (0, parser_1.parseJsonOutput)(stdout);
        const txResult = parsed?.Result;
        return {
            success: txResult?.success ?? false,
            vmStatus: txResult?.vm_status,
            gasUsed: txResult?.gas_used != null ? Number(txResult.gas_used) : undefined,
            events: txResult?.events,
            changes: txResult?.changes,
            raw: stdout,
            stderr: stderr || undefined,
        };
    }
    catch {
        return {
            success: false,
            vmStatus: undefined,
            gasUsed: undefined,
            events: undefined,
            changes: undefined,
            raw: stdout,
            stderr: stderr || undefined,
        };
    }
}
//# sourceMappingURL=session.js.map
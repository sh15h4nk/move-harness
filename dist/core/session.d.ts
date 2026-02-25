import { SessionConfig, CompileOptions, PublishOptions, RunOptions, ViewOptions, RunScriptOptions, FundOptions, ViewResourceOptions, Network } from "../types/config";
import { CompileResult, PublishResult, RunResult, ViewResult, FundResult, ViewResourceResult } from "../types/results";
/** Account info returned by `generateAccount()`. */
export interface GeneratedAccount {
    /** Hex-encoded account address (0x-prefixed, full 64-char). */
    address: string;
    /** Hex-encoded private key. */
    privateKey: string;
    /** Hex-encoded public key. */
    publicKey: string;
}
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
export declare class SimulationSession {
    /** Absolute path to the session directory on disk. */
    readonly sessionPath: string;
    /** Network this session was forked from. */
    readonly network: Network;
    private readonly aptosBin;
    private readonly commandTimeout;
    private readonly persist;
    private readonly apiKey?;
    private readonly log;
    private destroyed;
    private readonly buildDirs;
    private constructor();
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
    static create(config?: SessionConfig): Promise<SimulationSession>;
    private init;
    /**
     * Removes the build directory for a given package and untracks it.
     */
    private cleanBuildDir;
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
    destroy(): Promise<void>;
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
    generateAccount(): GeneratedAccount;
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
    compile(options: CompileOptions): Promise<CompileResult>;
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
    publish(options: PublishOptions): Promise<PublishResult>;
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
    compileAndPublish(options: CompileOptions & PublishOptions): Promise<PublishResult>;
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
    run(options: RunOptions): Promise<RunResult>;
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
    view<T = unknown>(options: ViewOptions): Promise<ViewResult<T>>;
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
    runScript(options: RunScriptOptions): Promise<RunResult>;
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
    fund(options: FundOptions): Promise<FundResult>;
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
    viewResource<T = unknown>(options: ViewResourceOptions): Promise<ViewResourceResult<T>>;
    private assertAlive;
    private exec;
}
//# sourceMappingURL=session.d.ts.map
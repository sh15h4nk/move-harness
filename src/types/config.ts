/** Supported Aptos networks for forking. */
export type Network = "mainnet" | "testnet" | "devnet";

/**
 * Configuration for creating a new simulation session.
 *
 * @example
 * ```ts
 * const session = await SimulationSession.create({
 *   network: 'mainnet',
 *   apiKey: process.env.APTOS_API_KEY,
 * });
 * ```
 */
export interface SessionConfig {
  /** Network to fork from. Defaults to `'mainnet'`. */
  network?: Network;
  /**
   * API key for the Aptos RPC node to avoid rate limiting.
   * Falls back to the `APTOS_API_KEY` environment variable.
   * Get one at https://build.aptoslabs.com/
   */
  apiKey?: string;
  /** Custom directory path for the session. If omitted, a temp directory is created. */
  sessionPath?: string;
  /** If true, do not delete session directory on `destroy()`. Default: `false`. */
  persist?: boolean;
  /** Path to the `aptos` CLI binary. Default: `'aptos'` (found in PATH). */
  aptosBinaryPath?: string;
  /** Timeout in milliseconds for CLI commands. Default: `120_000` (2 minutes). */
  commandTimeout?: number;
  /** If true, suppress lifecycle log output. Default: `false`. */
  silent?: boolean;
}

/**
 * Options for compiling a Move package.
 *
 * @example
 * ```ts
 * await session.compile({
 *   packageDir: './move/my_module',
 *   namedAddresses: { my_module: '0xCAFE' },
 * });
 * ```
 */
export interface CompileOptions {
  /** Path to the Move package directory (must contain `Move.toml`). */
  packageDir: string;
  /** Named address mappings, e.g. `{ myaddr: "0x1234..." }`. */
  namedAddresses?: Record<string, string>;
  /** If true, save metadata alongside bytecode (required for publishing). Default: `true`. */
  saveMetadata?: boolean;
  /** Custom output directory. Default: `<packageDir>/build`. */
  outputDir?: string;
  /** Skip fetching latest git dependencies. */
  skipFetchLatestGitDeps?: boolean;
  /** Enable dev mode compilation. */
  dev?: boolean;
}

/**
 * Options for publishing a Move package to the simulation session.
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
export interface PublishOptions {
  /** Path to the Move package directory. */
  packageDir: string;
  /** Named address mappings. */
  namedAddresses?: Record<string, string>;
  /** Sender account address (hex). The address that will own the published modules. */
  senderAddress: string;
  /** Private key (hex-encoded) for signing the publish transaction. */
  privateKey: string;
  /** Included artifacts level. Default: `'none'` (smallest footprint). */
  includedArtifacts?: "none" | "sparse" | "all";
  /** Override the package size check. */
  overrideSizeCheck?: boolean;
}

/**
 * Options for running an entry function against the simulation session.
 *
 * @example
 * ```ts
 * await session.run({
 *   functionId: `${addr}::pool::initialize`,
 *   typeArgs: ['0x1::aptos_coin::AptosCoin'],
 *   args: [MoveArg.u64(1_000_000)],
 *   senderAddress: deployer.address,
 *   privateKey: deployer.privateKey,
 * });
 * ```
 */
export interface RunOptions {
  /** Fully qualified function ID: `<address>::<module>::<function>`. */
  functionId: string;
  /** Type arguments (Move type tags) as strings. */
  typeArgs?: string[];
  /** Arguments as typed strings, e.g. `["address:0x1", "u64:1000"]`. Use `MoveArg` helpers. */
  args?: string[];
  /** Sender account address (hex). */
  senderAddress: string;
  /** Private key (hex-encoded) for signing. */
  privateKey: string;
  /** Max gas units for the transaction. */
  maxGas?: number;
}

/**
 * Options for calling a view function against the simulation session.
 * View functions are read-only and do not modify state.
 *
 * @example
 * ```ts
 * const result = await session.view({
 *   functionId: '0x1::coin::balance',
 *   typeArgs: ['0x1::aptos_coin::AptosCoin'],
 *   args: [MoveArg.address('0xCAFE')],
 * });
 * ```
 */
export interface ViewOptions {
  /** Fully qualified function ID: `<address>::<module>::<function>`. */
  functionId: string;
  /** Type arguments as strings. */
  typeArgs?: string[];
  /** Arguments as typed strings. Use `MoveArg` helpers. */
  args?: string[];
}

/**
 * Options for running a Move script against the simulation session.
 */
export interface RunScriptOptions {
  /** Path to the compiled script bytecode or the script source package. */
  scriptPath: string;
  /** Type arguments as strings. */
  typeArgs?: string[];
  /** Arguments as typed strings. */
  args?: string[];
  /** Sender account address (hex). */
  senderAddress: string;
  /** Private key (hex-encoded) for signing. */
  privateKey: string;
}

/**
 * Options for funding an account within the simulation session.
 *
 * @example
 * ```ts
 * await session.fund({
 *   account: deployer.address,
 *   amount: 100_000_000_00, // 100 APT in octas
 * });
 * ```
 */
export interface FundOptions {
  /** Account address to fund (hex). */
  account: string;
  /** Amount in octas (1 APT = 100_000_000 octas). */
  amount: string | number;
}

/**
 * Options for reading a resource from the simulation session state.
 *
 * @example
 * ```ts
 * const res = await session.viewResource({
 *   account: '0x1',
 *   resource: '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>',
 * });
 * ```
 */
export interface ViewResourceOptions {
  /** Account address that holds the resource (hex). */
  account: string;
  /** Fully qualified resource type, e.g. `"0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"`. */
  resource: string;
}

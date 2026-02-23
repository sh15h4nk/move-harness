import { beforeAll, afterAll } from "vitest";
import { SimulationSession, GeneratedAccount } from "../src";

/**
 * Test environment — a forked session with a funded deployer account
 * and optionally a compiled+published module, ready to use.
 *
 * Usage:
 * ```ts
 * // Minimal — fork + fund only
 * const env = useEnv();
 *
 * // Full — fork + fund + compile + publish your module
 * const env = useEnv({
 *   module: {
 *     packageDir: "./move/my_module",
 *     namedAddresses: (deployer) => ({ my_module: deployer }),
 *   },
 * });
 *
 * it('calls your module', async () => {
 *   const result = await env.session.run({
 *     functionId: `${env.deployer.address}::my_module::do_thing`,
 *     senderAddress: env.deployer.address,
 *     privateKey: env.deployer.privateKey,
 *   });
 *   expect(result.success).toBe(true);
 * });
 * ```
 */
export interface TestEnv {
  /** Active simulation session forking the target network. */
  session: SimulationSession;
  /** Pre-funded deployer account. */
  deployer: GeneratedAccount;
}

/** Module config for automatic compile + publish in useEnv(). */
export interface ModuleConfig {
  /** Path to the Move package directory (must contain `Move.toml`). */
  packageDir: string;
  /**
   * Named address mappings.
   * Pass a function to receive the deployer address at runtime:
   * ```ts
   * namedAddresses: (deployer) => ({ my_module: deployer })
   * ```
   * Or pass a static object if addresses are known ahead of time.
   */
  namedAddresses?:
    | Record<string, string>
    | ((deployerAddress: string) => Record<string, string>);
}

export interface UseEnvOptions {
  /** Network to fork. Default: `'mainnet'` */
  network?: "mainnet" | "testnet" | "devnet";
  /** Octas to fund deployer. Default: 1000 APT (1_000_000_000_00) */
  fundAmount?: number;
  /** If true, suppress lifecycle logs. Default: false */
  silent?: boolean;
  /**
   * Module to compile and publish during setup.
   * When provided, `beforeAll` will also run `compileAndPublish()`.
   */
  module?: ModuleConfig;
}

/**
 * Creates a complete test environment scoped to the current describe block.
 *
 * `beforeAll` handles the full lifecycle:
 * 1. Fork the network
 * 2. Generate and fund the deployer account
 * 3. Compile and publish your module (if `module` is provided)
 *
 * `afterAll` cleans up everything:
 * - Removes build artifacts
 * - Removes session directory
 *
 * @param opts - Configuration options
 */
export function useEnv(opts: UseEnvOptions = {}): TestEnv {
  const {
    network = "mainnet",
    fundAmount = 1_000_000_000_00,
    silent = false,
    module: moduleCfg,
  } = opts;

  const env: TestEnv = {} as TestEnv;

  beforeAll(async () => {
    // 1. Fork
    const session = await SimulationSession.create({
      network,
      apiKey: process.env.APTOS_API_KEY,
      silent,
    });

    // 2. Fund deployer
    const deployer = session.generateAccount();
    await session.fund({ account: deployer.address, amount: fundAmount });

    // 3. Compile + publish (if configured)
    if (moduleCfg) {
      const namedAddresses =
        typeof moduleCfg.namedAddresses === "function"
          ? moduleCfg.namedAddresses(deployer.address)
          : moduleCfg.namedAddresses;

      await session.compileAndPublish({
        packageDir: moduleCfg.packageDir,
        namedAddresses,
        senderAddress: deployer.address,
        privateKey: deployer.privateKey,
      });
    }

    env.session = session;
    env.deployer = deployer;
  });

  afterAll(async () => {
    await env.session?.destroy();
  });

  return env;
}

/**
 * Creates an additional funded account within the given session.
 * Useful for multi-actor tests (attacker, user, admin, etc.)
 */
export async function fundedAccount(
  session: SimulationSession,
  amount: number = 100_000_000_00,
): Promise<GeneratedAccount> {
  const account = session.generateAccount();
  await session.fund({ account: account.address, amount });
  return account;
}

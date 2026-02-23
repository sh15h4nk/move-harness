import { describe, it, expect } from "vitest";
import { MoveArg } from "../src";
import { useEnv, fundedAccount } from "./env";

/**
 * Example: testing a Move module deployed to a mainnet fork.
 *
 * Replace the packageDir and function IDs with your actual module.
 * This shows the pattern — your tests will look just like this.
 */
describe("Module publish and test", () => {
  // Full setup — fork + fund + compile + publish in one call:
  //
  // const env = useEnv({
  //   module: {
  //     packageDir: "./move/my_module",
  //     namedAddresses: (deployer) => ({ my_module: deployer }),
  //   },
  // });
  //
  // Now env.session has your module deployed and ready to call.

  // For this example we just fork without a module:
  const env = useEnv({ network: "devnet" });

  it("should generate isolated accounts for multi-actor tests", async () => {
    const alice = await fundedAccount(env.session, 100_000_000_00);
    const bob = await fundedAccount(env.session, 100_000_000_00);

    expect(alice.address).not.toBe(bob.address);
    expect(alice.address).not.toBe(env.deployer.address);
  });

  it("should read aptos framework state", async () => {
    const coinInfo = await env.session.viewResource({
      account: "0x1",
      resource: "0x1::coin::CoinInfo<0x1::aptos_coin::AptosCoin>",
    });

    expect(coinInfo.data).toBeDefined();
  });

  // Example with module deployed via useEnv({ module: ... }):
  //
  // it('should initialize the pool', async () => {
  //   const result = await env.session.run({
  //     functionId: `${env.deployer.address}::pool::initialize`,
  //     typeArgs: ['0x1::aptos_coin::AptosCoin'],
  //     args: [MoveArg.u64(1_000_000)],
  //     senderAddress: env.deployer.address,
  //     privateKey: env.deployer.privateKey,
  //   });
  //   expect(result.success).toBe(true);
  // });
});

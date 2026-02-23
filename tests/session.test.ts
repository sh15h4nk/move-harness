import { describe, it, expect } from "vitest";
import { MoveArg } from "../src";
import { useEnv, fundedAccount } from "./env";

describe("SimulationSession", () => {
  const env = useEnv({ network: "devnet" });

  it("should have a funded deployer account", async () => {
    const result = await env.session.view({
      functionId: "0x1::coin::balance",
      typeArgs: ["0x1::aptos_coin::AptosCoin"],
      args: [MoveArg.address(env.deployer.address)],
    });

    expect(result.returnValues).toBeDefined();
  });

  it("should fund additional accounts", async () => {
    const user = await fundedAccount(env.session, 50_000_000_00);

    const result = await env.session.view({
      functionId: "0x1::coin::balance",
      typeArgs: ["0x1::aptos_coin::AptosCoin"],
      args: [MoveArg.address(user.address)],
    });

    expect(result.returnValues).toBeDefined();
  });

  it("should read framework resources from forked state", async () => {
    const result = await env.session.viewResource({
      account: "0x1",
      resource: "0x1::coin::CoinInfo<0x1::aptos_coin::AptosCoin>",
    });

    expect(result.data).toBeDefined();
  });
});

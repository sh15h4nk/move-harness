# move-harness

Fork Aptos mainnet. Deploy Move modules. Test against live protocols.

## Why

You're writing a Move module that interacts with a live DEX, lending pool, or oracle on Aptos. You want to test it against **real mainnet state** — real liquidity, real prices, real contracts — without spending gas or risking funds.

`move-harness` gives you a local fork of any Aptos network, lets you deploy your modules into it, and run transactions as if you were on mainnet. Think Foundry's `anvil --fork-url`, but for Move.

| Foundry (EVM) | move-harness (Aptos) |
|---|---|
| `anvil --fork-url` | `SimulationSession.create({ network: "mainnet" })` |
| `forge test` against forked state | `session.run()` against forked state |
| Deploy contracts to local fork | `session.compileAndPublish()` to local fork |
| `cast call` | `session.view()` |
| `deal` cheatcode | `session.fund()` |

> Built as a personal dev tool to speed up testing Move modules against mainnet data. Not battle-tested for production use.

## Setup

```bash
git clone https://github.com/sh15h4nk/move-harness.git
cd move-harness
pnpm install
pnpm build
```

Needs **Node.js >= 18** and **Aptos CLI >= 7.14** (`brew install aptos`).

## Usage

```ts
import { SimulationSession, MoveArg } from "move-harness";

// Fork mainnet
const session = await SimulationSession.create({ network: "mainnet" });

// Generate and fund a throwaway account
const deployer = session.generateAccount();
await session.fund({ account: deployer.address, amount: 100_000_000_00 });

// Deploy your Move module
await session.compileAndPublish({
  packageDir: "./move/my_module",
  namedAddresses: { my_module: deployer.address },
  senderAddress: deployer.address,
  privateKey: deployer.privateKey,
});

// Execute against forked state
const result = await session.run({
  functionId: `${deployer.address}::my_module::do_something`,
  args: [MoveArg.u64(42)],
  senderAddress: deployer.address,
  privateKey: deployer.privateKey,
});

console.log(result.success);  // true
console.log(result.gasUsed);  // 567
console.log(result.events);   // emitted events

// Cleanup
await session.destroy();
```

## What you can do with it

- **MEV research** — test extraction strategies against live liquidity pools
- **Module testing** — compile and run Move modules against real protocol state
- **Protocol integration** — interact with mainnet DEXes, lending pools, oracles from your modules
- **CI pipelines** — deterministic, reproducible test runs

## API

| Method | What it does |
|---|---|
| `SimulationSession.create(config)` | Fork a network into a local session |
| `session.generateAccount()` | Random Ed25519 keypair |
| `session.fund(options)` | Give an account APT |
| `session.compile(options)` | Compile a Move package |
| `session.publish(options)` | Publish compiled modules to the session |
| `session.compileAndPublish(options)` | Compile + publish in one step |
| `session.run(options)` | Execute an entry function |
| `session.view(options)` | Call a read-only view function |
| `session.viewResource(options)` | Read a resource from forked state |
| `session.destroy()` | Tear down the session |

## Config

```ts
SimulationSession.create({
  network: "mainnet",              // "mainnet" | "testnet" | "devnet"
  apiKey: "...",                    // or set APTOS_API_KEY env var
  sessionPath: "/tmp/my-session",  // custom dir (default: auto temp dir)
  persist: true,                   // keep session dir after destroy()
  commandTimeout: 180_000,         // CLI timeout in ms (default: 120s)
  silent: true,                    // suppress log output
});
```

Grab a free API key at [build.aptoslabs.com](https://build.aptoslabs.com/) to avoid mainnet rate limits.

## MoveArg helpers

```ts
MoveArg.address("0x1")           MoveArg.u64(1_000_000)
MoveArg.bool(true)               MoveArg.u128(BigInt("999"))
MoveArg.u8(255)                  MoveArg.u256(BigInt("999"))
MoveArg.string("hello")          MoveArg.hex("deadbeef")
```

## Errors

All errors extend `HarnessError`:

```
HarnessError
├── CliExecutionError      — CLI exited non-zero
├── CliParseError          — couldn't parse CLI output
├── CompilationError       — Move compiler failed
├── SimulationAbortError   — VM abort (has abortCode + location)
└── SessionDestroyedError  — you called something after destroy()
```

## Project structure

```
src/
├── index.ts              # Public exports
├── core/session.ts       # SimulationSession — the main thing
├── cli/executor.ts       # child_process wrapper for aptos CLI
├── cli/parser.ts         # JSON parser for CLI output
├── types/                # Config, result, and error types
└── utils/                # MoveArg helpers, logger
```

## Dev

```bash
pnpm build          # compile
pnpm dev            # watch mode
pnpm test           # run tests (vitest)
pnpm lint           # type check
```

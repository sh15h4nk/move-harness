/**
 * A balance change extracted from a CoinStore write in the transaction's state changes.
 */
export interface BalanceChange {
  /** Account address whose balance changed. */
  address: string;
  /** Fully qualified coin type, e.g. `"0x1::aptos_coin::AptosCoin"`. */
  coinType: string;
  /** Final balance after the transaction (in smallest unit). */
  amount: string;
}

/**
 * A state change produced by the transaction.
 */
export interface ResourceChange {
  /** Type of state change. */
  type: "write_resource" | "delete_resource" | "write_module" | "write_table_item" | "delete_table_item";
  /** Account address affected (for resource changes). */
  address?: string;
  /** Fully qualified resource type, e.g. `"0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"`. */
  resourceType?: string;
  /** Table handle (for table item changes). */
  handle?: string;
  /** Table key (for table item changes). */
  key?: string;
}

/**
 * An event emitted during transaction execution.
 */
export interface EmittedEvent {
  /** Fully qualified event type, e.g. `"0x1::coin::WithdrawEvent"`. */
  type: string;
  /** Event payload data. */
  data: unknown;
  /** Event sequence number. */
  sequenceNumber?: string;
  /** Account address that emitted the event. */
  address?: string;
}

/**
 * Result from compiling a Move package.
 */
export interface CompileResult {
  /** Module IDs that were compiled (e.g. `["0xCAFE::my_module"]`). */
  moduleIds: string[];
  /** Path to the build output directory. */
  buildDir: string;
  /** Raw CLI stdout for debugging. */
  raw: string;
}

/**
 * Result from publishing a Move package to the simulation session.
 */
export interface PublishResult {
  /** Whether the publish transaction succeeded. */
  success: boolean;
  /** Transaction hash (local simulation hash). */
  transactionHash?: string;
  /** Gas units consumed. */
  gasUsed?: number;
  /** Raw CLI stdout for debugging. */
  raw: string;
}

/**
 * Result from running an entry function or script in the simulation session.
 */
export interface RunResult {
  /** Whether the transaction succeeded. */
  success: boolean;
  /** VM status string (e.g. `"Executed successfully"` or `"Move abort..."`). */
  vmStatus?: string;
  /** Gas units consumed. */
  gasUsed?: number;
  /** Events emitted during execution. */
  events?: unknown[];
  /** State changes produced by the transaction. */
  changes?: unknown[];
  /** Parsed balance changes (extracted from CoinStore writes in `changes`). */
  balanceChanges?: BalanceChange[];
  /** Parsed resource/table changes (extracted from `changes`). */
  resourceChanges?: ResourceChange[];
  /** Parsed events (extracted from `events`). */
  parsedEvents?: EmittedEvent[];
  /** Inferred module trace — ordered list of `address::module` pairs touched during execution (from events + changes). */
  moduleTrace?: string[];
  /** Raw CLI stdout for debugging. */
  raw: string;
  /** Raw CLI stderr — may contain additional diagnostics. */
  stderr?: string;
}

/**
 * Result from calling a view function.
 * @typeParam T - The expected return type of the view function.
 */
export interface ViewResult<T = unknown> {
  /** Parsed return values from the view function. */
  returnValues: T;
  /** Raw CLI stdout for debugging. */
  raw: string;
}

/**
 * Result from funding an account in the simulation session.
 */
export interface FundResult {
  /** Whether the funding succeeded. */
  success: boolean;
  /** Raw CLI stdout for debugging. */
  raw: string;
}

/**
 * Result from reading a resource from the simulation session state.
 * @typeParam T - The expected shape of the resource data.
 */
export interface ViewResourceResult<T = unknown> {
  /** Parsed resource data. */
  data: T;
  /** Raw CLI stdout for debugging. */
  raw: string;
}

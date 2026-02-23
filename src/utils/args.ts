/**
 * Helper functions for building typed CLI arguments for Aptos Move functions.
 *
 * The Aptos CLI expects arguments in the format `"type:value"`.
 * These helpers prevent typos and provide type safety.
 *
 * @example
 * ```ts
 * import { MoveArg } from 'move-harness';
 *
 * await session.run({
 *   functionId: `${addr}::pool::swap`,
 *   args: [
 *     MoveArg.address('0x1'),
 *     MoveArg.u64(1_000_000),
 *     MoveArg.bool(true),
 *   ],
 *   ...
 * });
 * ```
 */
export const MoveArg = {
  /** Encode an address argument. */
  address: (v: string): string => `address:${v}`,

  /** Encode a boolean argument. */
  bool: (v: boolean): string => `bool:${v}`,

  /** Encode a u8 argument. */
  u8: (v: number): string => `u8:${v}`,

  /** Encode a u16 argument. */
  u16: (v: number): string => `u16:${v}`,

  /** Encode a u32 argument. */
  u32: (v: number): string => `u32:${v}`,

  /** Encode a u64 argument. Accepts number, bigint, or string. */
  u64: (v: number | bigint | string): string => `u64:${v}`,

  /** Encode a u128 argument. Accepts number, bigint, or string. */
  u128: (v: number | bigint | string): string => `u128:${v}`,

  /** Encode a u256 argument. Accepts number, bigint, or string. */
  u256: (v: number | bigint | string): string => `u256:${v}`,

  /** Encode a string argument. */
  string: (v: string): string => `string:${v}`,

  /** Encode a hex bytes argument. */
  hex: (v: string): string => `hex:${v}`,

  /**
   * Pass a raw argument string directly.
   * Use for vector arguments or complex types that don't have a dedicated helper.
   */
  raw: (v: string): string => v,
} as const;

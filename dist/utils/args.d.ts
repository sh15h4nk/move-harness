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
export declare const MoveArg: {
    /** Encode an address argument. */
    readonly address: (v: string) => string;
    /** Encode a boolean argument. */
    readonly bool: (v: boolean) => string;
    /** Encode a u8 argument. */
    readonly u8: (v: number) => string;
    /** Encode a u16 argument. */
    readonly u16: (v: number) => string;
    /** Encode a u32 argument. */
    readonly u32: (v: number) => string;
    /** Encode a u64 argument. Accepts number, bigint, or string. */
    readonly u64: (v: number | bigint | string) => string;
    /** Encode a u128 argument. Accepts number, bigint, or string. */
    readonly u128: (v: number | bigint | string) => string;
    /** Encode a u256 argument. Accepts number, bigint, or string. */
    readonly u256: (v: number | bigint | string) => string;
    /** Encode a string argument. */
    readonly string: (v: string) => string;
    /** Encode a hex bytes argument. */
    readonly hex: (v: string) => string;
    /**
     * Pass a raw argument string directly.
     * Use for vector arguments or complex types that don't have a dedicated helper.
     */
    readonly raw: (v: string) => string;
};
//# sourceMappingURL=args.d.ts.map
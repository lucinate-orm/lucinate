/**
 * Converts the byte array to a UUID string
 * @param bytes Used to convert Byte to Hex
 */
export declare function bytesToUuid(bytes: number[] | Uint8Array): string;
/**
 * Determines whether a string is a valid
 * {@link https://www.rfc-editor.org/rfc/rfc9562.html#section-5.7 | UUIDv7}.
 *
 * @param id UUID value.
 *
 * @returns `true` if the string is a valid UUIDv7, otherwise `false`.
 *
 * @example Usage
 * ```ts
 * import { validate } from "@std/uuid/v7";
 * import { assert, assertFalse } from "@std/assert";
 *
 * assert(validate("017f22e2-79b0-7cc3-98c4-dc0c0c07398f"));
 * assertFalse(validate("fac8c1e0-ad1a-4204-a0d0-8126ae84495d"));
 * ```
 */
export declare function validate(id: string): boolean;
/**
 * Generates a {@link https://www.rfc-editor.org/rfc/rfc9562.html#section-5.7 | UUIDv7}.
 *
 * @throws {RangeError} If the timestamp is not a non-negative integer.
 *
 * @param timestamp Unix Epoch timestamp in milliseconds.
 *
 * @returns Returns a UUIDv7 string
 *
 * @example Usage
 * ```ts
 * import { generate, validate } from "@std/uuid/v7";
 * import { assert } from "@std/assert";
 *
 * const uuid = generate();
 * assert(validate(uuid));
 * ```
 */
export declare function generate(timestamp?: number): string;
/**
 * Extracts the timestamp from a UUIDv7.
 *
 * @param uuid UUIDv7 string to extract the timestamp from.
 * @returns Returns the timestamp in milliseconds.
 *
 * @throws {TypeError} If the UUID is not a valid UUIDv7.
 *
 * @example Usage
 * ```ts
 * import { extractTimestamp } from "@std/uuid/v7";
 * import { assertEquals } from "@std/assert";
 *
 * const uuid = "017f22e2-79b0-7cc3-98c4-dc0c0c07398f";
 * const timestamp = extractTimestamp(uuid);
 * assertEquals(timestamp, 1645557742000);
 * ```
 */
export declare function extractTimestamp(uuid: string): number;
export declare function generateUuid(timestamp?: number): string;
//# sourceMappingURL=uuid.d.ts.map
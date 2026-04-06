// Copyright 2026-2026 the Lucinate authors. MIT license.
// This code is derived from the Deno project.
// https://github.com/denoland/deno/blob/main/std/uuid/mod.ts
// Forces V7 UUIDs generation.
// Copyright 2018-2026 the Deno authors. MIT license.
// This module is browser compatible.
const hexTable = [];
for (let i = 0; i < 256; ++i) {
    hexTable.push(i < 0x10 ? "0" + i.toString(16) : i.toString(16));
}
/**
 * Converts the byte array to a UUID string
 * @param bytes Used to convert Byte to Hex
 */
export function bytesToUuid(bytes) {
    return ((hexTable[bytes[0]] +
        hexTable[bytes[1]] +
        hexTable[bytes[2]] +
        hexTable[bytes[3]] +
        "-" +
        hexTable[bytes[4]] +
        hexTable[bytes[5]] +
        "-" +
        hexTable[bytes[6]] +
        hexTable[bytes[7]] +
        "-" +
        hexTable[bytes[8]] +
        hexTable[bytes[9]] +
        "-" +
        hexTable[bytes[10]] +
        hexTable[bytes[11]] +
        hexTable[bytes[12]] +
        hexTable[bytes[13]] +
        hexTable[bytes[14]] +
        hexTable[bytes[15]])
        // Use .toLowerCase() to avoid the v8 engine memory issue
        // when concatenating strings with "+" operator. See:
        // - https://issues.chromium.org/issues/42206473
        // - https://github.com/uuidjs/uuid/pull/434
        .toLowerCase());
}
const UUID_REGEXP = /^[0-9a-f]{8}-[0-9a-f]{4}-[7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
export function validate(id) {
    return UUID_REGEXP.test(id);
}
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
export function generate(timestamp = Date.now()) {
    const bytes = new Uint8Array(16);
    const view = new DataView(bytes.buffer);
    // Unix timestamp in milliseconds (truncated to 48 bits)
    if (!Number.isInteger(timestamp) || timestamp < 0) {
        throw new RangeError(`Cannot generate UUID as timestamp must be a non-negative integer: timestamp ${timestamp}`);
    }
    view.setBigUint64(0, BigInt(timestamp) << 16n);
    crypto.getRandomValues(bytes.subarray(6));
    // Version (4 bits) Occupies bits 48 through 51 of octet 6.
    view.setUint8(6, (view.getUint8(6) & 0b00001111) | 0b01110000);
    // Variant (2 bits) Occupies bits 64 through 65 of octet 8.
    view.setUint8(8, (view.getUint8(8) & 0b00111111) | 0b10000000);
    return bytesToUuid(bytes);
}
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
export function extractTimestamp(uuid) {
    if (!validate(uuid)) {
        throw new TypeError(`Cannot extract timestamp because the UUID is not a valid UUIDv7: uuid is "${uuid}"`);
    }
    const timestampHex = uuid.slice(0, 8) + uuid.slice(9, 13);
    return parseInt(timestampHex, 16);
}
export function generateUuid(timestamp = Date.now()) {
    return generate(timestamp);
}
//# sourceMappingURL=uuid.js.map
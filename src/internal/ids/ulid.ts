// Copyright 2026-2026 the Lucinate authors. MIT license.
// This code is derived from the Deno project.
// https://github.com/denoland/deno/blob/main/std/ulid/mod.ts
// Forces monotonic ULIDs generation.

// Copyright 2018-2026 the Deno authors. MIT license.

/** Type for a ULID generator function. */
// deno-lint-ignore deno-style-guide/naming-convention
export type ULID = (seedTime?: number) => string;

// These values should NEVER change. If
// they do, we're no longer making ulids!
export const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford's Base32
export const ENCODING_LEN = ENCODING.length;
export const TIME_MAX = Math.pow(2, 48) - 1;
export const TIME_LEN = 10;
export const RANDOM_LEN = 16;
export const ULID_LEN = TIME_LEN + RANDOM_LEN;

function replaceCharAt(str: string, index: number, char: string) {
    return str.substring(0, index) + char + str.substring(index + 1);
}

export function encodeTime(timestamp: number): string {
    if (!Number.isInteger(timestamp) || timestamp < 0 || timestamp > TIME_MAX) {
        throw new RangeError(
            `Time must be a positive integer less than ${TIME_MAX}`,
        );
    }
    let str = "";
    for (let len = TIME_LEN; len > 0; len--) {
        const mod = timestamp % ENCODING_LEN;
        str = ENCODING[mod] + str;
        timestamp = Math.floor(timestamp / ENCODING_LEN);
    }
    return str;
}

export function encodeRandom(): string {
    let str = "";
    const bytes = crypto.getRandomValues(new Uint8Array(RANDOM_LEN));
    for (const byte of bytes) {
        str += ENCODING[byte % ENCODING_LEN];
    }
    return str;
}

export function incrementBase32(str: string): string {
    let index = str.length;
    let char;
    let charIndex;
    const maxCharIndex = ENCODING_LEN - 1;
    while (--index >= 0) {
        char = str[index]!;
        charIndex = ENCODING.indexOf(char);
        if (charIndex === -1) {
            throw new TypeError("Incorrectly encoded string");
        }
        if (charIndex === maxCharIndex) {
            str = replaceCharAt(str, index, ENCODING[0]!);
            continue;
        }
        return replaceCharAt(str, index, ENCODING[charIndex + 1]!);
    }
    throw new Error("Cannot increment this string");
}

/** Generates a monotonically increasing ULID. */
export function monotonicFactory(encodeRand = encodeRandom): ULID {
    let lastTime = 0;
    let lastRandom: string;
    return function ulid(seedTime: number = Date.now()): string {
        if (seedTime <= lastTime) {
            const incrementedRandom = (lastRandom =
                incrementBase32(lastRandom));
            return encodeTime(lastTime) + incrementedRandom;
        }
        lastTime = seedTime;
        const newRandom = (lastRandom = encodeRand());
        return encodeTime(seedTime) + newRandom;
    };
}

/**
 * Extracts the number of milliseconds since the Unix epoch that had passed when
 * the ULID was generated. If the ULID is malformed, an error will be thrown.
 *
 * @example Decode the time from a ULID
 * ```ts
 * import { decodeTime, ulid } from "@std/ulid";
 * import { assertEquals } from "@std/assert";
 *
 * const timestamp = 150_000;
 * const ulidString = ulid(timestamp);
 *
 * assertEquals(decodeTime(ulidString), timestamp);
 * ```
 *
 * @param ulid The ULID to extract the timestamp from.
 * @returns The number of milliseconds since the Unix epoch that had passed when the ULID was generated.
 */
export function decodeTime(ulid: string): number {
    if (ulid.length !== ULID_LEN) {
        throw new Error(`ULID must be exactly ${ULID_LEN} characters long`);
    }
    const time = ulid
        .substring(0, TIME_LEN)
        .split("")
        .reverse()
        .reduce((carry, char, index) => {
            const encodingIndex = ENCODING.indexOf(char);
            if (encodingIndex === -1) {
                throw new Error(`Invalid ULID character found: ${char}`);
            }
            return (carry += encodingIndex * Math.pow(ENCODING_LEN, index));
        }, 0);
    if (time > TIME_MAX) {
        throw new RangeError(
            `ULID timestamp component exceeds maximum value of ${TIME_MAX}`,
        );
    }
    return time;
}

const defaultMonotonicUlid = monotonicFactory();

/**
 * Generate a ULID that monotonically increases even for the same millisecond,
 * optionally passing the current time. If the current time is not passed, it
 * will default to `Date.now()`.
 *
 * Unlike the {@linkcode ulid} function, this function is guaranteed to return
 * strictly increasing ULIDs, even for the same seed time, but only if the seed
 * time only ever increases. If the seed time ever goes backwards, the ULID will
 * still be generated, but it will not be guaranteed to be monotonic with
 * previous ULIDs for that same seed time.
 *
 * @example Generate a monotonic ULID
 * ```ts no-assert
 * import { monotonicUlid } from "@std/ulid";
 *
 * monotonicUlid(); // 01HYFKHG5F8RHM2PM3D7NSTDAS
 * monotonicUlid(); // 01HYFKHG5F8RHM2PM3D7NSTDAT
 * monotonicUlid(); // 01HYFKHHX8H4BRY8BYHAV1BZ2T
 * ```
 *
 * @example Generate a monotonic ULID with a seed time
 * ```ts no-assert
 * import { monotonicUlid } from "@std/ulid";
 *
 * // Strict ordering for the same timestamp, by incrementing the least-significant random bit by 1
 * monotonicUlid(150000); // 0000004JFHJJ2Z7X64FN2B4F1Q
 * monotonicUlid(150000); // 0000004JFHJJ2Z7X64FN2B4F1R
 * monotonicUlid(150000); // 0000004JFHJJ2Z7X64FN2B4F1S
 * monotonicUlid(150000); // 0000004JFHJJ2Z7X64FN2B4F1T
 * monotonicUlid(150000); // 0000004JFHJJ2Z7X64FN2B4F1U
 *
 * // A different timestamp will reset the random bits
 * monotonicUlid(150001); // 0000004JFHJJ2Z7X64FN2B4F1P
 *
 * // A previous seed time will not guarantee ordering, and may result in a
 * // ULID lower than one with the same seed time generated previously
 * monotonicUlid(150000); // 0000004JFJ7XF6D76ES95SZR0X
 * ```
 *
 * @param seedTime The time to base the ULID on, in milliseconds since the Unix epoch. Defaults to `Date.now()`.
 * @returns A ULID that is guaranteed to be strictly increasing for the same seed time.
 */
export function monotonicUlid(seedTime: number = Date.now()): string {
    return defaultMonotonicUlid(seedTime);
}

/**
 * Generate a ULID, optionally based on a given timestamp. If the timestamp is
 * not passed, it will default to `Date.now()`.
 *
 * Multiple calls to this function with the same seed time will not guarantee
 * that the ULIDs will be strictly increasing, even if the seed time is the
 * same. For that, use the {@linkcode monotonicUlid} function.
 *
 * @example Generate a ULID
 * ```ts no-assert
 * import { ulid } from "@std/ulid";
 *
 * ulid(); // 01HYFKMDF3HVJ4J3JZW8KXPVTY
 * ulid(); // 01HYFKMDF3D2P7G502B9Z2VKV0
 * ulid(); // 01HYFKMDZQ7JD17CRKDXQSZ3Z4
 * ```
 *
 * @example Generate a ULID with a seed time
 * ```ts no-assert
 * import { ulid } from "@std/ulid";
 *
 * ulid(150000); // 0000004JFG3EKDRE04TVVDJW7K
 * ulid(150000); // 0000004JFGN0KHBH0447AK895X
 * ulid(150000); // 0000004JFGMRDH0PN7SM8BZN06
 * ```
 *
 * @param seedTime The time to base the ULID on, in milliseconds since the Unix epoch. Defaults to `Date.now()`.
 * @returns A ULID.
 */
export function ulid(seedTime: number = Date.now()): string {
    return encodeTime(seedTime) + encodeRandom();
}

export function generateUlid(seedTime: number = Date.now()): string {
    return monotonicUlid(seedTime);
}

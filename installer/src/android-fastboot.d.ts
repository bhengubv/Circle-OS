/**
 * Type declarations for `android-fastboot` (fastboot.js).
 *
 * WHY THIS FILE EXISTS
 *   The package ships no types. With `strict` on, `tsc` stops at the import:
 *
 *     error TS7016: Could not find a declaration file for module
 *     'android-fastboot'
 *
 *   which means `npm run build` has never succeeded and this installer has
 *   never been built. That is consistent with the rest of what was found in
 *   it - a manifest field the API did not return, a flash target that
 *   contradicted the artifact name - none of which a compiler ever got to see.
 *
 * WHAT IS DECLARED
 *   Only what this installer calls. This is not an attempt to describe the
 *   whole library: a declaration file that claims more than it has been
 *   checked against is worse than none, because it silently permits calls
 *   nobody has verified.
 *
 *   If you start using another method, declare it here at the same time -
 *   `tsc` will tell you, which is the point.
 */
declare module 'android-fastboot' {
  export class FastbootDevice {
    /** Prompts the browser for a USB device and opens it. */
    connect(): Promise<void>;

    /** `fastboot getvar <name>`. Rejects if the device will not answer. */
    getVariable(name: string): Promise<string>;

    /** `fastboot <command>` - e.g. "flashing unlock", "set_active b". */
    runCommand(command: string): Promise<void>;

    /** Waits for the device to come back after a reboot into fastboot. */
    waitForConnect(): Promise<void>;

    /**
     * `fastboot flash <partition>` from a Blob.
     *
     * The library splits large images into sparse chunks itself, which is why
     * a 2 GB Blob is acceptable here where a 2 GB transfer would not be.
     *
     * @param onProgress 0..1
     */
    flashBlob(
      partition: string,
      blob: Blob,
      onProgress?: (progress: number) => void,
    ): Promise<void>;
  }
}

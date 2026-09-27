/**
 * api.ts — Fetches the latest Circle OS release from ota.circleos.co.za
 *
 * ONE BUILD, MANY PHONES
 *   This used to ask for a build per phone model:
 *       GET /api/os/releases/latest?device=pixel6&channel=alpha
 *   so only phones somebody had registered on the server could get an answer,
 *   and the installer carried a hardcoded list of three codenames to match.
 *
 *   Circle OS does not make a build per phone. `circle_arm64` makes one
 *   system image and it is meant to fit any phone that can take it - that is
 *   the whole point of shipping a GSI, and BASIC_OS.md N2 records it as done.
 *   Asking per-device was asking the wrong question, and the short device list
 *   was the symptom.
 *
 *   It now asks:
 *       GET /api/os/releases/latest?channel=alpha
 *   and the release says what a phone needs in order to take it. The installer
 *   checks the phone against that, instead of checking its name against a list.
 *
 * WHAT THE SERVER MUST RETURN
 *   { hasUpdate: boolean, release: OsRelease | null }
 *
 *   OsRelease:
 *     id, version, channel, imageUrl, rolloutPercent
 *     buildDate?, imageSize?
 *     requires?: { architecture?, abSlots?, minVendorApiLevel?, notes? }
 *
 *   imageUrl MUST be a system image, not an A/B OTA payload. Circle OS is a
 *   system-only GSI and a browser cannot unpack a payload; installer.ts reads
 *   the first four bytes and refuses on "CrAU" rather than writing an archive
 *   into the partition.
 *
 *   `requires` is optional so an older server still works. When it is absent
 *   the installer applies the defaults in DEFAULT_REQUIREMENTS below, which
 *   are the things Circle OS has always needed.
 */

// WHERE THE MANIFEST LIVES
//
// ota.circleos.co.za was never deployed, so this asked a server that did not
// exist and the whole installer was unreachable in practice.
//
// It now reads a static file from the public repo. GitHub serves raw files
// with Access-Control-Allow-Origin: * - checked, not assumed - so a browser
// can read it with no server anywhere. tools/publish-release.sh in the
// CircleOS repo writes it.
//
// MANIFEST_URL can be pointed at a real API later without touching anything
// else: the shape it returns is the contract, not the host.
const MANIFEST_URL =
  'https://raw.githubusercontent.com/bhengubv/Circle-OS/main/releases/latest.json';

/**
 * What a phone must be able to do to take a release.
 *
 * Only two of these can be checked from a browser. fastboot will tell us the
 * slot count, and whether the bootloader is unlocked. It will not tell us the
 * vendor API level or whether the vendor partition is Treble-compliant, so
 * those are shown to the person rather than enforced - claiming to have
 * checked something we cannot check would be worse than saying so.
 */
export interface Requirements {
  /** "arm64". Not checkable over fastboot; shown, not enforced. */
  architecture?:      string;
  /** Needs two slots. Checkable: fastboot getvar slot-count. */
  abSlots?:           boolean;
  /** Vendor API level. Not checkable over fastboot; shown, not enforced. */
  minVendorApiLevel?: number;
  /** Free text shown before the person commits to erasing their phone. */
  notes?:             string;
}

/**
 * What Circle OS has always needed, used when a release does not say.
 *
 * abSlots is true because the installer flashes slot B and leaves the phone's
 * original OS in slot A - that is the whole of the revert story, and on a
 * phone with one slot there is nothing to revert to.
 */
export const DEFAULT_REQUIREMENTS: Requirements = {
  architecture:      'arm64',
  abSlots:           true,
  minVendorApiLevel: 33,
  notes:             'Treble-compatible device with an unlockable bootloader.',
};

export interface BuildManifest {
  id:             number;
  version:        string;
  channel:        string;
  /** The system image to flash. See the note on imageUrl above. */
  payloadUrl:     string;
  rolloutPercent: number;

  /**
   * Optional, because a server may not send them. installer.ts once read
   * manifest.buildDate and manifest.payloadSize while the interface declared
   * neither - one file had been edited without the other and the reads would
   * not have type-checked. Declared here and guarded at every use, so the UI
   * shows them when they arrive and says so when they do not.
   */
  buildDate?:     string;
  payloadSize?:   number;
  /** SHA-256 of the image, when the release publishes one. */
  sha256?:        string;

  /** Never null: falls back to DEFAULT_REQUIREMENTS. */
  requires:       Requirements;
}

/**
 * Fetch the latest release for a channel. No device parameter: there is one
 * build.
 *
 * @param channel "alpha" | "stable"
 */
export async function fetchLatestRelease(
  channel = 'alpha',
): Promise<BuildManifest> {
  // The static manifest carries one channel. A real API would take the
  // parameter; a file cannot, so the channel is checked after reading rather
  // than silently ignored.
  const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Could not reach the update server: ${res.status} ${res.statusText}`);
  }

  const body = await res.json() as {
    hasUpdate: boolean;
    release: {
      id: number;
      version: string;
      channel: string;
      // imageUrl is the name this contract asks for; manifestUrl is what the
      // older server sent. Both are read so a server upgrade and an installer
      // upgrade do not have to happen on the same day.
      imageUrl?: string;
      manifestUrl?: string;
      rolloutPercent: number;
      buildDate?: string;
      imageSize?: number;
      payloadSize?: number;
      imageSha256?: string;
      requires?: Requirements;
      // payloadUrl is in the same manifest and is NOT for us. It is an A/B
      // OTA payload for update_engine on the phone; a browser cannot run
      // update_engine. See docs/build/manifest.md.
    } | null;
  };

  if (!body.hasUpdate || !body.release) {
    throw new Error('No release has been published yet.');
  }
  if (body.release.channel !== channel) {
    throw new Error(
      `The published build is on the "${body.release.channel}" channel, ` +
      `not "${channel}".`
    );
  }

  const r = body.release;
  const image = r.imageUrl ?? r.manifestUrl;
  if (!image) {
    throw new Error(
      'This release does not include a system image, so it cannot be ' +
      'installed from a browser. It may still be installable as an update ' +
      'from the phone itself.'
    );
  }

  return {
    id:             r.id,
    version:        r.version,
    channel:        r.channel,
    payloadUrl:     image,
    rolloutPercent: r.rolloutPercent,
    buildDate:      r.buildDate,
    payloadSize:    r.imageSize ?? r.payloadSize,
    sha256:         r.imageSha256,
    requires:       { ...DEFAULT_REQUIREMENTS, ...(r.requires ?? {}) },
  };
}

/**
 * What a phone told us about itself, read over fastboot.
 *
 * `slotCount` and `unlocked` come from standard fastboot variables. Anything
 * a phone declines to answer comes back undefined, and an undefined answer is
 * never treated as a pass.
 */
export interface DeviceFacts {
  product:    string;
  slotCount?: number;
  unlocked?:  boolean;
}

export interface Verdict {
  /** False only when something was checked AND failed. */
  supported: boolean;
  /** Why not, in words a person can act on. */
  blockers:  string[];
  /** Real requirements that could not be checked from a browser. */
  unchecked: string[];
}

/**
 * Decide whether this phone can take this release.
 *
 * Replaces a hardcoded list of three device codenames. A phone is judged on
 * what it can do, not on whether somebody added its name.
 *
 * The two honest halves matter as much as each other. `blockers` are things
 * actually checked and actually failed - those stop the install. `unchecked`
 * are real requirements a browser cannot verify, and they are handed to the
 * person to confirm rather than quietly assumed.
 */
export function checkDevice(facts: DeviceFacts, req: Requirements): Verdict {
  const blockers: string[] = [];
  const unchecked: string[] = [];

  if (req.abSlots) {
    if (facts.slotCount === undefined) {
      unchecked.push(
        'Two system slots (A/B) - this phone did not report its slot count.'
      );
    } else if (facts.slotCount < 2) {
      blockers.push(
        `Circle OS installs into a second system slot and leaves your ` +
        `current OS in the first one. This phone reports ` +
        `${facts.slotCount} slot${facts.slotCount === 1 ? '' : 's'}, so ` +
        `there is nowhere to install to and nothing to go back to.`
      );
    }
  }

  if (req.architecture) {
    unchecked.push(
      `A ${req.architecture} phone - fastboot cannot report this.`
    );
  }
  if (req.minVendorApiLevel) {
    unchecked.push(
      `Android ${req.minVendorApiLevel} or newer firmware - fastboot cannot ` +
      `report this.`
    );
  }
  if (req.notes) {
    unchecked.push(req.notes);
  }

  return { supported: blockers.length === 0, blockers, unchecked };
}

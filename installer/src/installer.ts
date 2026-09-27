/**
 * installer.ts — WebUSB fastboot wrapper, device detection, slot management.
 *
 * Uses the `android-fastboot` (fastboot.js) library for WebUSB fastboot commands.
 * Exposes two global objects:
 *   window.app    — install flow (7 steps)
 *   window.revert — restore-slot-A flow
 */

import * as Fastboot from 'android-fastboot';
import {
  fetchLatestRelease,
  checkDevice,
  BuildManifest,
  DeviceFacts,
} from './api';
import {
  initStepBar,
  goToStep,
  appendLog,
  setFlashProgress,
  setText,
  setVisible,
  setEnabled,
} from './steps';

// ── Friendly names ────────────────────────────────────────────────────────────
//
// THERE IS NO LONGER A LIST OF SUPPORTED DEVICES.
//
// This used to hold a map of three fastboot product strings, and anything not
// in it was refused by name. That was wrong twice over: Circle OS builds ONE
// system image meant to fit any phone that can take it, and the list meant the
// Pixel 7a the project develops on could not use its own installer.
//
// A phone is now judged on what it can do - see checkDevice() in api.ts. This
// table only turns a codename into something readable, and a phone missing
// from it is shown its codename rather than turned away.
const DEVICE_NAMES: Record<string, string> = {
  oriole: 'Pixel 6',
  lynx:   'Pixel 7a',
  sky:    'Redmi Note 12',
};


// ── Slots ─────────────────────────────────────────────────────────────────────
//
// WHY THIS IS NOT JUST "A" AND "B"
//   The install flashed system_b and set_active b. The rollback set_active a.
//   Both hardcoded, and both wrong in the same way: they assume the phone is
//   on slot A right now.
//
//   If it is already on B - because Circle OS was installed once before, or
//   the phone shipped that way - then flashing B overwrites the OS that is
//   running, and there is nothing left to roll back to. The rollback would
//   then send the phone to slot A, which is whatever was there two installs
//   ago, or nothing.
//
//   So: install to the slot that is NOT running, and roll back to the slot
//   that is NOT running. Same rule, both directions, and the phone is asked
//   rather than assumed.

/** The slot that is not this one. */
function otherSlot(slot: string): string {
  return slot === 'a' ? 'b' : 'a';
}

/**
 * Is this slot safe to boot into?
 *
 * fastboot answers slot-unbootable:<slot> and slot-successful:<slot>. A slot
 * marked unbootable has already failed to boot, and switching to it is how a
 * phone ends up in a boot loop with no way back. A slot that is merely not
 * "successful" has not completed a boot yet - worth warning about, not worth
 * refusing.
 *
 * A phone that will not answer gets the benefit of the doubt on "successful"
 * and NOT on "unbootable" - an unknown is never treated as a pass for the
 * thing that bricks the boot.
 */
async function slotHealth(
  dev: Fastboot.FastbootDevice, slot: string,
): Promise<{ unbootable: boolean; unknown: boolean; successful: boolean }> {
  const ask = async (name: string): Promise<string | undefined> => {
    try {
      return await dev.getVariable(name);
    } catch {
      return undefined;
    }
  };
  const unbootableRaw = await ask(`slot-unbootable:${slot}`);
  const successfulRaw = await ask(`slot-successful:${slot}`);
  return {
    unbootable: unbootableRaw === 'yes',
    unknown:    unbootableRaw === undefined,
    successful: successfulRaw === 'yes',
  };
}

// ── State ──────────────────────────────────────────────────────────────────────
let fastbootDevice: Fastboot.FastbootDevice | null = null;
let manifest: BuildManifest | null = null;
let deviceFacts: DeviceFacts | null = null;
/** The slot the image went into. Read from the phone, never assumed. */
let targetSlot: string | null = null;

// ── Initialise ─────────────────────────────────────────────────────────────────
initStepBar();
goToStep(0);

// ── Install flow ───────────────────────────────────────────────────────────────

const app = {

  /** Step 0 → Step 1 */
  start(): void {
    goToStep(1);
  },

  /** Step 1: connect over WebUSB and ask the phone what it is. */
  async connectDevice(): Promise<void> {
    try {
      fastbootDevice = new Fastboot.FastbootDevice();
      await fastbootDevice.connect();

      const product: string = await fastbootDevice.getVariable('product');

      // Ask, and accept not being told. A phone that declines to answer is
      // not the same as a phone that answered badly, and the two must not be
      // treated alike - see checkDevice(), where an unknown is reported as
      // unchecked rather than counted as a pass.
      const ask = async (name: string): Promise<string | undefined> => {
        try {
          return await fastbootDevice!.getVariable(name);
        } catch {
          return undefined;
        }
      };

      const slotCountRaw = await ask('slot-count');
      const unlockedRaw = await ask('unlocked');

      const slotCount = slotCountRaw === undefined
        ? undefined
        : Number.parseInt(slotCountRaw, 10);

      deviceFacts = {
        product,
        slotCount: Number.isNaN(slotCount as number) ? undefined : slotCount,
        unlocked: unlockedRaw === undefined ? undefined : unlockedRaw === 'yes',
      };

      // A phone this table has never heard of is shown its own codename, not
      // turned away. The decision about whether it can take the image is made
      // from what it can do, at the next step.
      const friendlyName = DEVICE_NAMES[product] ?? product;
      setText('device-name', friendlyName);
      setVisible('device-info', true);

      appendLog(`Detected: ${friendlyName} (${product})`, 'log-ok');
      if (deviceFacts.slotCount !== undefined) {
        appendLog(`System slots: ${deviceFacts.slotCount}`);
      }
      if (deviceFacts.unlocked !== undefined) {
        appendLog(`Bootloader: ${deviceFacts.unlocked ? 'unlocked' : 'locked'}`);
      }

      goToStep(2);
      setEnabled('btn-fetch', true);

    } catch (err) {
      appendLog(`Connection failed: ${(err as Error).message}`, 'log-err');
      alert('Could not connect. Make sure the phone is in fastboot mode and plugged in over USB.');
    }
  },

  /** Step 2: fetch the one release, then check this phone can take it. */
  async fetchManifest(): Promise<void> {
    if (!deviceFacts) return;
    try {
      setEnabled('btn-fetch', false);
      appendLog('Fetching the latest build…');

      // No device parameter. There is one build - see api.ts.
      manifest = await fetchLatestRelease('alpha');

      // buildDate is optional. Saying so is better than printing "undefined"
      // at somebody who is about to erase their phone.
      const when = manifest.buildDate ?? 'build date not reported';
      setText('build-version', manifest.version);
      setText('build-date', when);
      setVisible('manifest-info', true);
      appendLog(`Found: CircleOS ${manifest.version} (${when})`, 'log-ok');

      // The list of supported phones is gone. This is what replaced it.
      const verdict = checkDevice(deviceFacts, manifest.requires);

      for (const note of verdict.unchecked) {
        appendLog(`Please confirm yourself: ${note}`, 'log-warn');
      }

      if (!verdict.supported) {
        for (const blocker of verdict.blockers) {
          appendLog(blocker, 'log-err');
        }
        alert(
          [
            'This build cannot be installed on this phone.',
            ...verdict.blockers,
            'Nothing has been changed on your phone.',
          ].join('\n\n')
        );
        setEnabled('btn-fetch', true);
        return;
      }

      appendLog('This phone can take this build.', 'log-ok');

      // Already unlocked? Then the erase-everything step is not needed, and
      // offering it anyway would be offering to wipe a phone for no reason.
      if (deviceFacts.unlocked === true) {
        app.skipIfAlreadyUnlocked();
      } else {
        goToStep(3);
      }

    } catch (err) {
      appendLog(`Could not get a build: ${(err as Error).message}`, 'log-err');
      setEnabled('btn-fetch', true);
    }
  },

  /** Step 3: Unlock bootloader (wipes device data) */
  async unlockBootloader(): Promise<void> {
    if (!fastbootDevice) return;
    const confirmed = confirm(
      'This will ERASE ALL DATA on your device and unlock the bootloader.\n\nAre you absolutely sure?'
    );
    if (!confirmed) return;

    try {
      appendLog('Sending unlock command…');
      await fastbootDevice.runCommand('flashing unlock');
      appendLog('Bootloader unlocked. Device rebooting to fastboot…', 'log-ok');

      // Re-connect after reboot into fastboot
      await fastbootDevice.waitForConnect();
      appendLog('Reconnected after unlock reboot', 'log-ok');
      goToStep(4);

    } catch (err) {
      appendLog(`Unlock failed: ${(err as Error).message}`, 'log-err');
    }
  },

  /** Step 3 → Step 4 skip: bootloader was already unlocked */
  skipIfAlreadyUnlocked(): void {
    appendLog('Skipping unlock — bootloader already unlocked', 'log-warn');
    goToStep(4);
  },

  /** Step 4: Download the system image from the CDN and flash it to slot B. */
  async flashDevice(): Promise<void> {
    if (!fastbootDevice || !manifest) return;

    setEnabled('btn-flash', false);
    appendLog(`Downloading payload from CDN: ${manifest.payloadUrl}`);
    setFlashProgress(0, 'Starting download…');

    try {
      const res = await fetch(manifest.payloadUrl);
      if (!res.ok) throw new Error(`CDN returned ${res.status}`);

      const contentLength = Number(
        res.headers.get('content-length') ?? manifest.payloadSize ?? 0
      );

      // Count bytes as they pass, but let the BROWSER hold them.
      //
      // This used to push every chunk into a Uint8Array[] and join it at the
      // end. A Circle OS system image is about 2 GB, so that asked the JS heap
      // to hold 2 GB and then briefly 4 GB while the Blob was built. It fell
      // over on any ordinary laptop. The comment above it said "streaming
      // download", which it was not - nothing streamed to the device, it
      // downloaded in full first.
      //
      // Piping through a TransformStream into Response.blob() keeps the
      // progress bar and hands storage to the browser, which spills to disk.
      // The download is still complete before flashing begins - fastboot.js
      // takes a Blob - but it is no longer held in the JS heap.
      let received = 0;
      const counter = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          received += chunk.length;
          if (contentLength > 0) {
            const pct = Math.round((received / contentLength) * 50); // 0-50%
            setFlashProgress(pct, `Downloading… ${pct * 2}%`);
          } else {
            setFlashProgress(0,
              `Downloading… ${(received / 1024 / 1024).toFixed(0)} MB`);
          }
          controller.enqueue(chunk);
        },
      });

      const blob = await new Response(res.body!.pipeThrough(counter)).blob();
      appendLog(`Download complete (${(received / 1024 / 1024).toFixed(1)} MB)`, 'log-ok');

      // WHAT IS IN THIS BLOB DECIDES WHETHER IT CAN BE FLASHED AT ALL.
      //
      // The manifest field is called payloadUrl and the old log line said
      // "Flashing payload.bin to slot B". If the server really is serving an
      // A/B OTA payload, this cannot flash it: payload.bin is a container
      // that update_engine unpacks on the device, not a partition image.
      // Writing it to system_b puts an archive where a filesystem should be,
      // and the phone does not boot.
      //
      // Circle OS is a system-only GSI, so the artifact that belongs here is
      // system.img. An OTA payload starts with the four bytes "CrAU", so it
      // costs one read to tell them apart - and refusing loudly is the only
      // honest option, because the browser cannot unpack one.
      const magic = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
      if (String.fromCharCode(...magic) === 'CrAU') {
        throw new Error(
          'The server sent an A/B OTA payload (payload.bin), which this ' +
          'installer cannot flash - it has to be unpacked by update_engine ' +
          'on the device. Point the release manifest at the system image ' +
          '(system.img) instead. Nothing was written to your phone.'
        );
      }

      setFlashProgress(50, 'Flashing to slot B…');
      appendLog('Flashing the system image to slot B…');

      // Flash via fastboot.js — uses `fastboot flash` under the hood
      // The slot that is NOT running. Hardcoding system_b overwrote the
      // running OS on a phone already booted from B, which is exactly the
      // case where a rollback is most needed and would have had nothing left
      // to roll back to.
      const current = await fastbootDevice.getVariable('current-slot');
      targetSlot = otherSlot(current);
      appendLog(`Running from slot ${current}; installing into slot ${targetSlot}.`);

      await (fastbootDevice as any).flashBlob(`system_${targetSlot}`, blob, (progress: number) => {
        const total = 50 + Math.round(progress * 50); // flash = 50–100%
        setFlashProgress(total, `Flashing… ${total}%`);
      });

      setFlashProgress(100, 'Flash complete');
      appendLog(`Slot ${targetSlot} flashed successfully.`, 'log-ok');
      goToStep(5);

    } catch (err) {
      appendLog(`Flash failed: ${(err as Error).message}`, 'log-err');
      setEnabled('btn-flash', true);
    }
  },

  /** Step 5: fastboot set_active b → reboot */
  async setActiveAndReboot(): Promise<void> {
    if (!fastbootDevice) return;
    try {
      appendLog(`Setting active slot to ${targetSlot}…`);
      await fastbootDevice.runCommand(`set_active ${targetSlot}`);
      appendLog(`Slot ${targetSlot} active. Rebooting…`, 'log-ok');
      await fastbootDevice.runCommand('reboot');
      goToStep(6);
    } catch (err) {
      appendLog(`Set active failed: ${(err as Error).message}`, 'log-err');
    }
  },
};

// ── Revert flow (Restore Previous OS tab) ─────────────────────────────────────

let revertDevice: Fastboot.FastbootDevice | null = null;

const revert = {

  async connect(): Promise<void> {
    try {
      revertDevice = new Fastboot.FastbootDevice();
      await revertDevice.connect();

      const product = await revertDevice.getVariable('product');
      const logEl = document.getElementById('log-revert');
      if (logEl) {
        logEl.style.display = '';
        const line = document.createElement('div');
        line.className = 'log-ok';
        line.textContent = `Connected: ${product}`;
        logEl.appendChild(line);
      }

      setText('revert-device-name', product);
      setVisible('revert-device-info', true);
      setVisible('btn-revert-go', true);

    } catch (err) {
      alert(`Connection failed: ${(err as Error).message}`);
    }
  },

  /**
   * Roll back: boot the slot that is not running, after checking it can.
   *
   * WHAT THIS USED TO DO
   *   set_active a, unconditionally. Three things wrong with that.
   *
   *   It assumed the phone was on B. A phone already running slot A - never
   *   installed, or installed twice - would be sent to a slot holding
   *   whatever was there two installs ago, or nothing.
   *
   *   It never asked whether that slot could boot. fastboot will happily mark
   *   an unbootable slot active, and the phone then boot-loops with the
   *   rollback button as the thing that caused it.
   *
   *   And on a phone with one slot it would fail with a raw fastboot error
   *   rather than saying there is nothing to roll back to.
   */
  async rollback(): Promise<void> {
    if (!revertDevice) return;

    const logEl = document.getElementById('log-revert');
    const log = (msg: string, cls?: string) => {
      if (!logEl) return;
      const line = document.createElement('div');
      if (cls) line.className = cls;
      line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
      logEl.appendChild(line);
      logEl.scrollTop = logEl.scrollHeight;
    };

    try {
      const slotCountRaw = await revertDevice.getVariable('slot-count')
        .catch(() => undefined);
      const slotCount = slotCountRaw === undefined
        ? undefined : Number.parseInt(slotCountRaw, 10);

      if (slotCount !== undefined && slotCount < 2) {
        alert(
          'This phone has only one system slot, so there is no previous OS ' +
          'to go back to. Nothing has been changed.'
        );
        return;
      }

      const current = await revertDevice.getVariable('current-slot');
      const target = otherSlot(current);
      log(`Running from slot ${current}. The previous OS would be in slot ${target}.`);

      const health = await slotHealth(revertDevice, target);

      if (health.unbootable) {
        log(`Slot ${target} is marked unbootable.`, 'log-err');
        alert(
          `Slot ${target} is marked as unbootable, which means it has ` +
          `already failed to start. Switching to it would leave this phone ` +
          `unable to boot.

Nothing has been changed. Recover with a ` +
          `full factory image over USB instead.`
        );
        return;
      }

      if (health.unknown) {
        log(`This phone would not say whether slot ${target} can boot.`, 'log-warn');
      } else if (!health.successful) {
        log(`Slot ${target} has never completed a boot.`, 'log-warn');
      }

      const warning = health.unknown
        ? `

This phone would not say whether slot ${target} can boot, so ` +
          `this cannot be checked for you.`
        : !health.successful
          ? `

Warning: slot ${target} has never completed a boot.`
          : '';

      const confirmed = confirm(
        `Switch to slot ${target} and restart?

` +
        `Nothing is erased and nothing is overwritten - only which slot the ` +
        `phone starts from changes. You can switch back the same way.` +
        warning
      );
      if (!confirmed) {
        log('Cancelled. Nothing was changed.');
        return;
      }

      log(`Setting active slot to ${target}…`);
      await revertDevice.runCommand(`set_active ${target}`);
      log(`Slot ${target} active. Restarting…`, 'log-ok');
      await revertDevice.runCommand('reboot');
      log('Done. If it does not start, connect again and switch back.', 'log-ok');

      setVisible('btn-revert-go', false);

    } catch (err) {
      log(`Rollback failed: ${(err as Error).message}`, 'log-err');
      alert(
        `Rollback failed: ${(err as Error).message}

` +
        `Nothing was erased. The phone is still on the slot it was on.`
      );
    }
  },

  /** The old name, kept so existing HTML onclick handlers keep working. */
  async restoreSlotA(): Promise<void> {
    return revert.rollback();
  },
};

// Expose to HTML onclick handlers
(window as any).app    = app;
(window as any).revert = revert;

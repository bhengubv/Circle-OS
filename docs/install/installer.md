# Install from your browser

No drivers and no command line. Chrome or Edge on a desktop — Firefox and
Safari cannot talk to USB devices, and neither can any phone browser.

**Everything on your phone is erased.** Unlocking the bootloader wipes it.
That is Android's behaviour, not ours, and it cannot be skipped.

## Before you start

- Back up anything you want to keep. All of it.
- Read [what does not work](../reference/limitations.md). Calls and texts may
  not, depending on your network.
- A USB cable that carries data. Many charging cables do not.

## Steps

1. **Put the phone in fastboot mode.** Power off, then hold volume-down while
   powering on. You should see a screen with a start arrow.
2. **Plug it in** and open the installer.
3. **Connect.** The browser asks which device; pick your phone. The installer
   reads what it is and what it can do.
4. **Fetch the build.** It checks your phone can take it and tells you what it
   could not check.
5. **Unlock.** This erases the phone. If it is already unlocked this step is
   skipped.
6. **Install.** It downloads the image and writes it to the spare slot. Your
   current OS is not touched.
7. **Restart.**

First boot takes a few minutes.

## If it goes wrong

Nothing is written to your phone before step 6. If the installer stops before
that — unsupported phone, no build available, a download that failed — your
phone is as it was, aside from the wipe in step 5.

If step 6 or 7 fails, [go back](rollback.md). Your previous OS is in the other
slot.

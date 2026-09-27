# Which phones

Circle OS is a GSI: one image, and any phone that meets the requirements can
take it. There is no per-phone build, and no list of blessed models.

## What a phone needs

- **Two system slots.** Circle OS installs into the one that is not running and
  leaves your current OS in the other. That is what makes going back safe. A
  phone with one slot has nowhere to install to and nothing to go back to.
- **An unlockable bootloader.** Many carrier-sold phones cannot be unlocked at
  all. There is no way around this.
- **Treble, and firmware recent enough** for the image. The installer cannot
  check this for you and will say so rather than pretend.
- **arm64.**

The installer checks the first of those and tells you honestly which ones it
could not check.

## Tested

| Phone | Codename | State |
|---|---|---|
| Pixel 7a | `lynx` | Built and run daily. Everything on the [limitations](reference/limitations.md) page applies. |

## Reported working

Nothing yet. If you install Circle OS on something else, open an issue and say
what happened — including if it failed. A phone that did not work is more useful
to this table than one that did.

## Known not to work

Nothing recorded yet. Same request.

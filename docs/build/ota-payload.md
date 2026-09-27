# On-device updates need a payload, and the build does not make one

The browser installer works without this. The phone's own updater does not.

## Where it stands

`CircleUpdateService` reads the release manifest, takes `payloadUrl`, and hands
it to Android's `update_engine`. That path is written and correct.

`payloadUrl` is empty in every release, because nothing produces a payload.
Checked in the build tree 2026-09-27:

- `circle-os.sh` builds `systemimage` and nothing else
- there is no target-files package in `out/`
- `ota_from_target_files` is not built

So the service correctly reports "no update" — it is not broken, it has nothing
to offer.

## What producing one would take

An A/B payload is made from a target-files package, not from a system image:

```
m target-files-package     # much larger than systemimage
m otatools                 # host tools, including ota_from_target_files
ota_from_target_files --output_metadata_path … target-files.zip ota.zip
```

The payload and its properties come out of that zip.

## Why it is not just switched on

`m target-files-package` is a substantially bigger build than `m systemimage`,
and `circle-os.sh` takes its targets from constants on purpose — so a build
cannot quietly become a different build. Adding a target is a decision about
build time and disk, not a tidy-up, and it belongs to whoever waits for it.

## Until then

Updates are installed the same way as a first install: from the browser, into
the spare slot, with the previous build still in the other one. That is a
worse experience than an over-the-air update and it is not a broken one.

The manifest carries `payloadUrl` as an empty string rather than omitting it,
so the day a payload exists it is one field, not a format change.

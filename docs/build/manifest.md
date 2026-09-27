# The release manifest

One file, two clients, two artifacts.

`releases/latest.json` in this repo, served raw from GitHub. Both the browser
installer and the phone's own updater read the same document.

```json
{
  "hasUpdate": true,
  "release": {
    "id": 20260927,
    "version": "0.1.0-alpha",
    "channel": "alpha",
    "buildDate": "2026-09-27",

    "imageUrl": "https://cdn.../system.img.gz",
    "imageSize": 1010259368,
    "imageSha256": "…",

    "payloadUrl": "https://cdn.../payload.bin",
    "payloadSha256": "…",

    "rolloutPercent": 100,
    "minVersion": null,
    "requires": {
      "architecture": "arm64",
      "abSlots": true,
      "minVendorApiLevel": 33,
      "notes": "Treble-compatible device with an unlockable bootloader."
    }
  }
}
```

## Why two artifacts and not one

They are flashed by different things and neither can use the other's file.

- **`imageUrl`** is a raw system image. The browser installer writes it to the
  spare slot over fastboot. A browser cannot run `update_engine`, so it needs
  the image itself.
- **`payloadUrl`** is an A/B OTA payload. The phone's updater hands it to
  Android's `update_engine`, which downloads, verifies and stages it. That is
  the right mechanism for an update on a running phone, and it cannot take a
  raw image.

A release without `payloadUrl` can still be installed from a browser; the phone
simply reports no update. A release without `imageUrl` is the reverse. Both
clients check for the field they need and say plainly when it is absent.

## Why the image is not on GitHub Releases

Tested 2026-09-27: a GitHub release asset download returns no
`Access-Control-Allow-Origin` header, so a browser page on another origin
cannot fetch it. The installer is such a page.

Release assets are still published — they are fine for `curl`, for a direct
browser download, and as the archival copy. They are just not something a web
page can read. `imageUrl` therefore points at storage that sends CORS headers.

The manifest itself is fine on GitHub: `raw.githubusercontent.com` does send
`Access-Control-Allow-Origin: *`. Also tested.

## Channels

One file, one channel at a time. A client asking for a channel it does not
carry is told so rather than handed the wrong build.

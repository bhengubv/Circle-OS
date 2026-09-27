# Publishing a release

There is no update server. There does not need to be one.

- The **manifest** is `releases/latest.json` in this repo, served raw from
  GitHub. GitHub sends `Access-Control-Allow-Origin: *` on raw files, so the
  browser installer can read it directly. Confirmed, not assumed.
- The **image** goes to storage that sends CORS headers. NOT a GitHub release
  asset: tested 2026-09-27, an asset download returns no
  `Access-Control-Allow-Origin`, so a browser page on another origin cannot
  fetch it. Assets are still published as the archival copy - fine for `curl`
  and for a direct download, just not readable by a web page.

That is the whole pipeline. A static file and an upload.

See [the manifest](manifest.md) for the shape both clients read, and why a
release carries two artifacts.

## What the manifest says

```json
{
  "hasUpdate": true,
  "release": {
    "id": 1,
    "version": "0.1.0-alpha",
    "channel": "alpha",
    "imageUrl": "https://github.com/.../releases/download/v0.1.0-alpha/system.img.gz",
    "imageSize": 1010259368,
    "buildDate": "2026-09-27",
    "rolloutPercent": 100,
    "requires": {
      "architecture": "arm64",
      "abSlots": true,
      "minVendorApiLevel": 33,
      "notes": "Treble-compatible device with an unlockable bootloader."
    }
  }
}
```

`requires` is what replaced the installer's hardcoded list of phone models. The
installer checks what it can — slot count — and shows the rest for the person
to confirm, rather than claiming to have checked something it cannot.

## Why gzip and not xz

Measured on a real image: 2,068 MB raw, 1,010 MB gzip, 838 MB xz.

xz is 170 MB smaller and the wrong choice. Browsers decompress gzip natively
through `DecompressionStream`, straight into storage the browser manages. xz
needs a decoder shipped to the page and the whole 2 GB held in memory to
unpack. The smaller file costs more than it saves.

## Size

GitHub caps a release asset at 2 GiB and the raw image is 79 MB under that -
uncomfortably close. Compressed it is less than half, which is the real reason
to compress. The same file goes to the CDN the installer reads from.

## Doing it

From the CircleOS repo, after a build:

```
tools/publish-release.sh <version>
```

It compresses the image, uploads it, writes the manifest, and pushes. It will
not overwrite an existing release.

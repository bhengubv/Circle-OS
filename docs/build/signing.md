# Signing releases

Circle OS asks people to unlock their bootloader, which removes the phone's own
protection against modified software. A signature is how they check that what
they downloaded came from you.

**Releases are unsigned until you do this.** `publish-release.sh` says so, in
the release notes it writes, on every unsigned release.

## Make a key, once

```
gpg --quick-generate-key "Circle OS Releases <releases@circleos.co.za>" ed25519 sign 2y
gpg --list-secret-keys --keyid-format LONG
```

Note the key id. Then publish the public half somewhere that is **not** the
releases page — a key server, or a page on a different domain. A signature and
the key that verifies it, sitting side by side on one site, prove only that
whoever controls that site controls both.

```
gpg --armor --export <key-id> > circleos-releases.asc
gpg --fingerprint <key-id>
```

Put the fingerprint where people will look for it, and where changing it would
be noticed.

## Use it

```
export CIRCLE_SIGNING_KEY=<key-id>
tools/publish-release.sh 0.1.0-alpha
```

Every release then carries `SHA256SUMS.asc` beside `SHA256SUMS`, and
[verifying a download](../reference/verifying.md) describes something that
actually happened.

## Keeping the key

It signs everything anybody installs. If it leaks, someone else can publish a
Circle OS that people will verify and trust.

- Not in a repository. Not in `deployment-credentials.ps1`. Not in CI unless
  you have decided that a compromised runner is an acceptable way to lose it.
- Back up the secret key somewhere offline.
- `2y` above is an expiry, not a limit — extend it rather than making a new key,
  so people are not asked to trust a new fingerprint every couple of years.

## Until it is signed

`verifying.md` tells people to check a signature. While releases are unsigned
that page is describing something that did not happen, and the release notes
say as much: a checksum on the same page as the file protects you from a
corrupted download, not from a hostile one.

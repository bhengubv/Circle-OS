# Verify a download

Circle OS asks you to unlock your bootloader, which removes the phone's own
protection against modified software. That is only a reasonable thing to ask if
you can check that what you downloaded is what we published.

## Check the hash

Every release publishes a SHA-256 for the image. After downloading:

```
sha256sum system.img.gz
```

Compare it with the value on the release page. If they differ, do not install
it. Tell us.

## Check the signature

Each release also publishes a signed checksum file, so you are trusting a key
rather than a web page that could have been changed.

```
gpg --verify SHA256SUMS.asc SHA256SUMS
sha256sum -c SHA256SUMS
```

The signing key and its fingerprint are published separately from the releases,
so that taking over one does not get you the other.

## If you cannot verify it

Do not install it. An unverified image asking for an unlocked bootloader is
exactly the shape of an attack.

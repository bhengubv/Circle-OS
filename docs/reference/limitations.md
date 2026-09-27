# What does not work

Circle OS is an alpha. This page is the honest list, kept current. If something
is broken and not here, that is a bug in this page.

## Calling and texting

**Voice calls and SMS do not work on networks that have switched off 2G and 3G.**

Modern calling needs VoLTE, which needs an IMS service. There is no IMS service
in AOSP, none in this image, and none in the phone's own firmware that we can
use. Where 2G or 3G still exist, calls fall back to those and work. Where they
have been switched off — most of Europe, increasingly elsewhere — they do not.

This is the largest gap in the OS and it is not close to fixed.

## Voice input and output

No speech recognition and no text-to-speech. Both of Android's usual providers
are Google services and this image has neither. Anything that expects to talk
or listen will not.

## eSIM

Profile download currently fails. The eSIM manager is installed and can read an
eUICC; downloading a profile stops partway through without an error. Under
investigation.

## Updates

There is no over-the-air update yet. Installing a newer build means flashing it.

## Security posture

The alpha ships with the bootloader unlocked, ADB enabled, and no verified boot
under our own keys. A phone in this state can be modified by anyone who has it
in their hands and a cable.

Do not put anything on an alpha device that you would mind a stranger reading.

## Appearance

Several parts of the system are still stock Android rather than Circle's own
design. The home screen is ours; much of what sits behind it is not yet.

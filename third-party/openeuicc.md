# OpenEUICC

Circle OS ships OpenEUICC, the eSIM manager. It is not ours.

- Upstream: <https://gitea.angry.im/PeterCxy/OpenEUICC>
- Built from: <https://github.com/estkme-group/openeuicc> at `49e498d`
- Licence: GPL-3.0

## What we changed

One line, and one deletion that never reaches the image.

**1. Verbose logging defaults to on.**

`app-common/src/main/java/im/angry/openeuicc/util/PreferenceUtils.kt`

```kotlin
- val verboseLoggingFlow = bindFlow(PreferenceKeys.VERBOSE_LOGGING, false)
+ val verboseLoggingFlow = bindFlow(PreferenceKeys.VERBOSE_LOGGING, true)
```

A profile download fails on the Pixel 7a: the ES9+ calls
`initiateAuthentication` and `authenticateClient` both return 200, then nothing
follows and the screen shows no error. The server's reply is the only place the
reason can be, and OpenEUICC logs it only when this flag is on. It defaults to
off, so on a phone nobody has been into the settings on, the one thing that
would explain the failure is switched off.

It is still a setting. Only the default moved.

This costs privacy: those logs carry the eUICC's EID and the activation code's
matching ID. It should go back to `false` once the failure is understood.

**2. `libs/lpac-jni/src/main/jni/Application.mk` is deleted before building.**

Soong refuses to analyse any `Android.mk` or `Application.mk` under
`packages/`, and stops the whole build rather than skipping the file.
OpenEUICC carries it for Gradle; the AOSP build uses the `.bp` files beside it.
Nothing is lost and nothing about this reaches the shipped app.

## The patches

- `modules/circleos-esim/patch_openeuicc_verbose.py`
- `modules/circleos-esim/fix_lpac_submodule.sh`

Each explains itself at the line it changes.

## Not ours

Everything else in OpenEUICC is upstream's work. We had three Kotlin
compatibility fixes against an older snapshot; upstream has since fixed all
three itself and our patch is retired.

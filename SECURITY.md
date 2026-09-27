# Reporting a security problem

Email **security@circleos.co.za**. Please do not open a public issue first.

Tell us what you found, how to reproduce it, and which build — the version is
in Settings, or `adb shell getprop ro.circle.version`.

**What to expect:** an acknowledgement within 72 hours, and an honest answer
about whether we can fix it and when. If we cannot fix something, we will say
so publicly rather than leave it unsaid — see
[limitations](docs/reference/limitations.md).

## What is in scope

The Circle OS image and the code in our repositories.

## What is not

Upstream Android, and the phone's own firmware. Report those to Google or the
phone's maker. Tell us anyway if it affects Circle OS users — we will point you
in the right direction and note it in our limitations.

## This is an alpha

The current builds run with the bootloader unlocked, ADB on, and no verified
boot. Those are not findings; they are stated in
[limitations](docs/reference/limitations.md). A phone in this state should not
hold anything you would mind losing.

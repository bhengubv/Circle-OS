# Install by hand

If you would rather use fastboot than a browser. Same result.

**Everything on your phone is erased** by the unlock step.

## What you need

`fastboot` from the Android platform-tools, and the release image.

## Steps

```
# 1. Phone in fastboot mode: power off, hold volume-down, power on.
fastboot devices

# 2. Check it has two slots. If this says 1, stop - see device-support.
fastboot getvar slot-count

# 3. Note which slot is running. You will install into the other one.
fastboot getvar current-slot

# 4. Unlock. THIS ERASES THE PHONE.
fastboot flashing unlock

# 5. Decompress and flash into the slot that is NOT running.
gunzip system.img.gz
fastboot flash system_<other slot> system.img

# 6. Start from it.
fastboot set_active <other slot>
fastboot reboot
```

[Verify the download](../reference/verifying.md) before step 5.

## Going back

Your previous OS is untouched in the other slot — see [rollback](rollback.md).

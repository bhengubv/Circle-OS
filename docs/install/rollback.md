# Going back

Your previous OS is still on the phone. Circle OS installs into the spare
system slot and never touches the one you were using.

Going back switches which slot the phone starts from. **Nothing is erased and
nothing is overwritten.** You can switch back again the same way.

## From the browser

Open the installer, choose **Restore previous OS**, connect the phone in
fastboot mode, and confirm.

It checks first. If the other slot is marked unbootable it refuses and says so,
because switching to a slot that has already failed to start would leave the
phone unable to boot at all. If your phone will not say, it tells you that too
rather than guessing.

## By hand

```
fastboot getvar current-slot
fastboot set_active <the other one>
fastboot reboot
```

Check before you switch:

```
fastboot getvar slot-unbootable:<the other one>
```

`yes` means do not.

## If neither slot boots

Flash the phone maker's factory image over USB. That erases everything and
returns the phone to stock.

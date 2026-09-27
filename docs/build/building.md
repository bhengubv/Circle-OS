# Build it yourself

Circle OS is AOSP plus an overlay. Everything Circle-specific is a patch
applied to a clean tree, so you can see exactly what we change.

## What you need

A Linux machine, 16+ GB RAM, and about 400 GB free. Building AOSP is not
modest.

## How it is put together

Circle-specific work lives as modules. Each one is a script that edits the AOSP
tree, and every script explains at the line why it is changing what it changes.

`modules/STAGE.txt` lists which modules go into a build, in order. A module
that exists but is not listed is deliberately not in the image — that is a
state worth being able to express, and it is why the list is not a glob.

## Building

```
tools/circle-os.sh
```

That runs the staged patches and builds. It takes the product and variant from
constants, not arguments, so a build cannot quietly become a different build.

## Reproducing a specific release

Each archived image is filed with the `STAGE.txt` that produced it and the
commit it came from. Same list, same commit, same image.

## What we change in other people's software

See [third-party/](../../third-party/).

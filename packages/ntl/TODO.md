Note that we are currently building the WASM version with:

```
NTL_GMP_LIP=off
```

so presumably it's really slow for big numbers.

We're doing this for native because:
  - on native macos it accidentally gets the systemwide libgmp which breaks
  - on wasm it complains about limb size inconsistency

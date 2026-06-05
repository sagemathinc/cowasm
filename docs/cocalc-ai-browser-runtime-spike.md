# CoCalc AI Browser Runtime Spike

## Goal

Run one useful CoCalc project workflow in the browser without starting the
project backend: import a selected subset of project files into CoWasm, run
Python or shell commands against them, collect output and file changes, then
write selected results back through CoCalc AI's normal file/sync interfaces.

This is a runtime integration spike, not a replacement for the full project
host.  The first target is a small explicit file set, not recursive project
sync, project terminals, or Jupyter kernels.

## Integration Surfaces In CoCalc AI

The current `/home/user/cocalc-ai` reference tree has two relevant layers:

- Conat filesystem RPCs in `src/packages/conat/files/fs.ts`.
  These expose project-scoped methods such as `readFile`, `writeFile`,
  `writeFileDelta`, `watch`, and `syncFsWatch`.  Paths are sandbox-relative
  and the backend enforces path safety.
- SyncDoc/Patchflow, described in `docs/sync.md`.
  Live text documents are owned by Patchflow/SyncDoc.  Disk writes are bridged
  into the same patch stream by the backend sync-fs service, and clients keep
  interest alive with `syncFsWatch(path, true, meta)` heartbeats.

The spike should use the file RPC layer for low-level import/export, but it
must not treat disk as more authoritative than live SyncDoc state for open text
documents.  For text outputs, prefer `writeFileDelta(path, next, {
baseContents })` when a base snapshot is known.  Conflict/fallback behavior is
already modeled by `ETAG_MISMATCH` and `PATCH_FAILED`.

## MVP Workflow

1. Choose an explicit project file subset.
   Each entry should include a project-relative path, expected encoding, max
   size, and intended runtime path.  Start with text files plus small binary
   files only.
2. Import the subset into a CoWasm browser filesystem mount such as
   `/project`.
   Record for each file: original bytes or text, hash, mtime if available, and
   whether it came from live SyncDoc state or file RPC state.
3. Run one command in the browser runtime.
   Initial examples:
   - `python /project/script.py`
   - `sh -c 'python /project/script.py > /project/out.txt'`
   - `sh -c 'grep pattern /project/input.txt > /project/matches.txt'`
4. Collect stdout, stderr, exit status, runtime duration, and changed files.
   File changes should be diffed against the imported snapshot instead of
   blindly exporting the whole mount.
5. Export selected changed files back to CoCalc AI.
   Text files should use base-aware delta writes.  Binary files should use full
   writes with size caps.

## CoWasm Work Needed

- Add a browser-side project filesystem adapter around the current in-memory
  filesystem.  It should support `loadFiles(files)`, `snapshot()`, and
  `changedFiles(before, after)`.  The first narrow version is
  `web/browser/src/project-files.ts`, which loads selected files into a Python
  worker mount and exports changed files with base hashes.
- Keep path mapping explicit.  Project paths stay sandbox-relative on the
  CoCalc side and map to runtime paths under one mount point such as
  `/project`.
- Add quotas before connecting to real projects:
  max files, max total bytes, max single-file bytes, max command runtime, max
  stdout/stderr bytes, and max exported bytes.
- Make export policy explicit:
  include-only changed files under `/project`, never runtime internals, cache
  directories, secrets, or hidden project metadata unless the caller requested
  those paths.
- Preserve the existing browser runtime gate:
  `make -C web/browser test` should grow an in-memory "project subset" fixture
  before any CoCalc AI dependency is added to the test.

## CoCalc AI Work Needed

- Identify the frontend-accessible file client for a project that is not
  started as a project host.  The likely path is the Conat fs client, using the
  same shape as `fsClient({ client, subject })`.
- Decide how browser-runtime writes should interact with live SyncDoc state:
  text document outputs can go through `writeFileDelta`, while edits to files
  currently open in an editor may need SyncDoc-aware writes instead of raw file
  writes.
- Provide a narrow browser API entry point for the spike, for example:

```ts
api.browserRuntime.run({
  files: [{ path: "script.py", runtimePath: "/project/script.py" }],
  command: ["python", "/project/script.py"],
  export: [{ runtimePath: "/project/out.txt", path: "out.txt" }],
});
```

- Add a browser automation test in CoCalc AI only after CoWasm has an in-memory
  project subset smoke test.

## Validation Plan

First validation should stay entirely inside CoWasm:

- import two text files into `/project`: covered by
  `web/browser/src/project-files.ts` and `web/browser/src/smoke.ts`;
- import nested binary files and reject unsafe paths: covered by
  `web/browser/src/smoke.ts`;
- run Python in the browser worker: covered by the existing browser smoke path;
- create or update one output file: covered by the `/project/out.txt` fixture;
- export the changed file list with base hashes: covered by
  `PythonProjectFiles.changedFiles()`, including binary outputs exported as
  base64 with `text: null` when UTF-8 decoding fails;
- assert stdout/stderr/exit status and file diff metadata: stdout/stderr and
  browser worker status are covered by the broader smoke test, and changed-file
  metadata is asserted by the fixture.

Second validation should use CoCalc AI browser automation:

- create or select a small project file through the normal file API;
- run the browser runtime command against that file;
- export a result file through `writeFileDelta` or `writeFile`;
- read the result through the normal CoCalc AI file API;
- verify conflict handling by changing the base file before export.

## Non-Goals For This Spike

- Full recursive project filesystem sync.
- Browser replacement for project-host terminals.
- Browser Jupyter kernels.
- Scientific package expansion.
- Hidden project metadata access.
- Captured dash stdout as a product contract.  That remains a CoWasm runtime
  follow-up from Phase 4.

## Open Questions

- Which exact CoCalc AI client object is available in the frontend when the
  project backend is not started?
- Should text writes to already-open files always route through SyncDoc, or is
  `writeFileDelta` enough because sync-fs bridges disk writes into Patchflow?
- What is the right conflict UX when a command modifies a file whose live editor
  state advanced after import?
- Is `reflect-sync` still the right long-term sync layer, or should the first
  product version use CoCalc AI's existing Conat fs and Patchflow machinery
  directly?

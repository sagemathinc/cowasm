
## Git and Validation

- By default, agents should auto-commit completed change-sets after relevant validation passes.
- The default workflow is: make the change, run the relevant checks, commit, then let the user review and request follow-up fixes in a new commit if needed.
- Do not wait for an explicit "commit" request unless the user asked not to commit, the work is clearly exploratory/incomplete, or there are unrelated worktree changes that would make an automatic commit unsafe.
- Commit messages should be prefixed by area/package.
- By default, write commit messages with:
  - a concise first line (subject), and
  - a detailed markdown body explaining details of the commit, which is more succinct than the agent turn summary, including only information that is valuable longterm.
  - do not include a dedicated `Tests and validation` section; mention verification only when it adds long-term value.
  - do not embed literal escaped newlines (e.g. `\n` or `\\n`) in commit messages.
  - For multiline commit messages, always use stdin/heredoc or a message file instead of `git commit -m`.
  - In `exec_command` / shell tool calls, do not rely on quoted `\n` sequences to create commit-message line breaks; use literal newlines in the heredoc body.
  - Safe default pattern:

```
git commit -F - <<'EOF'
<subject line>

<body>
EOF
```

- `git commit -m` is only for subject-only commits with no body.
- Prefer follow-up commits over amending or rewriting history unless the user explicitly asks for that.

## Project Direction

- Treat CoWasm as a browser-native Unix/Python runtime for serious mathematics, with Sagelite and SageMath as the long-term defining applications.
- Do not steer the project toward being only a Pyodide clone. Pyodide is the reference point for browser scientific Python; CoWasm should differentiate through an interruptible terminal/runtime, filesystem semantics, dynamic C/C++ packages, and pure-math/SageMath capability.
- Use Sagelite as the practical bridge toward SageMath-in-WebAssembly. Full SageMath is a long-term north star; near-term work should keep the runtime reliable and port high-value mathematical dependencies incrementally.
- Preserve the current pinned Zig-based build as the known-good baseline while making the underlying clang/lld/WASI contract more explicit. Prefer incremental toolchain-backend work over a broad rewrite.

## Scratch Artifacts and I/O Safety

- Put generated test databases, worker state, reconstructed source trees, and copy-on-write runtime bundles under `/tmp`, not a project-local `.tmp` directory. `/tmp` is intentionally ephemeral and is not included in project backups or snapshots.
- Keep durable evidence in tracked summaries and source changes. Do not retain copied runtimes or large generated trees in the repository after their result has been summarized.
- Treat a project-local `.tmp` tree as opaque legacy scratch. Never run an unbounded recursive search, size scan, or `--no-ignore` command over it. Inspect only an exact known child path when legacy evidence is required.
- Exclude `.tmp` explicitly from repository-wide searches even when the search tool would normally honor ignore files.

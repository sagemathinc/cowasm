
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

# Hosting the code project on GitLab

The Orchestrator owns this; the Design Agent never pushes. The project's `code/` folder is its own git repository (`code-conventions.md`, "Git"); this file says how it gets a GitLab remote and how rounds are pushed. Host: **gitlab.com**. The user creates the empty repository; the plugin never creates one, never asks for a password or token, and never stores credentials.

## When to ask

Once per project, **right after the first build round returns** (end of Stage 3, before the audit), unless the state file already has `git_remote` or `git_push: "declined"`. A resumed run with `git_remote` set doesn't ask again; it checks the remote still answers (`git ls-remote origin HEAD`) and says so if it doesn't.

Ask with AskUserQuestion: *"Host the code on GitLab?"*
- **Yes, I'll paste the repository link** — "Create an empty project on gitlab.com (no README, no .gitignore, no licence), then paste its link here (`https://gitlab.com/<group>/<project>.git` or `git@gitlab.com:<group>/<project>.git`). I push after each finished round."
- **Not for this project** — save `git_push: "declined"`; the code stays local.

If the user says "Other" with a link, use it. Accept only `gitlab.com` links; for any other host, say the plugin is set up for gitlab.com and ask whether to continue with that host anyway.

## First push

1. **Check what would leave the machine** (in `code/`, `git ls-files`): no `.env*` with values, private keys, `*.pem`, credentials or tokens (search the tracked files for `BEGIN PRIVATE KEY`, `api_key`, `secret`, `password=`, `token=`, long random strings), no file over 50 MB, and `node_modules/`, `dist/`, `.next/` and caches ignored by `.gitignore`. Never push the BRD, the brief or the client folder files: they live outside `code/`. If anything looks sensitive, stop and show the list; fix the ignore rules or remove the file in a new commit, and ask again. The user's own words win if they say a flagged file is fine.
2. `git remote add origin <url>` (or `git remote set-url origin <url>` when one exists), then `git branch -M main` and `git push -u origin main`.
3. Authentication is the user's own git setup (SSH key or the credential manager). If the push asks for sign-in or is refused for authentication, **stop, don't retry in a loop**, and say what to do: run `git push -u origin main` once in a terminal in `code/` and sign in when prompted, or add an SSH key to GitLab, then say "retry".
4. If the remote is **not empty** and the push is rejected, never force-push and never rewrite history. Tell the user the repository already has commits, and ask: use a different empty repository / push to a new branch (`design-automation`) / they will merge it themselves.
5. Save `git_remote` (the link), `git_host: "gitlab"`, `git_push: "auto"` and `git_last_push` (date and short commit id) in the state file.

## After every round

After the Design Agent's commit (`Round <n>: ...`), after the Production check's `Approved` commit, and after each phase: `git push` from `code/` (a normal fast-forward push only). Say one line: *"Pushed round 3 to GitLab (a1b2c3d)."* If a push fails, say why in one line and carry on; the work isn't lost and the next successful push sends everything. Revision rounds that start with local hand edits by the user are not pushed until committed.

## Converted stacks and other folders

A conversion (`code-react/` and so on) is a separate repository: ask for its own empty GitLab link when it is created, or offer to push it to a new branch of the same project (`react-vite`) if the user prefers one place. Never push `share/`, `design-pipeline-state.json`, reference captures or the client folder.

## Rules

- Never ask for, print or store a password, token or key. Never use a token in a URL.
- Never `--force`, never delete remote branches or tags, never push to a repository the user didn't give you in this project.
- The first push needs the user's yes in chat (the answer to the question above); later pushes in the same project follow from it.
- Report the repository link in the final delivery.

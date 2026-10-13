# Hosting the code project on GitLab

The Orchestrator owns this; the Design Agent never pushes. The project's `code/` folder is its own git repository (`code-conventions.md`, "Git"); this file says how it gets a GitLab remote and how rounds are pushed. Host: **gitlab.com**. By default the plugin **creates the GitLab project itself**, with the user's own git sign-in; if the user prefers, they create an empty project and paste its link. The plugin never asks for a password or token and never stores credentials.

## When to ask

Once per project, **right after the first build round returns** (end of Stage 3, before the audit), unless the state file already has `git_remote` or `git_push: "declined"`. A resumed run with `git_remote` set doesn't ask again; it checks the remote still answers (`git ls-remote origin HEAD`) and says so if it doesn't.

Ask with AskUserQuestion: *"Host the code on GitLab?"*
- **Yes, create it for me (Recommended)** — "I create a private project on gitlab.com from your project name and push the code. First time, a sign-in window from git may open: sign in to GitLab there. Tell me the group or username to put it under."
- **Yes, I'll paste the repository link** — "Create an empty project on gitlab.com (no README, no .gitignore, no licence), then paste its link here (`https://gitlab.com/<group>/<project>.git` or `git@gitlab.com:<group>/<project>.git`). I push after each finished round."
- **Not for this project** — save `git_push: "declined"`; the code stays local.

If the user says "Other" with a link, use it. Accept only `gitlab.com` links; for any other host, say the plugin is set up for gitlab.com and ask whether to continue with that host anyway.

## Creating the project (the default)

Needs the **namespace** to create it in: the user's GitLab username or a group path (`my-team` or `my-team/design`). Ask once as free text if it isn't known (it is saved as `git_namespace` and reused by later projects, offered as the default). The project **name** is the project's name as a slug (`acme-onboarding-app`), and its visibility is **private**; ask only if the user wants internal or public, and confirm before creating anything public.

Try these in order, stopping at the first that works:
1. **`glab`** (GitLab's CLI), only if it is installed and signed in (`glab auth status`): `glab repo create <namespace>/<name> --private --defaultBranch main (check `glab repo create --help` for the flags of the installed version)`.
2. **Push to create** (needs no CLI and no token): in `code/`, `git push --set-upstream https://gitlab.com/<namespace>/<name>.git main`. gitlab.com creates a **private** project at that path on the first push when the user may create projects there. Authentication is the user's git sign-in (Git Credential Manager opens a browser window the first time).
3. If both fail, say why in a line (not signed in, no permission in that namespace, the name is taken, push-to-create disabled for the group), and fall back to asking the user to create an empty project and paste its link (below).

Never create a project in a namespace the user didn't name, and never reuse an existing project that already has commits without asking. Check that the path is free first when `glab` is available (`glab repo view <namespace>/<name>`); with push to create, a rejected push on a non-empty project is the same case as step 4 of "First push". Tell the user the link as soon as it exists.

## First push

Before creating or pushing anything (including with the paste option):


1. **Check what would leave the machine** (in `code/`, `git ls-files`): no `.env*` with values, private keys, `*.pem`, credentials or tokens (search the tracked files for `BEGIN PRIVATE KEY`, `api_key`, `secret`, `password=`, `token=`, long random strings), no file over 50 MB, and `node_modules/`, `dist/`, `.next/` and caches ignored by `.gitignore`. Never push the BRD, the brief or the client folder files: they live outside `code/`. If anything looks sensitive, stop and show the list; fix the ignore rules or remove the file in a new commit, and ask again. The user's own words win if they say a flagged file is fine.
2. Created by the plugin: add the remote after creation (`git remote add origin https://gitlab.com/<namespace>/<name>.git`; `set-url` when one exists), `git branch -M main`, and `git push -u origin main` if the creating command didn't already push. Pasted link: add that remote and run `git push -u origin main`.
3. Authentication is the user's own git setup (SSH key or the credential manager). If the push asks for sign-in or is refused for authentication, **stop, don't retry in a loop**, and say what to do: run `git push -u origin main` once in a terminal in `code/` and sign in when prompted, or add an SSH key to GitLab, then say "retry".
4. If the remote is **not empty** and the push is rejected, never force-push and never rewrite history. Tell the user the repository already has commits, and ask: use a different empty repository / push to a new branch (`design-automation`) / they will merge it themselves.
5. Save `git_remote` (the link), `git_namespace`, `git_created_by: "plugin | user"`, `git_host: "gitlab"`, `git_push: "auto"` and `git_last_push` (date and short commit id) in the state file.

## After every round

After the Design Agent's commit (`Round <n>: ...`), after the Production check's `Approved` commit, and after each phase: `git push` from `code/` (a normal fast-forward push only). Say one line: *"Pushed round 3 to GitLab (a1b2c3d)."* If a push fails, say why in one line and carry on; the work isn't lost and the next successful push sends everything. Revision rounds that start with local hand edits by the user are not pushed until committed.

## Converted stacks and other folders

A conversion (`code-react/` and so on) is a separate repository: ask for its own empty GitLab link when it is created, or offer to push it to a new branch of the same project (`react-vite`) if the user prefers one place. Never push `share/`, `design-pipeline-state.json`, reference captures or the client folder.

## Rules

- Never ask for, print or store a password, token or key. Never use a token in a URL. Don't create the GitLab project while the first-push check (secrets, large files) is unresolved.
- Never `--force`, never delete remote branches or tags, never push to a repository the user didn't give you in this project.
- Creating a project and the first push need the user's yes in chat (the answer to the question above, with the namespace and visibility stated); later pushes in the same project follow from it. Never delete or rename a GitLab project.
- Report the repository link in the final delivery.

# Preflight checks

Run these in order at Stage 1. Run check 1 again before the handoff (Stage 5).

Connector tool names differ between machines (claude.ai connectors carry an ID in their name), so find tools by what they do, not by an exact name. Use ToolSearch with keywords like `figma whoami` or `use_figma` if tools are deferred.

## 1. Figma connector — required

- Find the Figma connector's account check tool (`whoami`) and call it.
- **Pass:** it returns the signed-in account. Note the account and available teams/plans.
- **Fail:** no Figma tools, a "needs authentication" error, or the call fails.
  - Tell the user: *"Figma isn't connected. In the Claude desktop app, connect Figma in your connector settings. In a terminal, run `claude` and use `/mcp` to sign in. Then type 'retry'."*
  - If the desktop app's connector tools are available (`session_connectors_status` / `reconnect_session_connector`), check the status and offer to start a reconnect. The user still has to finish the sign-in themselves.
  - You can never complete a sign-in or handle credentials for the user.

## 2. Claude Design — required

- Call the Artifact tool with `action: "quickstart"`, `intent: "design"`.
- **Pass:** the result lists a "Design" Artifact type. Note its `type_url` for the Design Agent.
- **Fail:** no Artifact tool in this session, or no Design type listed.
  - Tell the user: *"Claude Design isn't available in this session. Run the pipeline from the Claude desktop app's Code tab or another environment with Artifacts enabled."*

## 3. Design system — recommended

- From the same quickstart result, look for the design systems it lists.
- **Pass:** at least one design system. If there are several, ask which one belongs to this client. Save its link.
- **Fail:** none listed.
  - Ask: *"No design system is set up in Claude Design. Continue without one (the Design Agent will use neutral styling), or stop so you can set one up?"*
  - Continue only on an explicit "continue".

## Report

Show a short checklist, e.g.

- ✅ Figma — signed in as …
- ✅ Claude Design — available
- ⚠️ Design system — none (continuing without one)

Save the results under `preflight` in the state file.

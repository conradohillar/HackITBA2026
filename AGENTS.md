# Autonomous Execution Rules

- Use `.planning/` artifacts as the source of truth for scope, phase state, and next actions.
- Prefer unattended execution. Choose sane defaults and continue unless a true human-only blocker appears.
- Use `/gsd-autonomous --from 1` to continue the current milestone from the earliest incomplete phase.
- Keep GSD artifacts current. Do not bypass the GSD workflow with ad hoc implementation unless required to unblock the current plan.
- For every frontend, page, route, or user-flow change, use the Playwright MCP configured in `opencode.json` before marking work complete.
- For Playwright verification, cover the main happy path on desktop and mobile widths and fix discovered issues in the same phase when feasible.
- Start any needed local app processes yourself before browser verification; do not ask the user to run servers, builds, or tests.
- Use Supabase MCP and other configured MCP tools when they help validate or implement work.
- Only stop for human-only blockers such as missing secrets, external auth approvals, billing gates, or product decisions that cannot be inferred.
- When a human-only blocker appears, state the exact blocker clearly and preserve progress in the relevant GSD artifacts.

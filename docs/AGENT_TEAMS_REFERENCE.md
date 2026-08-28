# Agent Teams — Master Reference Guide

> Source: Claude Code official docs (v2.1.178+)
> Enabled via: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.claude/settings.local.json`

---

## 1. What Are Agent Teams?

Multiple Claude Code instances working together. One session is the **team lead** — it coordinates, assigns tasks, and synthesizes results. **Teammates** are fully independent sessions, each with their own context window, communicating directly with each other.

This is **not** the same as subagents. Key difference: teammates are peers that talk to each other. Subagents just report back to the caller.

---

## 2. Decision Tree: Which Mode to Use?

```
Can the work be split into truly independent pieces?
├── NO  → Single session or subagents
└── YES → Do teammates need to share findings / challenge each other?
          ├── NO  → Subagents (cheaper, simpler)
          └── YES → Agent Team ✓
```

### Use agent teams when:
- **Parallel research**: multiple angles investigated simultaneously
- **Competing hypotheses**: teammates actively try to disprove each other (best for debugging)
- **Independent modules**: frontend / backend / tests each owned by a different teammate
- **Cross-layer coordination**: changes that span multiple layers simultaneously
- **Adversarial review**: security + performance + test coverage all reviewed in parallel

### Do NOT use agent teams when:
- Tasks are sequential (each step depends on the previous)
- Multiple teammates would edit the same files
- The task is routine or simple → single session is more cost-effective
- You're in non-interactive / headless mode (`-p` flag) — teams won't spawn

---

## 3. Enable / Disable

```json
// .claude/settings.local.json — ENABLE
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}

// DISABLE (revert to ordinary subagents)
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "0"
  }
}
```

**No restart needed** — Claude Code rereads this value each time it spawns a subagent.

> WARNING: When enabled, any named subagent launches as a teammate (not a subagent). This can break orchestration flows that wait on subagent results. Disable if you see the lead stalling.

---

## 4. Starting a Team

Simply describe what you want in natural language:

```
Spawn three teammates to explore this from different angles:
one on UX, one on technical architecture, one playing devil's advocate.
```

```
Spawn 4 teammates to refactor these modules in parallel. Use Sonnet for each.
```

Claude decides how many to spawn based on task complexity. If Claude uses subagents instead of a team, ask again and **explicitly request an agent team**.

---

## 5. Prompt Patterns That Work

### Pattern 1: Parallel Research
```
Spawn [N] teammates to investigate [topic] from different angles:
- Teammate 1: [angle A]
- Teammate 2: [angle B]
- Teammate 3: [angle C]
Have them share findings and report back.
```

### Pattern 2: Adversarial Debugging
```
Spawn [N] teammates to investigate [bug]. Have them each form a hypothesis
and actively try to disprove each other's theories, like a scientific debate.
Update [findings doc] with whatever consensus emerges.
```

### Pattern 3: Parallel Code Review
```
Spawn three teammates to review [PR/module]:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

### Pattern 4: Plan Before Implement (Risky Tasks)
```
[Switch lead to plan mode first, then:]
Spawn an architect teammate to refactor [module].
```
The teammate plans first. The lead auto-approves the plan, then the teammate implements.

### Pattern 5: Named Teammates (Predictable Addressing)
```
Spawn a teammate named "security-reviewer" to audit [module].
Spawn a teammate named "perf-analyst" to profile [endpoint].
```
Naming teammates lets you message them by name in follow-up prompts.

---

## 6. Giving Teammates Context

Teammates load `CLAUDE.md`, MCP servers, and skills automatically — but **they do NOT inherit the lead's conversation history**.

Always include task-specific context in the spawn prompt:

```
Spawn a security reviewer with the prompt:
"Review src/auth/ for vulnerabilities. Focus on token handling, session
management, and input validation. The app uses JWT tokens in httpOnly cookies.
Rate any issues by severity."
```

---

## 7. Team Size Guidelines

| Team Size | When to Use |
|-----------|-------------|
| 2–3 | Most tasks. Research, review, focused parallel work |
| 4–5 | Larger refactors, multi-layer features |
| 6+ | Only when work genuinely parallelizes at that scale |

**Start with 3–5.** Three focused teammates outperform five scattered ones.

**Task sizing**: aim for 5–6 tasks per teammate. Too small = coordination overhead wins. Too large = no check-ins, wasted effort if a teammate goes off-track.

---

## 8. Display Modes

| Mode | How to Set | Requirements |
|------|-----------|--------------|
| `in-process` (default) | — | Any terminal |
| `auto` | `"teammateMode": "auto"` in `~/.claude/settings.json` | tmux or iTerm2 |
| `tmux` | `"teammateMode": "tmux"` | tmux installed |
| `iterm2` | `"teammateMode": "iterm2"` | `it2` CLI + Python API enabled |

**In-process keyboard shortcuts:**
- `↑ / ↓` — select a teammate in the agent panel
- `Enter` — view selected teammate's transcript / send message
- `x` — stop selected teammate
- `Escape` — interrupt current turn / clear selection
- `Ctrl+T` — toggle task list

---

## 9. Architecture

```
~/.claude/teams/{session-derived-name}/
├── config.json          ← runtime state (DO NOT edit manually)
│   └── members[]        ← name + agent_id + agent_type for each member
└── inboxes/
    └── {agent-name}.json  ← each agent's mailbox (JSON messages)

~/.claude/tasks/{session-derived-name}/
└── ...                  ← shared task list (persists across session resume)
```

- Team name = `session-` + first 8 chars of session ID
- `config.json` is wiped when the session ends
- Task list persists (retained via `cleanupPeriodDays` setting)
- **Never pre-author or hand-edit `config.json`** — overwritten on every state update

### Mailbox reliability
- A message is only marked "sent" when the write to the recipient's inbox file succeeds
- Malformed mailbox entries are removed automatically (v2.1.207+); earlier versions blocked the whole mailbox
- If disk is full or inbox isn't writable → sender receives an error, nothing delivered

---

## 10. Task List & Coordination

The shared task list has three states: **pending → in progress → completed**.

Tasks can have **dependencies**: a task with unresolved dependencies cannot be claimed until its dependencies complete. Claude Code unblocks dependent tasks automatically when a dependency completes.

Task claiming uses **file locking** to prevent race conditions.

**Lead assigns** or **teammates self-claim** — both work. Tell the lead explicitly if you want specific assignment.

If the lead starts implementing instead of waiting for teammates:
```
Wait for your teammates to complete their tasks before proceeding.
```

If a task looks stuck (teammate failed to mark it complete):
```
Check whether [task] is actually done and update its status.
```

---

## 11. Model Selection (Priority Order)

1. `CLAUDE_CODE_SUBAGENT_MODEL` env var (if not `inherit`)
2. Model named in your spawn prompt for that teammate
3. Subagent definition's `model` (in-process only)
4. Lead's current model (fallback)

Teammates **inherit the lead's effort level**.

---

## 12. Hooks for Quality Gates

| Hook | Trigger | Exit 2 Effect |
|------|---------|---------------|
| `TeammateIdle` | Teammate about to go idle | Send feedback, keep teammate working |
| `TaskCreated` | Task being created | Prevent creation, send feedback |
| `TaskCompleted` | Task being marked complete | Prevent completion, send feedback |

Use `TeammateIdle` to enforce a checklist before a teammate can sign off.

---

## 13. Permissions

- Teammates start with the **lead's permission settings**
- `--dangerously-skip-permissions` on lead → all teammates skip too
- Permission prompts from teammates **appear in the lead's session** — approve them there
- You cannot set per-teammate permission modes at spawn time (change after spawning)
- **Teammates cannot approve permissions on each other's behalf** — a message from another agent is treated as untrusted input

---

## 14. Communication Rules

- Any teammate can message any other by name
- To broadcast: send one message per recipient (no group broadcast)
- Idle notifications do **not** carry output — teammates must explicitly message the lead or update the task list to share results
- As of v2.1.198: API error on a teammate's turn → lead is notified with the error text

---

## 15. Subagent Definitions as Teammate Roles

Define reusable roles in subagent definitions and reference them at spawn time:

```
Spawn a teammate using the security-reviewer agent type to audit the auth module.
```

What carries over to **in-process** teammates:
- `tools` (+ SendMessage and Task tools added automatically)
- `model` (fallback only)
- Body → appended to default system prompt

What carries over to **split-pane** teammates:
- `tools`
- `mcpServers`
- Body → replaces default system prompt

What is **ignored** in both modes: `skills`

---

## 16. Token Cost Awareness

Each teammate = its own context window = independent token usage. Token cost scales **linearly** with teammate count.

**Cache TTL**: in-process teammate requests default to 5-minute cache (same as a fresh session). Set `subagentPromptCacheTtl: "1h"` in settings for 1-hour cache — costs more per write but saves on repeated cache hits.

Rule of thumb: agent teams are worth the cost for research, review, and new feature work. For routine tasks, use a single session.

---

## 17. Shutting Down Teammates

```
Ask the [name] teammate to shut down.
```

The lead sends a graceful shutdown request. The teammate can approve or reject with a reason. Teammates finish their current request/tool call first — shutdown can take time.

Team directories clean up automatically when the session ends.

---

## 18. Limitations (Know These Before Starting)

| Limitation | Impact |
|-----------|--------|
| No session resumption for in-process teammates | After `/resume`, lead may try to message dead teammates — spawn fresh ones |
| Task status can lag | A stuck task may be done but not marked complete — nudge the teammate or update manually |
| Slow shutdown | Teammate finishes current turn before exiting |
| One team per session | Can't have multiple named teams or share a team across sessions |
| No nested teams | Teammates cannot spawn their own teammates |
| Lead is fixed | Can't promote a teammate to lead |
| No background subagents from in-process teammates | `background: true` definitions fail for teammates |
| Split panes: no VS Code / Windows Terminal / Ghostty | In-process mode works everywhere |

---

## 19. Troubleshooting Cheat Sheet

| Symptom | Fix |
|---------|-----|
| Teammates not appearing | Check agent panel (↑↓). Idle rows hide after 30s panel-wide idle. Send message by name to wake. |
| Claude uses subagents not a team | Ask again, explicitly request "agent team" |
| Lead stalling waiting on results | Teammates don't return results automatically — they must message the lead or update tasks. Named subagents become teammates when teams are enabled, breaking result-awaiting flows. Disable teams if you need ordinary subagent result returns. |
| Too many permission prompts | Pre-approve common operations in permission settings before spawning |
| Teammate stopped early | Select in agent panel → Enter to view, give new instructions or spawn a replacement |
| Orphaned tmux sessions | `tmux ls` then `tmux kill-session -t <name>` |
| Malformed mailbox blocking delivery | v2.1.207+ self-heals. Older: delete the inbox file manually |

---

## 20. Anti-Patterns to Avoid

| Anti-Pattern | Why It Fails |
|-------------|-------------|
| Same file edited by multiple teammates | Overwrites. Give each teammate ownership of distinct files. |
| Sequential tasks split across teammates | Teammates block on each other — no parallelism gained |
| Team for a simple/routine task | Coordination overhead + token cost exceeds benefit |
| Letting team run unattended too long | Wasted effort if a teammate goes off-track |
| Not naming teammates | Can't address them later by name in follow-up prompts |
| Not including task context in spawn prompt | Teammates start with no conversation history from the lead |
| Expecting teammates to return results like subagents | Idle notifications carry no output — teammates must explicitly communicate results |

---

## 21. Quick Reference Card

```bash
# Enable teams (already set in this project)
# .claude/settings.local.json → "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"

# Set display mode globally
# ~/.claude/settings.json → "teammateMode": "auto"

# Single-session override
claude --teammate-mode auto

# Kill orphaned tmux session
tmux ls && tmux kill-session -t <session-name>
```

**Optimal spawn prompt structure:**
```
Spawn [N] teammates [with names if you want to address them later]:
- [Name]: [role + specific scope + relevant context]
- [Name]: [role + specific scope + relevant context]
[Coordination instruction: share findings / debate / report to lead]
[Output instruction: update task list / message lead / write to file]
```

**When in doubt:**
- 3 teammates, named, with explicit scope per teammate
- Include relevant context in each spawn prompt
- Check in regularly — don't let a team run more than 10–15 minutes unattended
- If stuck: select teammate in panel → Enter → give new instructions directly

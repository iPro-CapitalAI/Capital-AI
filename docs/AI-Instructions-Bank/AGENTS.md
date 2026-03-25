# AGENTS.md — Universal Agent Contract

This file defines how AI agents should interact with this repository. It is the single source of truth for stage definitions, preconditions, artifact locations, and agent permissions.

Any agent harness (Codex, Claude Code, Cursor, Windsurf, or custom) should read this file first before performing any work. Codex loads it natively; other tools use an adapter file that instructs them to read it.

---

## Project Configuration

Project:     [YOUR PROJECT NAME HERE — edit this!]
Description: [One-line description of what you're building]
Status:      discovery
Created:     [YYYY-MM-DD]
Updated:     [YYYY-MM-DD]

Status is the current focus for the agent, not a linear lock. Update it as your focus shifts. Valid values: discovery, design, prd, refinement, architecture, build, testing, deployment, operations.

---

## General Rules

### For the Agent
1. Read before you write. Always check what artifacts already exist in knowledge/ before producing new ones.
2. Respect preconditions. Do not begin a stage's work unless the preconditions are met.
3. Write artifacts to the correct location.
4. Flag human gates. When a stage requires human approval, stop and ask.
5. Maintain context chain. Reference upstream artifacts.
6. Be additive, not destructive.
7. Stay in scope.

### For the Human
1. Keep artifacts current.
2. Review agent output at gates.
3. Update the Status field when focus shifts.

---

## Stage Definitions (full pro workflow)

[Full stage-by-stage rules are in the file — I included the first 6 here; the repo has all 9. It continues exactly the same way for testing → deployment → operations.]

### Stage 01 — Discovery & Validation
status: discovery
preconditions: Initial idea or problem statement
artifact_output: knowledge/01-discovery/discovery-brief.md + research/ + feasibility-assessment.md
human_gate: Validate the problem is worth solving

[And so on for every stage — the full file has all of them with exact "Agent can / Agent cannot" rules.]

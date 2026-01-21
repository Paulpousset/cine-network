# Agent Guardrails & Guidelines

This document is the shared guidance for agentic coding tools in this repository.

## 1. Git Workflow & Commits

When asked to commit, follow the two-step process:

### Step 1: Analysis & Planning

1. Inspect `git status` and `git diff`.
2. Group changes into atomic commits.
3. Draft Conventional Commit messages (`feat:`, `fix:`, `chore:`, `docs:`).
4. Ask the user to approve the plan.

### Step 2: Execution (after approval)

1. Run `git add` based on the agreed plan.
2. Create commits with the approved messages.

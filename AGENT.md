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

## 2. Documentation Standards

- **README Generation:** When asked to create or update `README.md`, strictly adhere to professional standards (e.g., [Make a README](https://www.makeareadme.com/) and [GitHub Docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)).
- **Structure:** Ensure the file includes at minimum:
  - **Title & Description:** A clear, concise explanation of what the project does and why it exists.
  - **Installation:** Accurate steps reflecting the project's actual tooling
  - **Usage:** Concrete examples or code snippets showing how to run the project.
  - **Roadmap/Status:** Current state of the project
  - **License:** The project's license status.
- **Accuracy:** Always analyze the codebase (`package.json`, `mise.toml`, `go.mod`, etc.) _before_riting to ensure installation commands and dependency lists are factual, not hallucinated.

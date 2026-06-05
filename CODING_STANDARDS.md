# Coding Standards

Organization-wide coding standards for all EPPLMS repositories. These are **language-agnostic** and apply to every repo generated from this template. Stack-specific style guides (TypeScript/React for the Next.js frontend, Go for the backend microservices) are added by the respective language templates and linked from [Per-language standards](#per-language-standards).

## Commit messages

Follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>[optional scope]: <description>
```

- **Types:** `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`.
- Use the imperative mood ("add", not "added").
- Example: `feat(auth): add Google OAuth login`.

The `commit-msg` hook in [lefthook.yml](lefthook.yml) enforces this locally.

## Branching

Follow the GitLab-flow model documented in the [README](README.md): environment branches (`main`/`staging`/`production`) are integration-only and protected; all work happens on `feature/`, `bugfix/`, or `hotfix/` branches merged via pull request. The `branch-name` hook enforces the naming.

## Formatting

- Every repo **must** run an autoformatter and a linter, wired into both the pre-commit hook and CI. The specific tools are stack-specific and defined by the language template.
- Do not hand-format code that a formatter owns; never disable a lint rule without a comment explaining why.

## Naming & structure

- Names describe intent; avoid abbreviations and single-letter names outside short loops.
- Keep functions small and single-purpose; prefer composition over deeply nested logic.
- Match the conventions of the surrounding code and the language guide.

## Comments & documentation

- Comment the _why_, not the _what_. Code should be self-explanatory for the _what_.
- Document public APIs, exported symbols, environment variables, and non-obvious setup.

## Pull requests

- Keep PRs small and focused on a single concern; split unrelated work.
- Fill in the [pull request template](.gitea/pull_request_template.md).
- Open the PR against the correct environment branch and keep it up to date with the target.

## Code review

Reviews are required. See the Code Review Workflow in the [README](README.md).

- **Authors:** keep changes reviewable, describe intent, respond to every comment, and don't merge until approved and green.
- **Reviewers:** review promptly, be specific and respectful, distinguish blocking issues from suggestions (prefix non-blocking comments with `nit:`), and approve only when the change meets the Definition of Done.

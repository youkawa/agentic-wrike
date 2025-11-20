# Development Guidelines

## Communication
- All outputs in Japanese
- Response structure: Conclusion → Rationale → Next Action
- Mark uncertainties explicitly as `Assumptions:`

## Design Principles
- SOLID: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- DRY: Eliminate duplication, prioritize reusability
- YAGNI: Don't implement unrequested features

## Implementation Approach
- Minimal changes to complete tasks
- Prioritize maintainability, reproducibility, security
- Breaking changes require explicit approval
- Prefer TDD/BDD

## Git Workflow
- `main` branch always deployable
- Feature branches: `feat/*` or `fix/*`
- Conventional Commits: `<type>(<scope>): <subject>`
  - Example: `feat(api): add token refresh guard`
- Small, atomic commits with clear intent

## Code Quality (Mandatory)
After any changes, verify all pass:
- `npm test`
- `npm run lint`
- `npm run typecheck`

## Security
- Never commit secrets, API keys, or tokens in plain text
- Never use real values in examples
- Mask PII appropriately

## Pull Request Guidelines
- Title: Conventional Commits format
- All checks (lint/type/unit) must pass
- Include: change description, reproduction steps, impact scope
- 1 PR = 1 purpose
- Split large changes into smaller PRs

## Prohibited Actions
- Bypassing commit hooks with `--no-verify`
- Temporary "hack" fixes
- Hiding problems without fixing root cause
- Vague descriptions (use specific commands/configurations)
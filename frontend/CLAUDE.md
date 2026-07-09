# Zubite.bg Development Rules

Zubite.bg is a Bulgarian dental decision platform, not a clinic and not a generic directory.

Before editing:
1. Inspect the relevant routes, components, state, API calls, and database assumptions.
2. Explain the current implementation.
3. Propose the smallest safe change.
4. Wait for approval before making structural changes.
5. Do not change schemas, auth, environment variables, production config, or routing logic without explicit approval.

Core product rules:
- Do not imply medical diagnosis.
- Do not claim clinics are “best” unless supported by explicit platform rules.
- Sponsored visibility must stay separate from organic/relevance-based matching.
- Patient clarity and trust matter more than short-term conversion.
- Preserve existing quiz, results, clinic recommendation, patient calendar, clinic dashboard, and admin flows unless specifically asked to change them.

Technical rules:
- Prefer small reversible changes.
- Do not edit .env or .env.local.
- Do not commit secrets.
- Run lint/build after changes where possible.
- Explain any failing test or build honestly.
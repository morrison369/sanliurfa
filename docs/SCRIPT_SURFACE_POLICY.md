# Script Surface Policy

The repository exposes two script layers.

## Runner-First Commands
These are the only commands operators should treat as the primary interface:
- `npm run test:phase:range -- <range>`
- `npm run test:phase:batch -- <range-a> <range-b> <range-c>`
- `npm run phase:prepare:block:preferred -- --phase-script test:phase:<range>`
- `npm run phase:prepare:batch:preferred -- --phase-script test:phase:<range-a> --phase-script test:phase:<range-b>`
- `npm run phase:doctor`
- `npm run phase:changelog:normalize`
- `npm run phase:scripts:report`

## Compatibility Surface
- `test:phase:<range>` entries exist so generated phase blocks remain directly invokable.
- They are compatibility surface, not the preferred operator interface.
- New docs, handoff notes, and runbooks should reference runner-first commands, not individual `test:phase:<range>` commands.

## Reduction Policy
- Do not add new top-level operator docs that depend on individual `test:phase:<range>` scripts.
- Keep the compatibility surface until the generator and runner can remove it safely.
- Review the current script count with `npm run phase:scripts:report`.

## Change Policy
- Script surface changes belong in dedicated ops PRs, not mixed into dependency-only PRs unless the change is needed for validation.

Final residual refresh verification for the dirty root worktree.

Verification outcome:
- source patch replay: not performed
- clean source of truth: `origin/master`
- dirty root role: inventory only

Validation used to support the decision:
- `git -C D:\sanliurfa.com\sanliurfa status --short`
- `git -C D:\sanliurfa.com\sanliurfa diff --name-only`
- clean worktree batch validation for `1019-1036`
- `npm run build`

Conclusion:
- the remaining modified runtime/webhook/pages buckets should stay archived as residual inventory
- no additional cleanup PR is required unless a specific file is intentionally recovered

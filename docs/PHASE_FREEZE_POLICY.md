# Phase Freeze Policy (Release Mode)

Release kapanış modunda yeni phase üretimi varsayılan olarak kilitlidir.

## Kilit Kaynağı
- `config/release-mode.json`
- `phaseMutationsBlocked: true`

## Etkilenen Komutlar
- `phase:generate:block`
- `phase:generate:block:write`
- `phase:bootstrap:worktree`
- `phase:prepare:block`
- `phase:prepare:batch`
- `phase:pr:open`
- `phase:pr:open:file`
- `phase:sync:status`

Bu komutlar önce `phase:guard:mutable` çalıştırır.

## Acil Durum Override
Sadece kontrollü acil durumda:

```bash
set ALLOW_PHASE_MUTATIONS=true
```

Bu override sadece o oturum için kullanılmalı, iş bitince kaldırılmalıdır.

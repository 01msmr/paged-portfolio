# Branch cleanup (home screen icon work)

The icon work is merged into `main` (`6a90b47`, docs in `948d950`). These remote branches are obsolete and can be deleted:

| Branch | What it was |
|---|---|
| `dark-touch-icons` | transparent paper plus white letter outline (merged, then replaced) |
| `dark-bg-icon` | back to the original opaque icon |
| `transparent-bg` | transparent paper, iOS fills it black in both modes |
| `icon-pair` | light/dark pair swapped by script |
| `grey-paper` | the final solution: opaque grey paper, now in `main` |

Not part of this: `fix/audit-2026-10` stays.

## Steps

1. Check that nothing is lost: `git fetch origin && git branch -r --no-merged origin/main`. Only `fix/audit-2026-10` should be listed, plus the four icon experiments that were never merged (`dark-touch-icons` and `dark-bg-icon` were merged earlier; `transparent-bg`, `icon-pair` are superseded by `grey-paper`).
2. Delete them on GitHub, either:
   - in the browser: Repository → Branches → trash icon per branch, or
   - from a shell with push rights: `git push origin --delete dark-touch-icons dark-bg-icon transparent-bg icon-pair grey-paper`
3. Clean up locally: `git fetch --prune origin`
4. Check: `git branch -r` shows `origin/main` (and `origin/fix/audit-2026-10`).
5. Delete this file again: `git rm docs/branch-cleanup.md`, commit and push.

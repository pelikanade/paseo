---
name: upstream-fork-sync
description: Sync this personal paseo fork with upstream main — rebase the personal commits onto the newest upstream HEAD and force-push, folding any adaptation upstream forced into the personal commit that owns it. Use when the user says "sync upstream", "sync the fork", "update the fork", "pull upstream changes", or "rebase onto upstream".
user-invocable: true
---

# Upstream fork sync

This checkout is a personal fork of `getpaseo/paseo`:

- `origin` → `pelikanade/paseo` — the fork. The only push target.
- `upstream` → `getpaseo/paseo` — the source of truth. Fetch, never push.

## The invariant

`main` is `upstream/main` HEAD plus n personal commits, in a linear history: no
merge commits, no fixup commits, no commit that exists only to repair an earlier
one.

Personal commits are never contributed upstream and are never dropped. A sync
relocates them onto the new upstream HEAD and changes nothing about what they do
beyond what upstream forced.

## When upstream moved under a personal commit

Upstream renaming a file, deleting a helper, or changing a token a personal
commit touches surfaces either as a rebase conflict or as a type error after
one. Fold the adaptation into the personal commit that owns it. A rebase does
this for free: each resolution lands in the commit being replayed.

Never add a "fix after upstream sync" commit, never merge two personal commits
into one or split one in two, never resolve a conflict by taking upstream's side
and dropping the personal behavior, and never drop a personal commit because
porting it looks expensive. Report and stop instead.

## Procedure

1. Start from a clean tree. `git status --short` must be empty. Stash or stop.
2. `git fetch upstream --prune && git fetch origin --prune`
3. Read the shape before touching anything:
   - base: `git merge-base upstream/main main`
   - personal commits: `git log --oneline upstream/main..main` — this is n
   - `git cherry -v upstream/main main`: `+` means genuinely personal, `-` means
     upstream already carries that patch, so the commit is no longer personal.
     Stop and ask before dropping a `-` commit.
   - `git log --oneline upstream/main -3` — how far upstream moved
4. Back up: `git branch backup/pre-sync-$(date +%F) main`
5. `git rebase --onto upstream/main <base> main`
6. Resolve each conflicted commit inside its own intent, `git add`,
   `git rebase --continue`. `git rebase --abort` while the result is still wrong
   is free; after the push it is not.
7. Verify, in this order:
   - `git rev-list --count upstream/main..main` → n, and
     `git log --oneline upstream/main..main` → the same commits, same order
   - `git range-diff <base>..<backup> upstream/main..main` → only the
     conflict-forced adaptations as changes
   - `npm run typecheck` and `npm run lint`
   - run the surface each personal commit touches. A green typecheck does not
     prove a translucent surface still reads or a timeline row still joins.
8. `git push --force-with-lease origin main`. Keep the backup branch until the
   user confirms, then delete it.

## Leave alone

Side branches from earlier porting attempts (`port-*`, `copy-*`, `feat/*` with
`origin/...: gone`, anything sitting on the old base) are leftovers. Do not
rebase, delete, or push them. Name them in the report so the user can decide.

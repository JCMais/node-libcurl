---
name: prep-release
description: Prepare node-libcurl for a release — merge develop into master, decide the version bump, and convert the [Unreleased] CHANGELOG section into a dated version section. Use whenever Jonathan asks to "prep a release", "prepare a release", "do release prep", "merge develop into master", "cut a release", "ship a new version", or anything similar in this project. Also use when he says "we're shipping vX.Y.Z" or asks for help deciding what version number to use for the next release. Do NOT bump the package.json version and do NOT create tags — the release workflow handles those.
---

# Prep Release (node-libcurl)

This project uses a master/develop branching model. Active work lands on `develop`. To release, develop is merged into `master`, and a CI workflow (`build-and-release.yaml`) builds prebuilt binaries and publishes them when a tag is pushed.

**Your job here is the human-readable part of that flow**: getting master pointed at the right commit and converting the accumulated `[Unreleased]` changelog notes into a dated version section. The release workflow handles `package.json` version bumps and the git tag — don't touch those.

## The workflow

### 1. Pre-flight

Confirm intent and check the working tree:

```bash
git status
git fetch origin
git log --oneline origin/develop ^origin/master
```

That last command lists every commit on develop that hasn't reached master yet — i.e., everything that's about to ship. Read through it. You'll need this both for the version-bump call and to make sure the CHANGELOG actually mentions everything important.

### 2. Reconcile master with the remote

Local master is often stale on Jonathan's machine because the release workflow updates it on the remote. Don't merge develop into a stale local master and push that mess — first sync:

```bash
git checkout master
git log master --not origin/master --oneline  # any local-only commits?
```

If local master has commits not on origin/master, **look at them before touching anything**:
- `chore: prepare release X.Y.Z` or `fix: version fix` style commits with `[skip ci]` are leftover prep-release attempts — safe to `git reset --hard origin/master`
- Anything else: stop and ask Jonathan what they are

If everything is fine and you just need to fast-forward:
```bash
git reset --hard origin/master
```

### 3. Decide the version bump

Look at the commits from step 1 and at the current `[Unreleased]` block in `CHANGELOG.md`. Use semver:

- **Patch (X.Y.Z+1)** — only when every change is a bug fix that doesn't alter the public API or any observable behavior contract for existing code. CI/build infrastructure fixes alone are patch-worthy.
- **Minor (X.Y+1.0)** — any of these, even if everything else is just a bug fix:
  - **New runtime/platform support shipped as prebuilt binary.** Adding a Node.js major (e.g., Node 26) is the textbook minor for native addons: users on the new runtime couldn't use the old version at all, and now they can. This is the most common reason this project goes minor instead of patch.
  - New public API surface (exported function, type, constant, method).
  - Observable behavior change in existing API — including a "bug fix" that changes the value a getter returns or the timing of a callback. Code written against the broken behavior will see a different result.
  - Documented contract change (e.g., examples in TSDoc now show a different API call that consumers may have copy-pasted).
- **Major** — breaking changes (removal/rename of public API, incompatible behavior changes that aren't bug fixes, etc.).

When the call is borderline, **lean minor**. Patch in this ecosystem signals "rebuilt with no consumer-visible changes" — anything beyond that deserves the bump.

Tell Jonathan which version you're proposing and why, and let them confirm before continuing. The version they pick drives the rest of the workflow.

### 4. Merge develop into master

```bash
git merge origin/develop --no-ff -m "Merge branch 'develop' into master for vX.Y.Z"
```

`--no-ff` keeps a merge commit so the release boundary is visible in the history. The release workflow expects this shape.

### 5. Update CHANGELOG.md

Two edits in the same commit:

**A. Convert the `[Unreleased]` section into a dated version.** Find this block at the top:
```markdown
## [Unreleased]

### Breaking Change

### Fixed
- ...accumulated bullets...

### Added
- ...

### Changed
- ...
```

Split it: insert a fresh empty `[Unreleased]` block above (with all four subsections, even if empty — keeps the diff for the next release minimal), and rename the original to the dated version header:

```markdown
## [Unreleased]

### Breaking Change

### Fixed

### Added

### Changed

## [X.Y.Z] - YYYY-MM-DD

### Fixed
- ...accumulated bullets...

### Added
- ...

### Changed
- ...
```

Use today's actual date (check `date +%Y-%m-%d` if unsure).

**B. Before committing, look for changes that landed since the last release but never got a changelog line.** Run `git log v<previous>..HEAD --oneline` and scan for things like CI fixes, dependency bumps, or build-script changes that the author skipped because they thought of them as "not user-facing." Some of them *are* user-facing in practice — e.g.:
- A CI fix that unblocks a platform that was failing to publish (users on that platform feel it).
- A node-gyp / node-pre-gyp bump that changes what compilers are detected when users build from source.
- A container image bump in the build matrix.

If you find any, add them to the appropriate section of the new `[X.Y.Z]` block. Don't pad — just capture what a user might care about.

**C. Update the compare links at the bottom of the file.** Find:
```markdown
[Unreleased]: https://github.com/JCMais/node-libcurl/compare/v<previous>...HEAD
[<previous>]: ...
```

Bump it to:
```markdown
[Unreleased]: https://github.com/JCMais/node-libcurl/compare/vX.Y.Z...HEAD
[X.Y.Z]: https://github.com/JCMais/node-libcurl/compare/v<previous>...vX.Y.Z
[<previous>]: ...
```

It's easy to forget the second edit and the bottom link will silently rot — always do both.

### 6. Commit (do not push, do not tag)

```bash
git add CHANGELOG.md
git commit -m "chore: prepare CHANGELOG for vX.Y.Z release"
```

Then **stop and tell Jonathan what's staged**. Show them the log of what's about to be pushed (the merge commit + the changelog commit). Do not push without explicit go-ahead — they sometimes want a final look first.

When they say push: `git push origin master`.

### 7. Don't do these things

- **Don't bump `package.json`'s `version` field.** The release workflow (`build-and-release.yaml`) handles that.
- **Don't create or push a tag.** Same — the workflow handles it when master moves.
- **Don't push develop.** Only master gets pushed in this flow.
- **Don't merge with `--ff-only` or squash.** The release boundary needs to be a real merge commit.

## Why the workflow has this exact shape

A few things in here look fussy until you've seen them break:

- **`git fetch` before checking master state** — a stale local view causes you to overwrite remote progress.
- **Insisting on an empty `[Unreleased]` block** — keeps the diff for the next release small; the next prep-release just fills it in. Without this, the next person has to remember to recreate the four subsections.
- **Reviewing commits before writing the version section** — the `[Unreleased]` block is whatever the contributors remembered to write. Things that landed in CI-fix or dep-bump commits often *aren't* in there but matter for users.
- **Patch vs minor on platform support** — Node.js majors in particular: a user on Node 26 trying to install v5.0.2 gets nothing (no ABI 145 binary). When that user shows up post-release saying "does this even support Node 26?", you want the answer to be "yes, since v5.1.0," not "yes since v5.0.3, technically." The version number is part of the user-facing answer.

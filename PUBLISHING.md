# Publishing `@touheed/pwgen`

How to ship the CLI to npm (the main place) and a few alternatives. All commands
run from `packages/pwgen-cli/`.

---

## 0. Pre-flight checklist

```bash
nvm use                 # Node 20+
npm ci || npm install   # clean deps
npm run lint            # tsc --noEmit, must pass
npm test               # 21 tests, must pass
npm run build          # compiles src → dist (publish ships dist/, not src/)
npm pack --dry-run     # preview EXACTLY what gets published
```

`npm pack --dry-run` should list only `dist/`, `wordlists/`, `README.md`,
`package.json` (controlled by the `files` field). If you see `src/` or
`node_modules/`, fix `files` before publishing.

> `prepublishOnly` already runs `npm run build` automatically on publish, so the
> compiled output is always fresh.

---

## 1. Publish to npm (primary)

### One-time setup
- Create an npm account at https://www.npmjs.com/signup.
- The `@touheed` scope must exist (create the org/your username scope on npm).
- Log in locally:
  ```bash
  npm login            # or: npm login --auth-type=web
  npm whoami           # confirm you're logged in
  ```
- Enable 2FA (recommended) — you'll enter an OTP when publishing.

### Publish
A scoped package (`@touheed/...`) is **private by default**, so you must pass
`--access public` the first time:

```bash
npm publish --access public
# with 2FA:
npm publish --access public --otp=123456
```

Optional supply-chain hardening (signs where it was built):
```bash
npm publish --access public --provenance
```
(Provenance works from CI like GitHub Actions; locally it may warn — that's fine.)

### Verify
```bash
npm view @touheed/pwgen           # registry metadata
npx @touheed/pwgen --version      # run it straight from npm
npx @touheed/pwgen -l 24
```

---

## 2. Releasing updates (versioning)

Never republish the same version — bump first. `npm version` updates
`package.json` and makes a git commit + tag:

```bash
npm version patch     # 0.1.0 → 0.1.1   (bug fixes)
npm version minor     # 0.1.0 → 0.2.0   (new features, backwards-compatible)
npm version major     # 0.1.0 → 1.0.0   (breaking changes)
npm publish --access public
git push --follow-tags
```

### Pre-releases / beta channel
```bash
npm version prerelease --preid=beta      # 0.2.0 → 0.2.1-beta.0
npm publish --tag beta --access public    # users get it via @beta, not @latest
# install: npm i -g @touheed/pwgen@beta
```

### Fixing mistakes
- **Unpublish** is only allowed within 72 hours and is discouraged:
  `npm unpublish @touheed/pwgen@0.1.0`
- Prefer **deprecate** instead:
  `npm deprecate @touheed/pwgen@0.1.0 "use 0.1.1"`

---

## 3. Alternative: GitHub Packages (npm-compatible registry)

Good if you want it tied to a GitHub repo (can be public or private).

`.npmrc` in the package (scope → GitHub registry):
```ini
@touheed:registry=https://npm.pkg.github.com
```
Then:
```bash
npm login --registry=https://npm.pkg.github.com   # username = GitHub user, password = a PAT with write:packages
npm publish
```
Consumers install with the same `.npmrc` line pointing the `@touheed` scope at
GitHub. (You can publish to npm **or** GitHub Packages, but the same
name+version can't live in both as "the" source — pick npm as primary.)

---

## 4. Alternative: GitHub Releases (no registry)

Attach the tarball so people can install without npm:
```bash
npm pack                                   # → touheed-pwgen-0.1.0.tgz
gh release create v0.1.0 touheed-pwgen-0.1.0.tgz \
  --title "pwgen 0.1.0" --notes "First release"
```
Install from the tarball:
```bash
npm i -g https://github.com/<you>/<repo>/releases/download/v0.1.0/touheed-pwgen-0.1.0.tgz
```

---

## 5. Optional: JSR (jsr.io)

A modern TypeScript-first registry (works with npm/Deno/Bun). Needs a `jsr.json`
with name/version/exports; then:
```bash
npx jsr publish
```
Nice-to-have, not required — npm reaches the most users.

---

## 6. Optional: Homebrew (advanced)

For a `brew install pwgen` experience you'd publish a tap with a formula that
either wraps the npm package or a packaged binary. This is extra maintenance;
skip unless there's demand. (Tools like `pkg`/`bun build --compile` can produce
a standalone binary to attach to a GitHub Release first.)

---

## Recommended path

1. **npm** with `--access public` — the one that matters.
2. Tag the release on GitHub (`npm version` already creates the git tag; just
   `git push --follow-tags`).
3. Everything else is optional reach.

After publishing, link it from the site footer / README: the published CLI is a
strong trust signal next to the open-source core.

# @scwar/nestjs-seeker

NestJS search package: indexing, search and suggestions, with pluggable storage adapters (in-memory, filesystem, S3, GCS, Azure, Redis).

## Layout
- `src/seeker.module.ts`, `src/seeker.service.ts`: the module and service entry points
- `src/engine/`, `src/indexers/`, `src/index-manager.ts`: indexing and search core
- `src/storage/`: storage adapters
- `src/decorators/`: indexable and searchable field decorators
- `src/index.ts`: public exports. Anything added here is public API.

## Commands
- `npm run build`: run the `tsc` build
- `npm test` / `npm run test:cov` / `npm run typecheck` (Vitest; type-checks tests)
- `npm run lint`, `npm run format`
- Release: `npm run release:{patch|minor|major|auto}`. Only when asked.

## Workflow (required)
1. **Build every new feature with ponytail.** Invoke the `ponytail:ponytail` skill before writing code. Reuse what already exists in `src/` and don't add dependencies or abstractions nobody asked for.
2. **Review before calling a feature done.** Run these in order:
   - `/code-review` to check correctness
   - `/ponytail-review` to find over-engineering
   - `/security-review`, always for storage adapters, cloud credentials, file paths, or user-supplied queries
   - `/simplify` if the reviews turn up cleanup work
3. **Test.** Add or update Vitest tests in `test/`. `npm run build && npm test && npm run typecheck && npm run lint` must pass.
4. A feature is done only when all three steps pass. Report any step that was skipped or failed.

## Other useful skills
- `engineering:testing-strategy`: plans test coverage for larger features
- `engineering:debug`: structured debugging
- `ponytail:ponytail-audit`: audits the whole repo for bloat
- `ponytail:ponytail-debt`: lists deferred `ponytail:` shortcuts

## Conventions
- Conventional commits (`feat:`, `fix(scope):`, `chore:`). Update `CHANGELOG.md` for user-facing changes.
- Breaking changes to exports in `src/index.ts` need a major version bump.

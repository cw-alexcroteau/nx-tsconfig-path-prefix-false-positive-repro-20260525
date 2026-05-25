# Nx tsconfig path prefix false-positive repro

This is a minimal static reproduction for the sibling-root false positive fixed by [nrwl/nx#35786](https://github.com/nrwl/nx/pull/35786).

## Bug

When `getTouchedProjectsFromTsConfig` checks whether a changed tsconfig path belongs to a project, the stock logic uses `normalizedPath.startsWith(root)`. That incorrectly treats sibling roots that only share a string prefix as matches.

In this repro:

- `ts-cdk` has root `libs/typescript/cdk`
- `ts-cdk-utils` has root `libs/typescript/cdk-utils`
- only the `@proj/cdk-utils` path mapping changes

Stock behavior incorrectly reports both projects as touched because `libs/typescript/cdk-utils/...` starts with `libs/typescript/cdk` as a raw string.

Fixed behavior only reports `ts-cdk-utils`.

## Run locally

Requirements:

- Node `22.22.3`
- pnpm `11.2.2`

Install and run:

```bash
corepack enable
pnpm install
pnpm run repro:compare-touched-projects
```

The script imports the stock `getTouchedProjectsFromTsConfig` implementation from the installed `nx` package and compares its output with the same logic using the one-line boundary fix from `nrwl/nx#35786`.

Expected report shape:

```json
{
  "stockAffectedUnique": ["ts-cdk", "ts-cdk-utils"],
  "patchedAffectedUnique": ["ts-cdk-utils"],
  "stockHasFalsePositive": true,
  "patchedMatchesExpectation": true
}
```

The command exits non-zero if the repro stops showing the stock false positive or if the fixed logic no longer narrows the result to `ts-cdk-utils`.

## CI proof

GitHub Actions runs the same command on Linux and Windows and uploads the JSON report as an artifact.
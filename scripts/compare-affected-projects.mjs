import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const repoRoot = new URL('..', import.meta.url);
const rootPath = path.resolve(repoRoot.pathname);
const baselinePath = path.join(rootPath, 'scenarios', 'tsconfig.only-cdk-utils.json');
const changedPath = path.join(rootPath, 'scenarios', 'tsconfig.with-prefix-false-positive.json');
const { jsonDiff } = require('../node_modules/nx/dist/src/utils/json-diff.js');
const {
  getTouchedProjectsFromTsConfig,
} = require('../node_modules/nx/dist/src/plugins/js/project-graph/affected/tsconfig-json-changes.js');

const baselineTsconfig = JSON.parse(readFileSync(baselinePath, 'utf8'));
const changedTsconfig = JSON.parse(readFileSync(changedPath, 'utf8'));
const changes = jsonDiff(baselineTsconfig, changedTsconfig);
const graph = {
  nodes: {
    'ts-cdk': {
      name: 'ts-cdk',
      type: 'lib',
      data: {
        root: 'libs/typescript/cdk',
      },
    },
    'ts-cdk-utils': {
      name: 'ts-cdk-utils',
      type: 'lib',
      data: {
        root: 'libs/typescript/cdk-utils',
      },
    },
  },
};
const touchedFiles = [
  {
    file: 'tsconfig.base.json',
    getChanges: () => changes,
  },
];

function getTouchedProjectsFromTsConfigPatched(touchedFiles, graph) {
  const tsConfigJsonChanges = touchedFiles.find((change) => change.file === 'tsconfig.base.json');
  if (!tsConfigJsonChanges) {
    return [];
  }

  const touched = [];
  for (const change of tsConfigJsonChanges.getChanges()) {
    if (change.path.length !== 4) {
      continue;
    }

    const paths = [change.value.lhs, change.value.rhs];
    for (const affectedPath of paths) {
      for (const project of Object.values(graph.nodes)) {
        const normalizedPath =
          affectedPath && affectedPath.startsWith('./')
            ? affectedPath.substring(2)
            : affectedPath;
        const rawRoot = project.data.root;
        const root = rawRoot?.endsWith('/') ? rawRoot.slice(0, -1) : rawRoot;

        if (
          (normalizedPath && root && normalizedPath.startsWith(`${root}/`)) ||
          normalizedPath === root
        ) {
          touched.push(project.name);
        }
      }
    }
  }

  return touched;
}

function unique(projects) {
  return [...new Set(projects)];
}

const stockAffected = getTouchedProjectsFromTsConfig(touchedFiles, null, null, null, graph);
const patchedAffected = getTouchedProjectsFromTsConfigPatched(touchedFiles, graph);
const stockAffectedUnique = unique(stockAffected);
const patchedAffectedUnique = unique(patchedAffected);

const report = {
  behaviorUnderTest: 'getTouchedProjectsFromTsConfig',
  changes,
  stockAffected,
  stockAffectedUnique,
  patchedAffected,
  patchedAffectedUnique,
  expectedAffected: ['ts-cdk-utils'],
  stockHasFalsePositive: stockAffectedUnique.includes('ts-cdk'),
  patchedMatchesExpectation:
    patchedAffectedUnique.length === 1 && patchedAffectedUnique[0] === 'ts-cdk-utils',
};

if (!report.stockHasFalsePositive || !report.patchedMatchesExpectation) {
  throw new Error(`Repro did not match expectations:\n${JSON.stringify(report, null, 2)}`);
}

console.log(JSON.stringify(report, null, 2));
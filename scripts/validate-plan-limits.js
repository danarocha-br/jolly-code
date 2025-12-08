#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const plansPath = path.join(projectRoot, 'src/lib/config/plans.ts');
const migrationsDir = path.join(projectRoot, 'supabase', 'migrations');

const planIds = ['free', 'started', 'pro'];

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function normalizeLimit(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const trimmed = value.toString().trim();
  if (trimmed.toLowerCase() === 'infinity' || trimmed.toLowerCase() === 'null') {
    return null;
  }

  const numeric = Number(trimmed.replace(/[^0-9.-]/g, ''));
  return Number.isNaN(numeric) ? null : numeric;
}

function extractShareLimitsFromTs() {
  const content = readFile(plansPath);
  return planIds.reduce((acc, planId) => {
    const planBlock = new RegExp(
      `${planId}\\s*:\\s*{[\\s\\S]*?shareAsPublicURL:\\s*([^,\\n]+)`,
      'm'
    );
    const match = content.match(planBlock);
    if (!match) {
      throw new Error(`Could not find shareAsPublicURL for plan "${planId}" in ${plansPath}`);
    }

    acc[planId] = normalizeLimit(match[1]);
    return acc;
  }, {});
}

function findLatestMigrationContaining(keyword) {
  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql'));
  const matching = files
    .filter((file) => readFile(path.join(migrationsDir, file)).includes(keyword))
    .sort();

  if (!matching.length) {
    throw new Error(`No migration found containing "${keyword}" in ${migrationsDir}`);
  }

  return path.join(migrationsDir, matching[matching.length - 1]);
}

function getFunctionBody(sqlContent, functionName) {
  const fnRegex = new RegExp(
    `FUNCTION\\s+${functionName}\\s*\\([\\s\\S]*?\\$\\$(.*?)\\$\\$`,
    's'
  );
  const match = sqlContent.match(fnRegex);
  if (!match) {
    throw new Error(`Function "${functionName}" not found in provided SQL content.`);
  }

  return match[1];
}

function extractShareLimitsFromGetPlanLimits(sqlContent) {
  const body = getFunctionBody(sqlContent, 'get_plan_limits');

  return planIds.reduce((acc, planId) => {
    const planRegex = new RegExp(
      `WHEN\\s+'${planId}'\\s+THEN\\s+'({[\\s\\S]*?})'::json`,
      'i'
    );
    const planMatch = body.match(planRegex);

    if (!planMatch) {
      throw new Error(`Plan "${planId}" branch missing in get_plan_limits.`);
    }

    const planJson = JSON.parse(planMatch[1]);
    acc[planId] = normalizeLimit(planJson.shareAsPublicURL);
    return acc;
  }, {});
}

function assertFunctionReferencesGetPlanLimits(sqlContent, functionName) {
  const body = getFunctionBody(sqlContent, functionName);
  if (!body.includes('get_plan_limits')) {
    throw new Error(
      `Function "${functionName}" should reference get_plan_limits to stay in sync with plan configuration.`
    );
  }
}

function main() {
  const tsLimits = extractShareLimitsFromTs();

  const planLimitsPath = findLatestMigrationContaining('FUNCTION get_plan_limits');
  const planLimitsSql = readFile(planLimitsPath);
  const sqlLimits = extractShareLimitsFromGetPlanLimits(planLimitsSql);

  const mismatches = [];
  planIds.forEach((planId) => {
    if (tsLimits[planId] !== sqlLimits[planId]) {
      mismatches.push(
        `${planId}: TypeScript=${tsLimits[planId]} vs SQL=${sqlLimits[planId]} (migration ${path.basename(
          planLimitsPath
        )})`
      );
    }
  });

  const checkLimitPath = findLatestMigrationContaining('FUNCTION check_public_share_limit');
  const checkLimitSql = readFile(checkLimitPath);
  assertFunctionReferencesGetPlanLimits(checkLimitSql, 'check_public_share_limit');

  const recordViewPath = findLatestMigrationContaining('FUNCTION record_public_share_view');
  const recordViewSql = readFile(recordViewPath);
  assertFunctionReferencesGetPlanLimits(recordViewSql, 'record_public_share_view');

  if (mismatches.length) {
    console.error('Plan limit mismatch detected:');
    mismatches.forEach((line) => console.error(`- ${line}`));
    process.exit(1);
  }

  console.log('Plan limits are in sync between plans.ts and SQL functions.');
}

main();

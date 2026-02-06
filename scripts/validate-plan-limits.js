#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const plansPath = path.join(projectRoot, 'src/lib/config/plans.ts');
const migrationsDir = path.join(projectRoot, 'supabase', 'migrations');

/**
 * Extract plan IDs from the canonical source: src/lib/config/plans.ts
 * This reads the planOrder export to automatically stay in sync with plan additions/removals.
 * Falls back to parsing the PlanId type if planOrder is not found.
 */
function extractPlanIdsFromSource() {
  const content = fs.readFileSync(plansPath, 'utf8');
  
  // Try to extract from planOrder array (preferred)
  const planOrderMatch = content.match(/export\s+const\s+planOrder:\s*PlanId\[\]\s*=\s*\[(.*?)\]/s);
  if (planOrderMatch) {
    const planOrderContent = planOrderMatch[1];
    const plans = planOrderContent.match(/'([^']+)'/g) || [];
    if (plans.length > 0) {
      return plans.map(p => p.replace(/'/g, ''));
    }
  }
  
  // Fallback: extract from PlanId type definition
  const planIdMatch = content.match(/export\s+type\s+PlanId\s*=\s*([^;]+);/);
  if (planIdMatch) {
    const typeContent = planIdMatch[1];
    const plans = typeContent.match(/'([^']+)'/g) || [];
    if (plans.length > 0) {
      return plans.map(p => p.replace(/'/g, ''));
    }
  }
  
  throw new Error(
    `Could not extract plan IDs from ${plansPath}. ` +
    `Expected to find either 'export const planOrder' or 'export type PlanId'.`
  );
}

const planIds = extractPlanIdsFromSource();

// Set USE_AST_EXTRACTION=true to use AST-based extraction instead of regex
const USE_AST_EXTRACTION = process.env.USE_AST_EXTRACTION === 'true';

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

/**
 * AST-based extraction using TypeScript compiler API (more robust than regex)
 * Set USE_AST_EXTRACTION=true to use this method
 */
function extractShareLimitsFromTsAST() {
  try {
    const ts = require('typescript');
    const content = readFile(plansPath);
    const sourceFile = ts.createSourceFile(
      plansPath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const foundPlans = {};
    const foundPlanIds = [];

    function visit(node) {
      // Look for object literal expressions (plan definitions)
      if (ts.isPropertyAssignment(node)) {
        const propertyName = node.name.text;
        if (planIds.includes(propertyName) && ts.isObjectLiteralExpression(node.initializer)) {
          // Find shareAsPublicURL property within this plan object
          const planObject = node.initializer;
          for (const prop of planObject.properties) {
            if (
              ts.isPropertyAssignment(prop) &&
              prop.name.text === 'shareAsPublicURL'
            ) {
              const value = prop.initializer;
              let limitValue = null;

              if (ts.isNumericLiteral(value)) {
                limitValue = Number(value.text);
              } else if (ts.isIdentifier(value) && value.text === 'Infinity') {
                limitValue = Infinity; // Pass Infinity to normalizeLimit, which will convert it to null
              }

              foundPlans[propertyName] = normalizeLimit(limitValue);
              foundPlanIds.push(propertyName);
              break;
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    // Validate that all expected plans were found
    const missingPlans = planIds.filter((planId) => !foundPlanIds.includes(planId));
    if (foundPlanIds.length !== planIds.length || missingPlans.length > 0) {
      const foundCount = foundPlanIds.length;
      const expectedCount = planIds.length;
      const missingList = missingPlans.join(', ');
      throw new Error(
        `Only found ${foundCount}/${expectedCount} plans in ${plansPath}. ` +
        `Missing plans: ${missingList}. ` +
        `Found plans: ${foundPlanIds.join(', ')}`
      );
    }

    return foundPlans;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('typescript')) {
      throw new Error(
        'AST extraction requires TypeScript. Install it with: pnpm add -D typescript'
      );
    }
    throw error;
  }
}

/**
 * Regex-based extraction (faster but more fragile)
 * Improved to accumulate all found plans before validation
 */
function extractShareLimitsFromTsRegex() {
  const content = readFile(plansPath);
  const foundPlans = {};
  const foundPlanIds = [];

  // First pass: extract all found plans
  planIds.forEach((planId) => {
    const planBlock = new RegExp(
      `${planId}\\s*:\\s*{[\\s\\S]*?shareAsPublicURL:\\s*([^,\\n]+)`,
      'm'
    );
    const match = content.match(planBlock);
    if (match) {
      foundPlans[planId] = normalizeLimit(match[1]);
      foundPlanIds.push(planId);
    }
  });

  // Validate that all expected plans were found
  const missingPlans = planIds.filter((planId) => !foundPlanIds.includes(planId));
  if (foundPlanIds.length !== planIds.length || missingPlans.length > 0) {
    const foundCount = foundPlanIds.length;
    const expectedCount = planIds.length;
    const missingList = missingPlans.join(', ');
    throw new Error(
      `Only found ${foundCount}/${expectedCount} plans in ${plansPath}. ` +
      `Missing plans: ${missingList}. ` +
      `Found plans: ${foundPlanIds.join(', ')}`
    );
  }

  return foundPlans;
}

function extractShareLimitsFromTs() {
  return USE_AST_EXTRACTION
    ? extractShareLimitsFromTsAST()
    : extractShareLimitsFromTsRegex();
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

function extractShareLimitsFromGetPlanLimits(sqlContent, migrationPath) {
  const body = getFunctionBody(sqlContent, 'get_plan_limits');
  const migrationIdentifier = migrationPath
    ? `migration ${path.basename(migrationPath)} (${migrationPath})`
    : 'SQL input';

  return planIds.reduce((acc, planId) => {
    const planRegex = new RegExp(
      `WHEN\\s+'${planId}'\\s+THEN\\s+'({[\\s\\S]*?})'::json`,
      'i'
    );
    const planMatch = body.match(planRegex);

    if (!planMatch) {
      throw new Error(`Plan "${planId}" branch missing in get_plan_limits.`);
    }

    try {
      const planJson = JSON.parse(planMatch[1]);
      acc[planId] = normalizeLimit(planJson.shareAsPublicURL);
    } catch (error) {
      if (error instanceof SyntaxError) {
        const jsonSnippet = planMatch[1].substring(0, 200); // First 200 chars of offending JSON
        console.error(
          `Failed to parse JSON for plan "${planId}" in ${migrationIdentifier}:`
        );
        console.error(`  Error: ${error.message}`);
        console.error(`  JSON snippet: ${jsonSnippet}${planMatch[1].length > 200 ? '...' : ''}`);
        throw new Error(
          `Malformed JSON for plan "${planId}" in ${migrationIdentifier}: ${error.message}`
        );
      }
      throw error;
    }
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
  const sqlLimits = extractShareLimitsFromGetPlanLimits(planLimitsSql, planLimitsPath);

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

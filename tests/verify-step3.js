import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [OK] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
  }
}

console.log('=====================================================');
console.log(' RUNNING VERIFICATION TEST FOR STEP 3 (documentacao.md)');
console.log('=====================================================\n');

// 1. Monorepo Root & Workspace Check
console.log('1. Checking Monorepo Workspace Configuration:');
const pnpmWorkspaceExists = fs.existsSync(path.join(rootDir, 'pnpm-workspace.yaml'));
assert(pnpmWorkspaceExists, 'pnpm-workspace.yaml exists');

if (pnpmWorkspaceExists) {
  const content = fs.readFileSync(path.join(rootDir, 'pnpm-workspace.yaml'), 'utf-8');
  assert(content.includes("apps/*") && content.includes("packages/*"), 'pnpm-workspace.yaml includes apps/* and packages/*');
}

const rootPackageJsonExists = fs.existsSync(path.join(rootDir, 'package.json'));
assert(rootPackageJsonExists, 'Root package.json exists');

// 2. Folder Structure Verification
console.log('\n2. Checking Monorepo Directory Structure:');
const requiredDirs = [
  'apps/desktop',
  'apps/desktop/prisma',
  'apps/desktop/src/main',
  'apps/desktop/src/main/ipc',
  'apps/desktop/src/main/services',
  'apps/desktop/src/main/repositories',
  'apps/desktop/src/main/sync',
  'apps/desktop/src/main/hardware',
  'apps/desktop/src/preload',
  'apps/desktop/src/renderer',
  'apps/desktop/src/renderer/src/pages',
  'apps/desktop/src/renderer/src/components',
  'apps/desktop/src/renderer/src/hooks',
  'apps/desktop/src/renderer/src/store',
  'apps/api',
  'apps/api/prisma',
  'apps/api/src/controllers',
  'apps/api/src/services',
  'apps/api/src/repositories',
  'apps/api/src/middlewares',
  'packages/shared',
  'packages/shared/src/types',
  'packages/shared/src/schemas',
  'packages/shared/src/constants',
];

for (const dir of requiredDirs) {
  assert(fs.existsSync(path.join(rootDir, dir)), `Directory ${dir} exists`);
}

// 3. Desktop App Configuration & Dependencies
console.log('\n3. Checking Apps/Desktop Configuration & Dependencies:');
const desktopPkgPath = path.join(rootDir, 'apps/desktop/package.json');
assert(fs.existsSync(desktopPkgPath), 'apps/desktop/package.json exists');

if (fs.existsSync(desktopPkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(desktopPkgPath, 'utf-8'));
  assert(!!pkg.dependencies?.['@prisma/client'], 'apps/desktop has @prisma/client dependency');
  assert(!!pkg.devDependencies?.['electron'], 'apps/desktop has electron devDependency');
  assert(!!pkg.devDependencies?.['electron-builder'], 'apps/desktop has electron-builder devDependency');
  assert(!!pkg.devDependencies?.['prisma'], 'apps/desktop has prisma devDependency');
}

const builderConfigExists = fs.existsSync(path.join(rootDir, 'apps/desktop/electron-builder.json'));
assert(builderConfigExists, 'apps/desktop/electron-builder.json exists');

const viteConfigExists = fs.existsSync(path.join(rootDir, 'apps/desktop/vite.config.ts'));
assert(viteConfigExists, 'apps/desktop/vite.config.ts exists');

// 4. Prisma SQLite Schema Verification
console.log('\n4. Checking Desktop Prisma SQLite Schema (schema.prisma):');
const prismaSchemaPath = path.join(rootDir, 'apps/desktop/prisma/schema.prisma');
const schemaExists = fs.existsSync(prismaSchemaPath);
assert(schemaExists, 'apps/desktop/prisma/schema.prisma exists');

if (schemaExists) {
  const schemaContent = fs.readFileSync(prismaSchemaPath, 'utf-8');
  assert(schemaContent.includes('provider = "sqlite"'), 'Datasource provider is sqlite');
  assert(schemaContent.includes('model Produto'), 'Model Produto exists');
  assert(schemaContent.includes('model Caixa'), 'Model Caixa exists');
  assert(schemaContent.includes('model Venda'), 'Model Venda exists');
  assert(schemaContent.includes('model ItemVenda'), 'Model ItemVenda exists');
  assert(schemaContent.includes('model SyncQueue'), 'Model SyncQueue exists');
}

// 5. IPC Bridge Verification
console.log('\n5. Checking IPC Bridge Implementation (Preload / Main / Renderer):');
const preloadPath = path.join(rootDir, 'apps/desktop/src/preload/index.ts');
assert(fs.existsSync(preloadPath), 'apps/desktop/src/preload/index.ts exists');

if (fs.existsSync(preloadPath)) {
  const preloadContent = fs.readFileSync(preloadPath, 'utf-8');
  assert(preloadContent.includes("contextBridge.exposeInMainWorld('api'"), 'Exposes api to renderer via contextBridge');
  assert(preloadContent.includes("venda:registrar"), 'Exposes venda:registrar IPC call');
  assert(preloadContent.includes("caixa:status"), 'Exposes caixa:status IPC call');
  assert(preloadContent.includes("caixa:abrir"), 'Exposes caixa:abrir IPC call');
}

const mainIpcPath = path.join(rootDir, 'apps/desktop/src/main/ipc/vendaHandler.ts');
assert(fs.existsSync(mainIpcPath), 'apps/desktop/src/main/ipc/vendaHandler.ts exists');

if (fs.existsSync(mainIpcPath)) {
  const mainIpcContent = fs.readFileSync(mainIpcPath, 'utf-8');
  assert(mainIpcContent.includes("ipcMain.handle('venda:registrar'"), 'Registers ipcMain handler for venda:registrar');
  assert(mainIpcContent.includes("VendaService.efetuarVenda"), 'Delegates execution to VendaService.efetuarVenda');
}

// 6. Prisma Schema Syntax Validation via Prisma CLI
console.log('\n6. Validating Prisma Schema with Prisma CLI:');
try {
  let output;
  try {
    output = execSync(`pnpm --filter desktop exec prisma validate --schema="prisma/schema.prisma"`, { cwd: rootDir, encoding: 'utf-8' });
  } catch {
    output = execSync(`npx prisma validate --schema="${prismaSchemaPath}"`, { cwd: rootDir, encoding: 'utf-8' });
  }
  assert(true, 'Prisma schema validation passed via Prisma CLI');
} catch (err) {
  assert(false, `Prisma schema validation failed: ${err.message}`);
}

console.log('\n=====================================================');
console.log(` TEST SUMMARY: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
console.log('=====================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

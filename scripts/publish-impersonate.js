// Publishes node-libcurl-impersonate to npm.
// Temporarily swaps package.json with package.impersonate.json, runs npm publish, then restores.
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const packageJsonPath = path.join(root, 'package.json')
const packageJsonBakPath = path.join(root, 'package.json.bak')
const impersonatePackageJsonPath = path.join(root, 'package.impersonate.json')

if (!fs.existsSync(impersonatePackageJsonPath)) {
  console.error('package.impersonate.json not found')
  process.exit(1)
}

const args = process.argv.slice(2).join(' ')

fs.copyFileSync(packageJsonPath, packageJsonBakPath)
try {
  fs.copyFileSync(impersonatePackageJsonPath, packageJsonPath)
  execSync(`npm publish ${args}`, { stdio: 'inherit', cwd: root })
} finally {
  fs.copyFileSync(packageJsonBakPath, packageJsonPath)
  fs.unlinkSync(packageJsonBakPath)
}

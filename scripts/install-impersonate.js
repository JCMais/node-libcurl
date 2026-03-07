// Install script for node-libcurl-impersonate.
// Runs node-pre-gyp with curl_impersonate=true, then copies the DLL to lib/binding/.
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const nodePreGyp = path.join(
  root,
  'node_modules',
  '@mapbox',
  'node-pre-gyp',
  'bin',
  'node-pre-gyp',
)

execSync(`node "${nodePreGyp}" install --fallback-to-build`, {
  stdio: 'inherit',
  cwd: root,
})

// Copy libcurl-impersonate.dll to lib/binding/ so it's found at runtime.
// (Only needed after a fallback source build; prebuilt tarballs include the DLL.)
if (process.platform === 'win32') {
  const dllSrc = path.join(
    root,
    'deps',
    'libcurl-impersonate',
    'bin',
    'libcurl-impersonate.dll',
  )
  const bindingDir = path.join(root, 'lib', 'binding')
  const dllDest = path.join(bindingDir, 'libcurl-impersonate.dll')

  if (fs.existsSync(dllSrc) && !fs.existsSync(dllDest)) {
    fs.mkdirSync(bindingDir, { recursive: true })
    fs.copyFileSync(dllSrc, dllDest)
    console.log('Copied libcurl-impersonate.dll to lib/binding/')
  }
}

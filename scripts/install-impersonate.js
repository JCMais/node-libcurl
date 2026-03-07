// Install script for @kohnoselami/node-libcurl-impersonate.
// Runs node-pre-gyp install --fallback-to-build, then copies the shared
// library (DLL/.so/.dylib) to lib/binding/ for runtime discovery.
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

// After a fallback source build, copy the shared library to lib/binding/
// so the runtime loader finds it (RPATH=$ORIGIN / @loader_path).
// Prebuilt tarballs already include the shared library, so this is a no-op for them.
const bindingDir = path.join(root, 'lib', 'binding')
const impersonateDepsDir = path.join(root, 'deps', 'libcurl-impersonate')

function copySharedLibs() {
  const { platform } = process

  if (platform === 'win32') {
    const binDir = path.join(impersonateDepsDir, 'bin')
    if (!fs.existsSync(binDir)) return
    for (const f of fs.readdirSync(binDir)) {
      if (f.endsWith('.dll')) {
        const dest = path.join(bindingDir, f)
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(path.join(binDir, f), dest)
          console.log(`Copied ${f} to lib/binding/`)
        }
      }
    }
    return
  }

  const libDir = path.join(impersonateDepsDir, 'lib')
  if (!fs.existsSync(libDir)) return

  const ext = platform === 'darwin' ? '.dylib' : '.so'
  for (const f of fs.readdirSync(libDir)) {
    if (f.includes(ext)) {
      const src = path.join(libDir, f)
      const dest = path.join(bindingDir, f)
      if (!fs.existsSync(dest)) {
        // Use copyFileSync with COPYFILE_FICLONE_FORCE fallback (follow symlinks)
        try {
          const real = fs.realpathSync(src)
          fs.copyFileSync(real, dest)
          console.log(`Copied ${f} to lib/binding/`)
        } catch {
          // Skip unresolvable symlinks
        }
      }
    }
  }
}

fs.mkdirSync(bindingDir, { recursive: true })
copySharedLibs()

// Returns include-dir and linker library paths for libcurl-impersonate on Linux/macOS.
// Used by binding.gyp during the native addon build.
const fs = require('fs')
const path = require('path')

const moduleRoot = path.resolve(__dirname, '..')
const depsDir = path.join(moduleRoot, 'deps', 'libcurl-impersonate')
const libDir = path.join(depsDir, 'lib')

const arg = process.argv[2]

if (arg === '--include-dir') {
  process.stdout.write(path.join(depsDir, 'include'))
} else if (arg === '--libs') {
  // Prefer dynamic linking (.so/.dylib) for consistency with Windows DLL approach.
  // RPATH ($ORIGIN / @loader_path) is set in binding.gyp so the loader finds the
  // bundled shared library at runtime from the same directory as the .node file.
  const soPath = path.join(libDir, 'libcurl-impersonate.so')
  const dylibPath = path.join(libDir, 'libcurl-impersonate.dylib')

  if (fs.existsSync(soPath) || fs.existsSync(dylibPath)) {
    // Dynamic: just point the linker at the lib directory
    process.stdout.write(`-L${libDir} -lcurl-impersonate`)
  } else {
    // Fallback: static linking with .a (no bundled runtime lib needed)
    const aPath = path.join(libDir, 'libcurl-impersonate.a')
    process.stdout.write(aPath)
  }
}

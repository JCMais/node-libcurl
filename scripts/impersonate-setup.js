// Downloads prebuilt libcurl-impersonate binaries.
// Supports Windows, Linux (glibc/musl), and macOS.
// No third-party dependencies - only native Node.js modules.
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const https = require('https')

const REPO = 'lexiforest/curl-impersonate'
const VERSION = '1.5.1'

const moduleRoot = path.resolve(__dirname, '..')
const depsDir = path.join(moduleRoot, 'deps', 'libcurl-impersonate')

function isMusl() {
  try {
    const report = process.report.getReport()
    if (report.header && report.header.glibcVersionRuntime) return false
  } catch {
    /* ignore */
  }
  try {
    const out = execSync('ldd --version 2>&1 || true', {
      encoding: 'utf8',
      stdio: 'pipe',
    })
    if (out.includes('musl')) return true
  } catch {
    /* ignore */
  }
  try {
    const err = execSync('ldd --version 2>/dev/null; true', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    })
    if (err.includes('musl')) return true
  } catch {
    /* ignore */
  }
  return fs.existsSync('/etc/alpine-release')
}

function getTarballName() {
  const { platform, arch } = process

  if (platform === 'win32') {
    const archMap = { x64: 'x86_64', ia32: 'i686', arm64: 'arm64' }
    const a = archMap[arch]
    if (!a) throw new Error(`Unsupported Windows arch: ${arch}`)
    return `libcurl-impersonate-v${VERSION}.${a}-win32.tar.gz`
  }

  if (platform === 'darwin') {
    const archMap = { x64: 'x86_64', arm64: 'arm64' }
    const a = archMap[arch]
    if (!a) throw new Error(`Unsupported macOS arch: ${arch}`)
    return `libcurl-impersonate-v${VERSION}.${a}-macos.tar.gz`
  }

  if (platform === 'linux') {
    if (arch === 'arm') {
      // Only gnueabihf available for 32-bit ARM
      return `libcurl-impersonate-v${VERSION}.arm-linux-gnueabihf.tar.gz`
    }
    const archMap = { x64: 'x86_64', arm64: 'aarch64', ia32: 'i386' }
    const a = archMap[arch]
    if (!a) throw new Error(`Unsupported Linux arch: ${arch}`)
    const libc = isMusl() ? 'musl' : 'gnu'
    return `libcurl-impersonate-v${VERSION}.${a}-linux-${libc}.tar.gz`
  }

  throw new Error(`Unsupported platform: ${platform}`)
}

function isCached() {
  // Platform-agnostic cache check: headers always present after extraction
  return fs.existsSync(path.join(depsDir, 'include', 'curl', 'curl.h'))
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    const get = (u) => {
      https
        .get(u, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            file.close()
            get(res.headers.location)
            return
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${u}`))
            return
          }
          res.pipe(file)
          file.on('finish', () => file.close(resolve))
          file.on('error', reject)
        })
        .on('error', reject)
    }
    get(url)
  })
}

async function setupImpersonate() {
  const force = process.argv.includes('--force')
  if (!force && process.env.npm_config_curl_impersonate !== 'true') {
    return
  }

  if (isCached()) {
    console.log(`Using cached libcurl-impersonate v${VERSION} at ${depsDir}`)
    return
  }

  let tarballName
  try {
    tarballName = getTarballName()
  } catch (err) {
    console.warn(`impersonate-setup: ${err.message}, skipping`)
    return
  }

  fs.mkdirSync(depsDir, { recursive: true })

  const tarballPath = path.join(depsDir, tarballName)
  const url = `https://github.com/${REPO}/releases/download/v${VERSION}/${tarballName}`

  console.log(
    `Downloading libcurl-impersonate v${VERSION} (${process.platform}/${process.arch})...`,
  )
  console.log(`  from: ${url}`)

  await downloadFile(url, tarballPath)

  console.log('Extracting...')
  execSync(`tar -xzf "${tarballPath}"`, { cwd: depsDir })
  fs.unlinkSync(tarballPath)

  console.log(`libcurl-impersonate v${VERSION} ready at ${depsDir}`)
}

setupImpersonate().catch((err) => {
  console.error('impersonate-setup failed:', err.message)
  process.exit(1)
})

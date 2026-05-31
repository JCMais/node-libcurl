// this should not use any third party dependencies! Only native Node.js modules!
const fs = require('fs')
const path = require('path')

/**
 * Parse a version string into components.
 * Handles both modern (3.0.16) and legacy (1.1.1n) OpenSSL version formats.
 * @param {string} versionString
 * @returns {{ major: number, minor: number, patch: number, letter: string, raw: string } | null}
 */
function parseVersion(versionString) {
  if (!versionString || typeof versionString !== 'string') {
    return null
  }

  // Handle versions like "3.4.1", "1.1.1n", "3.0.8"
  const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)([a-z])?$/)
  if (!match) {
    return null
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    letter: match[4] || '',
    raw: versionString,
  }
}

/**
 * Compare two parsed versions.
 * @param {{ major: number, minor: number, patch: number, letter: string }} a
 * @param {{ major: number, minor: number, patch: number, letter: string }} b
 * @returns {number} -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareVersions(a, b) {
  if (a.major !== b.major) return a.major - b.major
  if (a.minor !== b.minor) return a.minor - b.minor
  if (a.patch !== b.patch) return a.patch - b.patch
  // Handle letter suffix (for 1.1.1a < 1.1.1b < 1.1.1n)
  if (a.letter && b.letter) {
    return a.letter.localeCompare(b.letter)
  }
  // Version without letter comes before version with letter
  if (a.letter && !b.letter) return 1
  if (!a.letter && b.letter) return -1
  return 0
}

/**
 * Get available OpenSSL versions from vcpkg registry.
 * @param {string} vcpkgRoot - Path to vcpkg installation
 * @returns {string[] | null} Array of version strings, or null if not found
 */
function getAvailableVersions(vcpkgRoot) {
  const versionsFile = path.join(vcpkgRoot, 'versions', 'o-', 'openssl.json')

  if (!fs.existsSync(versionsFile)) {
    return null
  }

  try {
    const data = JSON.parse(fs.readFileSync(versionsFile, 'utf8'))
    if (!data.versions || !Array.isArray(data.versions)) {
      return null
    }
    return data.versions.map((v) => v.version).filter(Boolean)
  } catch {
    return null
  }
}

/**
 * Find the best matching OpenSSL version from available versions.
 *
 * Priority:
 * 1. Exact match
 * 2. Higher patch on same minor line (3.0.17, 3.0.18, ...)
 * 3. Lower patch on same minor line (3.0.15, 3.0.14, ... - pick highest)
 * 4. Lowest version on next minor line (3.1.0)
 * 5. Continue to higher minors if needed
 * 6. Fall back to original version
 *
 * @param {string} targetVersion - The desired OpenSSL version
 * @param {string[]} availableVersions - List of available versions in vcpkg
 * @returns {{ version: string, isExact: boolean, message: string | null }}
 */
function findBestVersion(targetVersion, availableVersions) {
  const target = parseVersion(targetVersion)
  if (!target) {
    return {
      version: targetVersion,
      isExact: false,
      message: `Could not parse version "${targetVersion}", using as-is`,
    }
  }

  // Parse all available versions
  const parsed = availableVersions
    .map((v) => parseVersion(v))
    .filter((v) => v !== null)

  if (parsed.length === 0) {
    return {
      version: targetVersion,
      isExact: false,
      message: 'No versions found in vcpkg registry',
    }
  }

  // Check for exact match
  const exactMatch = parsed.find(
    (v) =>
      v.major === target.major &&
      v.minor === target.minor &&
      v.patch === target.patch &&
      v.letter === target.letter,
  )

  if (exactMatch) {
    return { version: exactMatch.raw, isExact: true, message: null }
  }

  // Strategy 1: Find higher patch on same minor line
  const sameMinorHigher = parsed
    .filter(
      (v) =>
        v.major === target.major &&
        v.minor === target.minor &&
        compareVersions(v, target) > 0,
    )
    .sort((a, b) => compareVersions(a, b)) // Ascending to get closest higher

  if (sameMinorHigher.length > 0) {
    const best = sameMinorHigher[0]
    return {
      version: best.raw,
      isExact: false,
      message: `Newer patch on same ${target.major}.${target.minor}.x line`,
    }
  }

  // Strategy 2: Find lower patch on same minor line (pick highest available)
  const sameMinorLower = parsed
    .filter(
      (v) =>
        v.major === target.major &&
        v.minor === target.minor &&
        compareVersions(v, target) < 0,
    )
    .sort((a, b) => -compareVersions(a, b)) // Descending to get highest lower

  if (sameMinorLower.length > 0) {
    const best = sameMinorLower[0]
    return {
      version: best.raw,
      isExact: false,
      message: `Closest available on ${target.major}.${target.minor}.x line`,
    }
  }

  // Strategy 3: Find lowest version on next minor line(s) with same major
  const higherMinors = parsed
    .filter((v) => v.major === target.major && v.minor > target.minor)
    .sort((a, b) => compareVersions(a, b)) // Ascending

  if (higherMinors.length > 0) {
    const best = higherMinors[0]
    return {
      version: best.raw,
      isExact: false,
      message: `No ${target.major}.${target.minor}.x versions available, using ${best.major}.${best.minor}.x`,
    }
  }

  // Strategy 4: Look at next major version (rare case)
  const higherMajors = parsed
    .filter((v) => v.major > target.major)
    .sort((a, b) => compareVersions(a, b))

  if (higherMajors.length > 0) {
    const best = higherMajors[0]
    return {
      version: best.raw,
      isExact: false,
      message: `WARNING: No OpenSSL ${target.major}.x available, using ${best.major}.x (major version change)`,
    }
  }

  // No suitable version found - return target and let vcpkg fail
  return {
    version: targetVersion,
    isExact: false,
    message: 'No compatible OpenSSL version found in vcpkg registry',
  }
}

module.exports = {
  parseVersion,
  compareVersions,
  getAvailableVersions,
  findBestVersion,
}

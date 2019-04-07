// Proudly copied from https://github.com/nodegit/nodegit/blob/977251b4aae52eef75cf4f188b4d5a63ba98fa7b/utils/buildFlags.js
const fs = require('fs')
const path = require('path')

let GitRepo

try {
  fs.statSync(path.join(__dirname, '..', '.git'))
  isGitRepo = true
} catch (e) {
  isGitRepo = false
}

module.exports = {
  debugBuild: !!process.env.BUILD_DEBUG,
  isElectron: process.env.npm_config_runtime === 'electron',
  isGitRepo: isGitRepo,
  isNwjs: process.env.npm_config_runtime === 'node-webkit',
  mustBuild: !!(isGitRepo || process.env.BUILD_DEBUG || process.env.BUILD_ONLY),
}

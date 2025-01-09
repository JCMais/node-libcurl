// https://github.com/nodejs/nan/issues/978
const path = require('path')
const fs = require('fs')
const filePath = path.join(__dirname, '../node_modules/nan/nan.h')
// if file not found, exit script without error (e.g. running `npm i` in insomnia repository)
if (!fs.existsSync(filePath)) {
  console.log('nan.h not found, skipping patch')
  process.exit(0)
}
const fileContent = fs.readFileSync(filePath, 'utf8')
const updatedContent = fileContent.replace(
  /#include "nan_scriptorigin.h"/,
  '// #include "nan_scriptorigin.h"',
)

fs.writeFileSync(filePath, updatedContent, 'utf8')

console.log(
  "Sucessfully patched nan.h to comment out #include 'nan_scriptorigin.h' https://github.com/nodejs/nan/issues/978",
)

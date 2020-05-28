const fs = require('fs')
const { inspect } = require('util')

const { optionKindMap, optionKindValueMap } = require('../data/options')

const getSetOptDefinition = (
  optionNameType,
  optionValueType,
  setOptReturnType,
) =>
  `/**
 * Use {@link "Curl".Curl.option|\`Curl.option\`} for predefined constants.
 *
 *
 * Official libcurl documentation: [\`curl_easy_setopt()\`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
 */
setOpt(option: ${optionNameType}, value: ${optionValueType} | null): ${setOptReturnType}`

const createSetOptOverloads = (filePath, setOptReturnType = 'CurlCode') => {
  let easyClassSetOptOverloadsData = [
    getSetOptDefinition(
      'DataCallbackOptions',
      optionKindValueMap.dataCallback,
      setOptReturnType,
    ),
    getSetOptDefinition(
      'ProgressCallbackOptions',
      optionKindValueMap.progressCallback,
      setOptReturnType,
    ),
    getSetOptDefinition(
      'StringListOptions',
      optionKindValueMap.stringList,
      setOptReturnType,
    ),
  ]

  for (const specificOption of optionKindMap.other) {
    easyClassSetOptOverloadsData = [
      ...easyClassSetOptOverloadsData,
      getSetOptDefinition(
        inspect(specificOption),
        optionKindValueMap[specificOption],
        setOptReturnType,
      ),
    ]
  }

  easyClassSetOptOverloadsData = [
    ...easyClassSetOptOverloadsData,
    getSetOptDefinition(
      'Exclude<CurlOptionName, SpecificOptions>',
      optionKindValueMap._,
      setOptReturnType,
    ),
  ]

  const bindingFileMessageGuard = 'AUTOMATICALLY GENERATED CODE - DO NOT EDIT'

  const bindingFileRegex = new RegExp(
    `\/\/ START ${bindingFileMessageGuard}\n(.*)\/\/ END ${bindingFileMessageGuard}\n`,
    'gs',
  )

  const fileContent = fs.readFileSync(filePath, {
    encoding: 'utf8',
  })
  const newFileContent = fileContent.replace(
    bindingFileRegex,
    [
      `// START ${bindingFileMessageGuard}`,
      easyClassSetOptOverloadsData.join('\n'),
      `// END ${bindingFileMessageGuard}`,
      '',
    ].join('\n'),
  )
  fs.writeFileSync(filePath, newFileContent)
}

module.exports = {
  createSetOptOverloads,
}

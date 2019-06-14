const fs = require('fs')
const path = require('path')
const { inspect } = require('util')
const { execSync } = require('child_process')

const { optionKindMap, optionKindValueMap } = require('./data/options')

const {
  createConstantsFile,
  getDescriptionCommentForOption,
} = require('./utils/createConstantsFile')
const { createSetOptOverloads } = require('./utils/createSetOptOverloads')
const { curlOptionsBlacklist } = require('./utils/curlOptionsBlacklist')
const { multiOptionsBlacklist } = require('./utils/multiOptionsBlacklist')
const { retrieveConstantList } = require('./utils/retrieveConstantList')

const run = async () => {
  const curlOptionsFilePath = path.resolve(
    __dirname,
    '../lib/generated/CurlOption.ts',
  )

  const curlInfoFilePath = path.resolve(
    __dirname,
    '../lib/generated/CurlInfo.ts',
  )

  const multiOptionFilePath = path.resolve(
    __dirname,
    '../lib/generated/MultiOption.ts',
  )

  const allowedCurlOptions = await retrieveConstantList({
    url: 'https://curl.haxx.se/libcurl/c/curl_easy_setopt.html',
    constantPrefix: 'CURLOPT_',
    blacklist: curlOptionsBlacklist,
  })
  await createConstantsFile({
    constants: allowedCurlOptions,
    variableName: 'CurlOption',
    filePath: curlOptionsFilePath,
    shouldGenerateCamelCaseMap: true,
    extraHeaderText: `
      import { CurlGssApi } from "../enum/CurlGssApi"
      import { CurlSslOpt } from "../enum/CurlSslOpt"
      import { Share } from "../Share"
    `,
  })

  const allowedCurlInfos = await retrieveConstantList({
    url: 'https://curl.haxx.se/libcurl/c/curl_easy_getinfo.html',
    constantPrefix: 'CURLINFO_',
    blacklist: [],
  })
  await createConstantsFile({
    constants: allowedCurlInfos,
    variableName: 'CurlInfo',
    filePath: curlInfoFilePath,
  })

  const allowedMultiOptions = await retrieveConstantList({
    url: 'https://curl.haxx.se/libcurl/c/curl_multi_setopt.html',
    constantPrefix: 'CURLMOPT_',
    blacklist: multiOptionsBlacklist,
  })
  await createConstantsFile({
    constants: allowedMultiOptions,
    variableName: 'MultiOption',
    filePath: multiOptionFilePath,
  })

  // add extra types to CurlOption
  const union = arr => arr.map(i => inspect(i)).join(' | ')

  let optionsValueTypeData = [
    'import { FileInfo, HttpPostField } from "../types"',
    `export type DataCallbackOptions = ${union(optionKindMap.dataCallback)}`,
    `export type ProgressCallbackOptions = ${union(
      optionKindMap.progressCallback,
    )}`,
    `export type StringListOptions = ${union(optionKindMap.stringList)}`,
    `export type SpecificOptions = DataCallbackOptions | ProgressCallbackOptions | StringListOptions | ${union(
      optionKindMap.other,
    )}`,
  ]

  // Now we must create the type for the curl.<http-verb> options param
  optionsValueTypeData = [
    ...optionsValueTypeData,
    `
    /**
     * @public
     */
    export type CurlOptionValueType = {`,
  ]

  for (const option of allowedCurlOptions) {
    const optionDescription = getDescriptionCommentForOption(option)

    const optionValueType =
      Object.entries(optionKindMap).reduce((acc, [kind, kindOptions]) => {
        if (acc) return acc

        return (
          kindOptions.includes(option.constantName) &&
          (optionKindValueMap[kind] || optionKindValueMap[option.constantName])
        )
      }, null) || optionKindValueMap._

    optionsValueTypeData = [
      ...optionsValueTypeData,
      `${optionDescription}${option.constantName}?: ${optionValueType} | null`,
      `${optionDescription}${
        option.constantNameCamelCase
      }?: ${optionValueType} | null`,
    ]
  }

  optionsValueTypeData = [...optionsValueTypeData, '}']

  fs.writeFileSync(curlOptionsFilePath, optionsValueTypeData.join('\n'), {
    flag: 'a+',
  })

  const easyBindingFilePath = path.resolve(
    __dirname,
    '../lib/types/EasyNativeBinding.ts',
  )
  const curlClassFilePath = path.resolve(__dirname, '../lib/Curl.ts')

  createSetOptOverloads(easyBindingFilePath)
  createSetOptOverloads(curlClassFilePath, 'this')

  execSync(
    `yarn prettier ${curlOptionsFilePath} ${curlInfoFilePath} ${multiOptionFilePath} ${easyBindingFilePath} ${curlClassFilePath}`,
  )
}

run()

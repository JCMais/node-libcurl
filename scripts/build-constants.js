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
    url: 'https://curl.se/libcurl/c/curl_easy_setopt.html',
    constantPrefix: 'CURLOPT_',
    blacklist: curlOptionsBlacklist,
  })
  await createConstantsFile({
    constants: allowedCurlOptions,
    variableName: 'CurlOption',
    filePath: curlOptionsFilePath,
    shouldGenerateCamelCaseMap: true,
    extraHeaderText: `
      import { CurlChunk } from '../enum/CurlChunk'
      import { CurlFnMatchFunc } from '../enum/CurlFnMatchFunc'
      import { CurlFtpMethod } from '../enum/CurlFtpMethod'
      import { CurlFtpSsl } from '../enum/CurlFtpSsl'
      import { CurlGssApi } from '../enum/CurlGssApi'
      import { CurlHeader } from '../enum/CurlHeader'
      import { CurlHsts, CurlHstsCacheCount, CurlHstsCacheEntry } from '../enum/CurlHsts'
      import { CurlHttpVersion } from '../enum/CurlHttpVersion'
      import { CurlInfoDebug } from '../enum/CurlInfoDebug'
      import { CurlIpResolve } from '../enum/CurlIpResolve'
      import { CurlNetrc } from '../enum/CurlNetrc'
      import { CurlPreReqFunc } from '../enum/CurlPreReqFunc'
      import { CurlProgressFunc } from '../enum/CurlProgressFunc'
      import { CurlProtocol } from '../enum/CurlProtocol'
      import { CurlProxy } from '../enum/CurlProxy'
      import { CurlRtspRequest } from '../enum/CurlRtspRequest'
      import { CurlSshAuth } from '../enum/CurlSshAuth'
      import { CurlSslOpt } from '../enum/CurlSslOpt'
      import { CurlSslVersion } from '../enum/CurlSslVersion'
      import { CurlTimeCond } from '../enum/CurlTimeCond'
      import { CurlUseSsl } from '../enum/CurlUseSsl'
      import { EasyNativeBinding } from "../types/EasyNativeBinding"
      import { Share } from "../Share"
    `,
  })

  const allowedCurlInfos = await retrieveConstantList({
    url: 'https://curl.se/libcurl/c/curl_easy_getinfo.html',
    constantPrefix: 'CURLINFO_',
    blacklist: [
      // time constants at the bottom
      'NAMELOOKUP',
      'CONNECT',
      'APPCONNECT',
      'PRETRANSFER',
      'STARTTRANSFER',
      'TOTAL',
      'REDIRECT',
    ],
  })
  await createConstantsFile({
    constants: allowedCurlInfos,
    variableName: 'CurlInfo',
    filePath: curlInfoFilePath,
  })

  const allowedMultiOptions = await retrieveConstantList({
    url: 'https://curl.se/libcurl/c/curl_multi_setopt.html',
    constantPrefix: 'CURLMOPT_',
    blacklist: multiOptionsBlacklist,
  })
  await createConstantsFile({
    constants: allowedMultiOptions,
    variableName: 'MultiOption',
    filePath: multiOptionFilePath,
  })

  // add extra types to CurlOption
  const union = (arr) => arr.map((i) => inspect(i)).join(' | ')

  let optionsValueTypeData = [
    'import { FileInfo, HttpPostField } from "../types"',
    `export type DataCallbackOptions = ${union(optionKindMap.dataCallback)}`,
    `export type ProgressCallbackOptions = ${union(
      optionKindMap.progressCallback,
    )}`,
    `export type StringListOptions = ${union(optionKindMap.stringList)}`,
    `export type BlobOptions = ${union(optionKindMap.blob)}`,
    `export type SpecificOptions = DataCallbackOptions | ProgressCallbackOptions | StringListOptions | BlobOptions | ${union(
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
      `${optionDescription}${option.constantNameCamelCase}?: ${optionValueType} | null`,
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

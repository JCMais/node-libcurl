const cheerio = require('cheerio')

const { curly } = require('../../dist')
const { optionExtraDescriptionValueMap } = require('../data/options')

const {
  convertCurlConstantToCamelCase,
} = require('./convertCurlConstantToCamelCase')

const retrieveConstantList = async ({ url, constantPrefix, blacklist }) => {
  const { data } = await curly.get(url, {
    SSL_VERIFYPEER: false,
  })

  const $ = cheerio.load(data)

  const constants = $('.nroffip')

  return constants
    .map((i, el) => {
      const $descriptionEl = $(el).parent().next()

      $descriptionEl.find('a').remove()

      let description = $descriptionEl
        .text()
        .trim()
        .replace(/See$/, '')
        .replace(/>/g, '\\>')
        .trim()

      const constantOriginal = $(el).text()
      const constantName = constantOriginal.replace(constantPrefix, '')

      const url = `https://curl.haxx.se/libcurl/c/${constantOriginal}.html`

      if (optionExtraDescriptionValueMap[constantName]) {
        const extraDescription = optionExtraDescriptionValueMap[constantName]
        description = `${description}${extraDescription}`
      }

      return {
        constantOriginal,
        constantName,
        constantNameCamelCase: convertCurlConstantToCamelCase(constantName),
        description,
        url,
      }
    })
    .get()
    .sort((a, b) => a.constantName.localeCompare(b.constantName))
    .filter((item) => !blacklist.includes(item.constantOriginal))
}

module.exports = {
  retrieveConstantList,
}

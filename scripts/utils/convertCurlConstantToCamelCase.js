// The idea here is to conver a curl option name to a camel case one.
// For example, HSTSREADFUNCTION would become hstsReadFunction.
// This works by using the regexp below to break the option.
// When convertToDashCase is called for HSTSREADFUNCTION, it would first become (as the RegExp includes READ):
// HSTS_READFUNCTION
// Then (as the RegExp includes FUNCTION):
// HSTS_READ_FUNCTION
// and then the string is split on the `_`, and each item with index >= 1 has their first letter converted to uppercase
// the pieces are then joined back together, resulting in:
// hstsReadFunction

const regexp =
  /^([A-Z]+)(FUNCTION|CONNECTS|DATA|RESOLVE|VALUE|ALIASES|REDIRS|CERT|KEY|MAX|AGE|REDIR|DELAY|AGENT|OPTIONS|TEXT|USERPWD|PASSWD|LEVEL|SVC|SOCKET|SSL|PUBLIC|LOCATION|LIST|(?<!FUNCTI|SESSI|DELEGATI|VERSI|LOCATI|COMPRESSI|CONDITI)ON|ID|STATUS|ENGINE|PEER|HOSTS|HOST|ERROR|PROGRESS|SIGNAL|INFO|PATH|REFERER|MATCH|TYPE|TUNNEL|SIZE|OPEN|ALIVE|IDLE|INTVL|USERNAME|PASSWORD|AUTH|FIELDS|FIELD|OPT|HEADER|ALIASES|FILE|JAR|SESSION|LIST|TARGET|(?<!TAR)GET|WAIT|PROTOCOL|PORT|RANGE|QUOTE|METHOD|REQUEST|PROXY|LIFETIME|(?<!LIFE)TIME|ONLY|CONDITION|TIMEOUT|POST|V4|WRITE|READ|REQ)(_.*)?$/

function convertToDashCase(optionPart) {
  let optionConverted = optionPart
  while (optionConverted.search(regexp) !== -1) {
    optionConverted = optionConverted.replace(regexp, '$1_$2$3')
  }

  return optionConverted
}

function convertCurlConstantToCamelCase(option) {
  const pieces = option.split('_')
  return pieces
    .map((piece) => convertToDashCase(piece))
    .map((item) => (Array.isArray(item) ? item.join('_') : item))
    .join('_')
    .split('_')
    .map((item, idx) =>
      idx > 0
        ? item.charAt(0).toUpperCase() + item.slice(1).toLowerCase()
        : item.toLowerCase(),
    )
    .join('')
}

module.exports = {
  convertCurlConstantToCamelCase,
}

const regexp = /^([A-Z]+)(FUNCTION|CONNECTS|DATA|RESOLVE|VALUE|ALIASES|REDIRS|CERT|KEY|MAX|AGE|REDIR|DELAY|AGENT|OPTIONS|TEXT|USERPWD|PASSWD|LEVEL|SVC|SOCKET|SSL|PUBLIC|LOCATION|LIST|(?<!FUNCTI|SESSI|DELEGATI|VERSI|LOCATI|COMPRESSI|CONDITI)ON|ID|STATUS|ENGINE|PEER|HOSTS|HOST|ERROR|PROGRESS|SIGNAL|INFO|PATH|REFERER|MATCH|TYPE|TUNNEL|SIZE|OPEN|ALIVE|IDLE|INTVL|USERNAME|PASSWORD|AUTH|FIELDS|FIELD|OPT|HEADER|ALIASES|FILE|JAR|SESSION|LIST|TARGET|(?<!TAR)GET|WAIT|PROTOCOL|PORT|RANGE|QUOTE|METHOD|REQUEST|PROXY|TIME|ONLY|CONDITION|TIMEOUT|POST)(_.*)?$/

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

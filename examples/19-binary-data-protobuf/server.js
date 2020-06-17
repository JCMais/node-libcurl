const path = require('path')

const { gracefulShutdown } = require('./gracefulShutdown')

const PORT = process.env.PORT || '8080'

const protoPath = path.join(__dirname, 'mock.proto')

const run = async () => {
  const app = require('./app')({ protoPath })

  const server = await app.listen(PORT)
  gracefulShutdown(server)
}

run()
  .then(() => console.info(`Listening on port ${PORT}...`))
  .catch((e) => {
    console.error(`FATAL: ${e.message}`, { error: e })
    process.exit(1)
  })

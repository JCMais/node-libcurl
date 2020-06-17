const stoppable = require('stoppable')
const { promisify } = require('es6-promisify')

const noopFn = async () => {}

function gracefulShutdown(server, options = {}) {
  const {
    gracePeriod = process.env.GRACEFUL_SHUTDOWN_GRACE_PERIOD_MS || 5000,
    onShutdown = noopFn,
  } = options

  stoppable(server, gracePeriod)

  const asyncServerStop = promisify(server.stop).bind(server)

  const state = { isShuttingDown: false }

  async function cleanup(_signal) {
    if (!state.isShuttingDown) {
      state.isShuttingDown = true
      try {
        console.info('Gracefully shutting down service')
        console.info('Stopping http server')
        await asyncServerStop()
        console.info('Stopping resources')
        await onShutdown()
        process.removeListener('SIGTERM', cleanup)
        console.info('Gracefully shutdown service')
        process.kill(process.pid, 'SIGTERM')
      } catch (error) {
        console.error('Error during graceful shutdown', { error })
        process.exit(1)
      }
    }
  }

  process.on('SIGTERM', cleanup)
}

module.exports = {
  gracefulShutdown,
}

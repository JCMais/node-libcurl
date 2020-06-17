const Koa = require('koa')
const Router = require('@koa/router')
const getRawBody = require('raw-body')
const protobuf = require('protobufjs')

module.exports = ({ protoPath }) => {
  const app = new Koa()
  const router = new Router()

  app.use(async (ctx, next) => {
    ctx.protobufRoot = await protobuf.load(protoPath)

    return next()
  })

  app.use(async (ctx, next) => {
    ctx.request.rawBody = await getRawBody(ctx.req, {
      length: ctx.req.headers['content-length'],
      limit: '10mb',
    })

    return next()
  })

  router.post('/greet', async (ctx) => {
    const RequestGreet = ctx.protobufRoot.lookup('RequestGreet')
    const ResponseGreet = ctx.protobufRoot.lookup('ResponseGreet')

    const buffer = ctx.request.rawBody
    const decoded = RequestGreet.decode(buffer)
    console.log('Decoded payload:', decoded)

    const message = ResponseGreet.create({ message: `Hi ${decoded.name}!` })
    const responseEncoded = ResponseGreet.encode(message).finish()

    ctx.body = responseEncoded
  })

  app.use(router.routes())
  app.use(router.allowedMethods())

  return app
}

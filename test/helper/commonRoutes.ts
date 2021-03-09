import { Express } from 'express'

export const allMethodsWithMultipleReqResTypes = (
  app: Express,
  {
    putUploadBuffer = Buffer.alloc(0),
  }: {
    putUploadBuffer?: Buffer
  } = {},
) => {
  app.all('/all', (req, res) => {
    const method = req.method.toLowerCase()
    const dataAcc: Buffer[] = []

    switch (req.query.type) {
      case 'redirect-c':
        return res.redirect(301, '/all?type=redirect-b')
      case 'redirect-b':
        return res.redirect(301, '/all?type=redirect-a')
      case 'redirect-a':
        return res.redirect(301, '/all?type=json')
      case 'put-upload':
        req.on('data', (chunk) => {
          dataAcc.push(chunk)
        })

        req.on('end', () => {
          const data = Buffer.concat(dataAcc)
          res
            .set({
              'content-type': 'application/octet-stream',
              'x-is-same-buffer': Buffer.compare(data, putUploadBuffer),
            })
            .send(putUploadBuffer)
            .end()
        })
        break
      case 'no-content-type':
        res.writeHead(200)
        res.write('no content type :)')
        return res.end()
      case 'set-cookie':
        return res
          .cookie('test-a', 'abc', { httpOnly: true })
          .cookie('test-b', 'def')
          .send('')
      case 'no-body':
        return res.send()
      case 'method':
        return res.set({ 'x-req-method': method }).send(method)
      case 'json':
        return res
          .set({ 'content-type': 'application/json;charset=utf-8' })
          .json({
            test: true,
          })
      case 'json-body':
        return res
          .set({ 'content-type': 'application/json;charset=utf-8' })
          .json(req.body)
      case 'json-invalid':
        return res
          .set({ 'content-type': 'application/json;charset=utf-8' })
          .send("I'm invalid :)")
      case 'something':
        return res
          .contentType('application/something')
          .send('binary data would go here :)')
      default:
        return res.send('Hello World!')
    }
  })
}

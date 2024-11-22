import 'should'
import { app, host, port, server } from '../helper/server'
import { Curl } from '../../lib'

let curl: Curl
const urlLocalhost = `http://localhost:${port}/`
const urlTestLocalhost = `http://test.localhost:${port}/`

describe('DNS Resolution', () => {
  before((done) => {
    server.listen(port, host, () => done())

    app.get('/', (req, res) => {
      res.send({ message: 'resolved', ip: req.ip })
    })
  })

  after((done) => {
    server.close()
    app._router.stack.pop()
    done()
  })

  beforeEach(() => {
    curl = new Curl()
  })

  afterEach(() => {
    curl.close()
  })

  it('should resolve localhost to 127.0.0.1', (done) => {
    curl.setOpt('URL', urlLocalhost)

    curl.on('end', (status, data) => {
      if (status !== 200) {
        throw Error(`Invalid status code: ${status}`)
      }

      const result = JSON.parse(data as string)
      result.message.should.be.equal('resolved')
      result.ip.should.be.equal('::1')

      done()
    })

    curl.on('error', done)
    curl.perform()
  })

  it('should resolve test.localhost to 127.0.0.1', (done) => {
    // skip this test if windows because it does not support *.localhost on hosts file?
    // https://stackoverflow.com/questions/138162/wildcards-in-a-windows-hosts-file/4166967#4166967
    // if (process.platform === 'win32') {
    //   done()
    //   return
    // }
    curl.setOpt('URL', urlTestLocalhost)

    curl.on('end', (status, data) => {
      if (status !== 200) {
        throw Error(`Invalid status code: ${status}`)
      }

      const result = JSON.parse(data as string)
      result.message.should.be.equal('resolved')
      result.ip.should.be.equal('::1')

      done()
    })

    curl.on('error', done)
    curl.perform()
  })
})

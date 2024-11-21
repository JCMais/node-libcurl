import 'should'
import { Curl } from '../../lib'

describe('POST Request to API', () => {
  // UNSKIP TO RUN TEST - NOT ADDING TO CI PIPELINE UNTIL WE HAVE LOCAL REPRODUCIBLE SERVER
  // issue related to //SSL_CTX_set_options(sslctx, SSL_OP_IGNORE_UNEXPECTED_EOF);
  it.skip('should not fail with ssl error - version 1', (done) => {
    const curl = new Curl()

    const postData = JSON.stringify({
      vin: 'XXXXXXXXXXXXX',
      softwareTypes: [
        { softwareType: 'ovip-int-firmware-version' },
        { softwareType: 'map-eur' },
      ],
    })

    // related to issue https://github.com/Kong/insomnia/issues/6554#issuecomment-1737075302
    curl.setOpt(
      'URL',
      'https://api.groupe-psa.com/applications/majesticf/v1/getAvailableUpdate?client_id=20a4cf7c-f5fb-41d5-9175-a6e23b9880e5',
    )
    curl.setOpt('SSL_VERIFYPEER', false)
    curl.setOpt('POSTFIELDS', postData)
    curl.setOpt(Curl.option.HTTPHEADER, [
      'Content-Type: application/json',
      'User-Agent: insomnia/8.0.0-beta.0',
    ])

    curl.on('end', (statusCode, body) => {
      try {
        console.log('statusCode:', statusCode)
        console.log('body:', body)
        body.should.equal(
          '{"requestResult":"Incorrect VIN format","vin":"XXXXXXXXXXXXX"}',
        )
        curl.close()
        done()
      } catch (error) {
        console.error('error-1:', error)
        curl.close()
        done(error)
      }
    })

    curl.on('error', (error) => {
      console.error('error-2:', error)
      curl.close()
      done(error)
    })

    curl.perform()
  })
  it.skip('should not fail with ssl error - version 2', (done) => {
    const curl = new Curl()

    const postData = JSON.stringify({})

    // related to issue https://github.com/Kong/insomnia/issues/6554#issuecomment-1737075302
    curl.setOpt(
      'URL',
      'https://api.groupe-psa.com/applications/majesticf/v1/getAvailableUpdate?client_id=20a4cf7c-f5fb-41d5-9175-a6e23b9880e5',
    )
    curl.setOpt('SSL_VERIFYPEER', false)
    curl.setOpt('POSTFIELDS', postData)
    curl.setOpt(Curl.option.HTTPHEADER, [
      'Content-Type: application/json',
      'User-Agent: insomnia/8.0.0-beta.0',
    ])

    curl.on('end', (statusCode, body) => {
      try {
        console.log('statusCode:', statusCode)
        console.log('body:', body)
        body.should.equal('{"requestResult":"VIN empty"}')
        curl.close()
        done()
      } catch (error) {
        console.error('error-1:', error)
        curl.close()
        done(error)
      }
    })

    curl.on('error', (error) => {
      console.error('error-2:', error)
      curl.close()
      done(error)
    })

    curl.perform()
  })
})

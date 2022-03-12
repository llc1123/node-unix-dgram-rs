import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageName: string = require('./package.json').name
const localFileName = packageName.split('/').slice(-1)[0]

const supportedPlatforms = [
  'darwin-x64',
  'darwin-arm64',
  'freebsd-x64',
  'linux-x64-gnu',
  'linux-x64-musl',
  'linux-arm64-gnu',
  'linux-arm64-musl',
  'linux-arm-gnueabihf',
]

const getTriples = () => {
  const { platform, arch } = process
  switch (platform) {
    case 'linux':
      if (arch === 'arm') {
        return `${platform}-${arch}-gnueabihf`
      }
      return readFileSync('/usr/bin/ldd', 'utf8').includes('musl')
        ? `${platform}-${arch}-musl`
        : `${platform}-${arch}-gnu`
    default:
      return `${platform}-${arch}`
  }
}

const getNativeBinding = () => {
  const triples = getTriples()
  if (supportedPlatforms.includes(triples)) {
    const localFileExisted = existsSync(
      join(__dirname, `${localFileName}.${triples}.node`),
    )
    if (localFileExisted) {
      return require(`./${localFileName}.${triples}.node`)
    } else {
      return require(`${packageName}-${triples}`)
    }
  } else {
    throw new Error(`Unsupported OS: ${triples}`)
  }
}

const { plus100 } = getNativeBinding()

export default plus100

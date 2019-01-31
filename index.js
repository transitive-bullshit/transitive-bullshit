#!/usr/bin/env node

const opn = require('opn')

module.exports = async () => {
  return opn('https://transitivebullsh.it', { wait: false })
}

if (!module.parent) {
  module.exports()
    .then(() => {
      console.log('Try using your mouse to play with the fluid 😀')
      process.exit(0)
    })
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}

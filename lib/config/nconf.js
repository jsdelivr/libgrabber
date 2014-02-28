var path = require('path');
var nconf = require('nconf');

nconf
  .argv()
  .env()
  .file(path.join(process.cwd(), 'config.json'))
  .defaults(require('./defaults'));

module.exports = nconf;
var path = require('path');
var nconf = require('nconf');

nconf
  .argv()
  .file(path.join(process.cwd(), 'config.json'))
  .defaults(require('./defaults'));

module.exports = nconf;
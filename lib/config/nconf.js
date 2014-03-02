var path = require('path');
var nconf = require('nconf');

nconf
  .argv()
  .env()
  .file(path.join(process.cwd(), 'libgrabberHome.config.json'))
  .defaults(require('./defaults'));

module.exports = nconf;
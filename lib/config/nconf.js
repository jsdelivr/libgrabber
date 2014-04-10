var path = require('path');
var nconf = require('nconf');

nconf
  .argv()
  .env();

var configFile = nconf.get('config') ? nconf.get('config') : path.join(process.cwd(), 'libgrabber.config.json');

nconf
  .file(configFile)
  .defaults(require('./defaults'));

module.exports = nconf;
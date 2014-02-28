var path = require('path');

var home = process.env.HOME || process.env.USERPROFILE;
var cwd = process.cwd();

var defaults = {
  jsDelivrPath: cwd,
  jsDelivrProjectsDir: 'files',
  cache: path.join(home, '.libgrabber', 'cache'),
  metadataFileName: 'update.json'
};

module.exports = defaults;
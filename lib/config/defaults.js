var path = require('path');

var userHome = process.env.HOME || process.env.USERPROFILE;
var cwd = process.cwd();

var libgrabberHome = path.join(userHome, '.libgrabber');

var defaults = {
  jsDelivrPath: cwd,
  jsDelivrProjectsDir: 'files',
  libgrabberHome: libgrabberHome,
  tmp: path.join(libgrabberHome, 'tmp'),
  cache: path.join(libgrabberHome, 'cache'),
  metadataFileName: 'update.json'
};

module.exports = defaults;
var path = require('path');
var os = require('os');
var npmconf = require('npmconf');

npmconf.load();

var cwd = process.cwd();

var defaults = {
  jsDelivrPath: cwd,
  jsDelivrProjectsDir: 'files',
  metadataFileName: 'update.json',
  tmp: path.join(os.tmpdir(), 'libgrabberTmp'),
  npmCache: npmconf.defaults.cache,
  'mention-repo-owner': false
};

module.exports = defaults;
var path = require('path');
var os = require('os');
var npmconf = require('npmconf');

npmconf.load();

var cwd = process.cwd();

var defaults = {
  'jsdelivr-path': cwd,
  'jsdelivr-projects-dir': 'files',
  'metadata-file': 'update.json',
  'npm-cache': npmconf.defaults.cache,
  'mention-repo-owner': false,
  'tmp': path.join(os.tmpdir(), 'libgrabberTmp')
};

module.exports = defaults;
var path = require('path');
var os = require('os');
var execSync = require('child_process').execSync;

var cwd = process.cwd();
var defaults = {
  'jsdelivr-path': cwd,
  'jsdelivr-projects-dir': 'files',
  'metadata-file': 'update.json',
  'npm-cache': execSync('npm config get cache').toString().trim(),
  'mention-repo-owner': false,
  'tmp': path.join(os.tmpdir(), 'libgrabberTmp')
};

module.exports = defaults;

var vfs = require('vinyl-fs');
var es = require('event-stream');
var path = require('path');
var _ = require('lodash');

var config = require('./config');
var project = require('./project');

// TODO: Create cache dir

function traverse(projectsPath) {
  vfs
    .src([path.join('*', config.metadataFileName)], { cwd: projectsPath })
    .pipe(es.map(function (vinyl) {
      var metadataPath = vinyl.path;
      var projectPath = path.dirname(metadataPath);

      project.update(metadataPath, projectPath, function (err, result) {
        if (err) {
          throw err;
        }

        if (result.updated) {
          console.log('project ' + result.metadata.name +  ' updated to ' + result.version);
        } else {
          console.log('project ' + result.metadata.name +  ' not updated ');
        }
      });
    }));
}

module.exports = {
  traverse: traverse
};
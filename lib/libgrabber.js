var path = require('path');
var _ = require('lodash');
var glob = require('glob');
var async = require('async');

var config = require('./config');
var project = require('./project');

function updateAll(jsDelivrPath, projectsPath) {
  traverse(projectsPath, function (err, metadataPaths) {
    if (err) {
      throw err;
    }

    async.eachLimit(metadataPaths, 1, async.apply(update, jsDelivrPath), function (err) {
      if (err) {
        throw err;
      }
    });
  });
}

function traverse(projectsPath, callback) {
  glob(path.join(projectsPath, '*', config.get('metadataFileName')), callback);
}

function update(jsDelivrPath, metadataPath, callback) {
  async.waterfall([
    async.apply(project.check, metadataPath),
    project.update,
    async.apply(project.commit, jsDelivrPath)
  ], callback);
}

module.exports = {
  updateAll: updateAll,
  update: update
};
var path = require('path');
var _ = require('lodash');
var glob = require('glob');
var async = require('async');

var config = require('./config');
var logger = require('./logger');
var project = require('./project');

function updateAll(jsDelivrPath, projectsPath) {
  logger.info('Updating all projects');
  traverse(projectsPath, function (err, metadataPaths) {
    if (err) {
      logger.error('Traverse error', { error: err });

      throw err;
    }

    async.eachLimit(metadataPaths, 1, async.apply(update, jsDelivrPath), function (err) {
      if (err) {
        logger.error('Failed to update project', { error: err });

        return;
      }

      logger.info('Finished updating all projects');
    });
  });
}

function traverse(projectsPath, callback) {
  glob(path.join(projectsPath, '*', config.get('metadataFileName')), callback);
}

function update(jsDelivrPath, metadataPath, callback) {
  logger.debug('Updating using metadata' + metadataPath);

  async.waterfall([
    async.apply(project.check, metadataPath),
    project.update,
    async.apply(project.commit, jsDelivrPath)
  ], function (err, updateInfo) {
    if (err) {
      logger.error('Failed to update project %s', metadataPath, { error: err });

      return callback(err);
    }

    logger.info('Updated project %s to %s', updateInfo.metadata.name, updateInfo.version, { updateInfo: updateInfo });

    return callback(null, updateInfo);
  });
}

module.exports = {
  updateAll: updateAll,
  update: update
};
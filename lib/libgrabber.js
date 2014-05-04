var path = require('path');
var _ = require('lodash');
var glob = require('glob');
var async = require('async');
var remove = require('remove');
var gift = require('gift');

var config = require('./config');
var logger = require('./logger');
var project = require('./project');

function updateAll(jsDelivrPath, projectsPath) {
  logger.info('Updating all projects');
  syncRepo(function () {
    traverse(projectsPath, function (err, metadataPaths) {
      if (err) {
        logger.error('Traverse error', { error: err });

        throw err;
      }

      async.eachLimit(metadataPaths, 1, function (metadataPath, callback) {
        update(jsDelivrPath, metadataPath, function (err, result) {
          if (err) {
            // suppress error from propagating and go on with the next project
            logger.error('Failed to update project', { error: err });
          }

          callback(null, result);
        });
      }, function () {
        cleanTmp();
        switchToMaster();

        logger.info('Finished updating all projects');
      });
    });
  });
}

function traverse(projectsPath, callback) {
  glob(path.join(projectsPath, '*', config.get('metadata-file')), callback);
}

function update(jsDelivrPath, metadataPath, callback) {
  logger.debug('Updating using metadata' + metadataPath);

  async.waterfall([
    async.apply(project.check, metadataPath),
    project.update,
    async.apply(project.commit, jsDelivrPath),
    async.apply(project.pullRequest, jsDelivrPath)
  ], function (err, updateInfo) {
    if (err) {
      logger.error('Failed to update project %s', metadataPath, { error: err });

      return callback(err);
    }

    if (updateInfo.version && updateInfo.updated) {
      logger.info('Updated project %s to %s', updateInfo.metadata.name, updateInfo.version, { updateInfo: updateInfo });
    } else {
      logger.info('Project %s not updated', updateInfo.metadata.name, { updateInfo: updateInfo });
    }

    return callback(null, updateInfo);
  });
}

function syncRepo(callback) {
  var repo = gift(config.get('jsdelivr-path'));
  repo.checkout('master', function () {
    repo.git.cmd('fetch', {}, ['upstream', 'master'], function () {
      repo.git.cmd('merge', {}, ['upstream/master'], function () {
        repo.git.cmd('push', {}, ['origin', 'master'], function () {
          callback(null);
        });
      });
    });
  });
}

function cleanTmp() {
  var packageDir = config.get('tmp');

  remove(packageDir, _.noop);
}

function switchToMaster() {
  var repo = gift(config.get('jsdelivr-path'));
  repo.checkout('master');
}

module.exports = {
  updateAll: updateAll,
  update: update
};
var path = require('path');
var _ = require('lodash');
var glob = require('glob');
var async = require('async');
var remove = require('remove');
var gift = require('gift');

var config = require('./config');
var logger = require('./logger');
var project = require('./project');

function updateAll(jsDelivrPath, projectsPath, projectToUpdate) {

  var projectToUpdate_metaDataPath = null;

  if (!projectToUpdate)
    logger.info('Updating all projects');
  else {
    logger.info('Updating project %s', projectToUpdate);
    projectToUpdate_metaDataPath = path.join(projectsPath, projectToUpdate, '/update.json');
  }

  syncRepo(function () {
    traverse(projectsPath, function (err, metadataPaths) {
      if (err) {
        logger.error('Traverse error', {error: err});

        throw err;
      }

      if (projectToUpdate_metaDataPath) {
        metadataPaths = _.filter(metadataPaths, function (path) {
          return projectToUpdate_metaDataPath === path;
        });
      }

      reduceReposToUpdate(metadataPaths, function (err, projects) {
        if (err) {
          return logger.error(err);
        }
        async.eachSeries(projects, function (proj, callback) {
          update(jsDelivrPath, proj, function (err, result) {
            if (err) {
              // suppress error from propagating and go on with the next project
              logger.error('Failed to update project', {error: err});
            }

            callback(null, result);
          });
        }, function () {
          cleanTmp();
          switchToMaster();

          logger.info('Finished updating projects');
          logger.close();
        });
      });
    });
  });
}

function traverse(projectsPath, callback) {
  glob(path.join(projectsPath, '*', config.get('metadata-file')), callback);
}

// Determine all of the repos that should be updated (in parallel)
function reduceReposToUpdate(paths, callback) {
  async.mapLimit(paths, 15, project.check, function (err, projects) {
    // Filter out the ones which error or don't need updates (no updateRemote)
    callback(null, _.filter(projects, 'updateRemote'));
  });
}

function update(jsDelivrPath, proj, callback) {
  logger.debug('Updating using metadata %s', proj.metadataPath);
  var updates = [];
  async.eachSeries(proj.versions, function (version, done) {
    proj.version = version;
    async.waterfall([
      async.apply(project.update, proj),
      async.apply(project.commit, jsDelivrPath),
      async.apply(project.pullRequest, jsDelivrPath)
    ], function (err, updateInfo) {

      if (err) {
        logger.error('Failed to update project %s', proj.metadataPath, {error: err});
        return done(err);
      }

      if (updateInfo.version && updateInfo.updated) {
        logger.info('Updated project %s to %s', updateInfo.metadata.name, updateInfo.version, {updateInfo: updateInfo});
      }
      else {
        logger.info('Project %s not updated', updateInfo.metadata.name, {updateInfo: updateInfo});
      }

      updates.push(updateInfo);
      return done(null, updateInfo);
    });
  }, function (err) {
    return callback(err, updates);
  });
}

function syncRepo(callback) {
  var repo = gift(config.get('jsdelivr-path'));
  repo.checkout('master', function () {
    repo.remote_fetch('upstream', function (err) {
      repo.git.cmd('reset', {}, ['--hard', 'upstream/master'], function (err) {
        repo.git.cmd('push', {}, ['--force', 'origin', 'master'], function (err) {
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
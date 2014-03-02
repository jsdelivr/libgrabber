var vfs = require('vinyl-fs');
var path = require('path');
var jsonfile = require('jsonfile');
var concat = require('concat-stream');
var async = require('async');
var _ = require('lodash');
var semver = require('semver');
var gift = require('gift');

var config = require('./config');
var logger = require('./logger');
var util = require('./util');
var packageManagers = require('./packageManagers');

function check(metadataPath, callback) {
  metadata(metadataPath, function (err, metadata) {
    if (err) {
      logger.warn('Failed to read metadata', { metadataPath: metadataPath, error: err });
      return callback(err);
    }
    var local = _(metadata.localVersions).last();
    var remote = _(metadata.remoteVersions).last();

    var result;
    if (local === undefined || semver.gt(remote, local)) {
      result = {
        metadata: metadata,
        version: remote
      };
    } else {
      result = {
        metadata: metadata
      };
    }

    callback(null, result);
  });
}

function update(updateInfo, callback) {
  var metadata = updateInfo.metadata;
  var version = updateInfo.version;
  var projectPath = metadata.path;

  if (version) {
    logger.info('Updating %s to %s', metadata.name, version);

    var cleanVersion = semver.clean(version);
    var pm = packageManagers.get(metadata.packageManager);
    var packageId = metadata.packageManager == 'github' ? metadata.repo : metadata.name;

    var packagesTempPath = path.join(config.get('tmp'));

    var from = path.join(packagesTempPath, metadata.name, cleanVersion);
    var to = path.join(projectPath, cleanVersion);

    pm.install(packageId, version, from, function (err) {
      if (err) {
        logger.warn('Failed to download and install package', { name: metadata.name, version: version, error: err});

        callback(err);
        return;
      }

      util.copy(from, to, metadata.files, function (files) {
        logger.info('Copied %d files', files.length, {name: metadata.name, version: version, files: _.pluck(files, 'path')})

        callback(null, _.extend(updateInfo, { updated: true, updatePath: to }));
      });
    });
  } else {
    logger.debug('Skipping project %s update, already at latest version', metadata.name);

    callback(null, _.extend(updateInfo, { updated: false }));
  }
}

function metadata(metadataFile, callback) {
  jsonfile.readFile(metadataFile, function (err, metadata) {
    if (err) {
      logger.error('Error in reading metadata file %s', metadataFile, { error: err });
      callback(err);
      return;
    }

    var projectPath = path.dirname(metadataFile);
    _.extend(metadata, { path: projectPath });

    async.series({
      localVersions: async.apply(localVersions, metadata),
      remoteVersions: async.apply(remoteVersions, metadata)
    }, function (err, versions) {
      if (err) {
        logger.error('Error in getting package versions', { error: err, metadata: metadata });

        callback(err);
        return;
      }

      logger.debug('Read metadata', { metadata: metadata, versions : versions });
      callback(null, _.extend(metadata, versions));
    });
  });
}

function localVersions(metadata, callback) {
  vfs.src(['*'], { cwd: metadata.path})
    .pipe(util.vinyl.dirs())
    .pipe(util.vinyl.semver())
    .pipe(concat({ encoding: 'object'}, function (versions) {
      versions = _(versions)
        .filter(semver.valid)
        .sort(semver.compare)
        .value();
      callback(null, versions);
    }));
}

function remoteVersions(metadata, callback) {
  var pmId = metadata.packageManager;
  var pm = packageManagers.get(pmId);
  var packageId = pmId === 'github' ? metadata.repo : metadata.name;

  pm.versions(packageId, function (err, versions) {
    if (err) {
      return callback(err);
    }

    versions = _(versions)
      .filter(semver.valid)
      .sort(semver.compare)
      .value();

    callback(null, versions);
  });
}

function commit(cdnGitPath, updateInfo, callback) {
  if (updateInfo.updated) {
    var commitDir = path.resolve(updateInfo.updatePath);
    var repo = gift(cdnGitPath);

    repo.add(path.resolve(commitDir), function (err) {
      if (err) {
        logger.error('Git add path %s to repo %s failed. ', cdnGitPath, commitDir);

        callback(err);
        return;
      }

      var options = {
        message: '"Update project ' + updateInfo.metadata.name + ' to ' + updateInfo.version + '"'
      };
      var args = ['--', commitDir];
      repo.git.cmd('commit', options, args, function (err) {
        if (err) {
          logger.error('Git commit of path %s failed ', commitDir, {
            name: updateInfo.metadata.name,
            version: updateInfo.version
          });

          callback(err);
          return;
        }

        logger.info('Git commit %s %s success', updateInfo.metadata.name, updateInfo.version);

        callback(null, updateInfo);
      });
    });
  } else {
    callback(null, updateInfo);
  }
}

module.exports = {
  check: check,
  metadata: metadata,
  update: update,
  commit: commit
};
var vfs = require('vinyl-fs');
var path = require('path');
var jsonfile = require('jsonfile');
var concat = require('concat-stream');
var async = require('async');
var _ = require('lodash');
var semver = require('semver');
var gift = require('gift');

var config = require('./config');
var util = require('./util');
var packageManagers = require('./packageManagers');

function check(metadataPath, callback) {
  metadata(metadataPath, function (err, metadata) {
    if (err) {
      callback(err);
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
    var cleanVersion = semver.clean(version);
    var pm = packageManagers.get(metadata.packageManager);
    var packageId = metadata.packageManager == 'github' ? metadata.repo : metadata.name;

    var packagesTempPath = path.join(config.get('cache'), 'packages');
    var extractPath = path.join(packagesTempPath, metadata.name, cleanVersion);
    var downloadPath = path.join(packagesTempPath, metadata.name);
    var fileName = cleanVersion + '.tar.gz';

    var from = path.join(extractPath);
    var to = path.join(projectPath, cleanVersion);
    async.waterfall([
      async.apply(pm.url, packageId, version),
      async.apply(util.download, downloadPath, fileName),
      async.apply(util.extract, extractPath),
      async.apply(util.mkdirp, to)
    ], function (err) {
      if (err) {
        callback(err);
        return;
      }

      util.copy(from, to, metadata.files, function () {
        callback(null, _.extend(updateInfo, { updated: true, updatePath: to }));
      });
    });
  } else {
    callback(null, _.extend(updateInfo, { updated: false }));
  }
}

function metadata(metadataFile, callback) {
  jsonfile.readFile(metadataFile, function (err, metadata) {
    if (err) {
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
        callback(err);
        return;
      }

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
        callback(err);
        return;
      }

      var options = {
        message: '"Update project ' + updateInfo.metadata.name + ' to ' + updateInfo.version + '"'
      };
      var args = ['--', commitDir];
      repo.git.cmd('commit', options, args, function (err) {
        if (err) {
          callback(err);
          return;
        }

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
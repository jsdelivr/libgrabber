var vfs = require('vinyl-fs');
var path = require('path');
var jsonfile = require('jsonfile');
var concat = require('concat-stream');
var async = require('async');
var _ = require('lodash');
var semver = require('semver');

var config = require('./config');
var util = require('./util');
var packageManagers = require('./packageManagers');

function check(metadataPath, projectPath, callback) {
  metadata(metadataPath, function (err, metadata) {
    if (err) {
      callback(err);
    }

    var local = _(metadata.localVersions).last();
    var remote = _(metadata.remoteVersions).last();

    if (local === undefined || semver.gt(remote, local)) {
      update(metadata, remote, projectPath, function (err, updated) {
        callback(null, {
          metadata: metadata,
          updated: updated,
          version: remote
        });
      })
    } else {
      callback(null, {
        metadata: metadata,
        updated: false
      });
    }
  });
}

function update(metadata, version, projectPath, callback) {
  var pm = packageManagers.get(metadata.packageManager || "github");

  // TODO: clean dir when finished
  var extractPath = path.join(config.cache, metadata.name + '-' + version);
  // TODO: npm packs dist in 'package' dir, other package managers don't
  var from = path.join(extractPath, 'package');
  var to = path.join(projectPath, version);
  async.waterfall([
    async.apply(pm.url, metadata.name, version),
    async.apply(util.download, extractPath),
    async.apply(util.mkdirp, to)
  ], function (err) {
    if (err) {
      callback(err);
      return;
    }

    util.copy(from, to, metadata.files, function () {
      callback(null, true);
    });
  });
}

function metadata(metadataFile, callback) {
  jsonfile.readFile(metadataFile, function (err, metadata) {
    if (err) {
      return callback(err);
    }

    var projectPath = path.dirname(metadataFile);
    _.extend(metadata, { path: projectPath });

    async.series({
      localVersions: async.apply(localVersions, metadata),
      remoteVersions: async.apply(remoteVersions, metadata)
    }, function (err, versions) {
      if (err) {
        return callback(err);
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
      callback(null, _(versions).sort(semver.compare).value());
    }));
}

function remoteVersions(metadata, callback) {
  var pmId = metadata.packageManager || "github";
  var pm = packageManagers.get(pmId);
  pm.versions(metadata.name, function (err, versions) {
    if (err) {
      return callback(err);
    }

    callback(null, _(versions).sort(semver.compare).value());
  });
}

module.exports = {
  update: check,
  metadata: metadata
};
var _ = require('lodash');
var path = require('path');
var RegClient = require('silent-npm-registry-client');
var async = require('async');
var semver = require('semver');

var config = require('../config');
var util = require('../util');

var NpmClient = function () {
  this._client = new RegClient({
    registry: 'http://registry.npmjs.org',
    cache: path.join(config.get('cache'), 'npm')
  });
  this._packagesTempPath = path.join(config.get('cache'), 'packages');
};

NpmClient.prototype.versions = function (name, callback) {
  this._getPackage(name, function (err, data) {
    if (err) {
      return callback(err);
    }

    var versions = _(data.versions)
      .map(function (value, key) {
        return key;
      })
      .value();

    callback(null, versions);
  });
};

NpmClient.prototype._url = function (name, version, callback) {
  this._getPackage(name, function (err, data) {
    if (err) {
      return callback(err);
    }

    var url = data.versions[version].dist.tarball;

    callback(null, url);
  });
};

NpmClient.prototype.install = function (name, version, installPath, callback) {
  var self = this;

  var extractPath = path.join(this._packagesTempPath, name, version);
  var downloadPath = path.join(this._packagesTempPath, name);
  var fileName = version + '.tar.gz';

  async.waterfall([
    function (callback) { self._url(name, version, callback); },
    async.apply(util.download, downloadPath, fileName),
    async.apply(util.extract, extractPath),
    async.apply(util.mkdirp, installPath)
  ], callback);
};

NpmClient.prototype._getPackage = function (name, callback) {
  this._client.get(name, callback);
};

module.exports = new NpmClient();
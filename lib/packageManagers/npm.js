var _ = require('lodash');
var path = require('path');
var RegClient = require('npm-registry-client');
var async = require('async');

var config = require('../config');
var util = require('../util');


var NpmClient = function () {
  this._client = new RegClient({
    registry: 'http://registry.npmjs.org',
    cache: config.get('npm-cache'),
    log: {
      error: _.noop, warn: _.noop, info: _.noop,
      verbose: _.noop, silly: _.noop, http: _.noop,
      pause: _.noop, resume: _.noop
    }
  });
  this._packagesTempPath = path.join(config.get('tmp'));
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
  var extractPath = path.join(this._packagesTempPath, name, version);
  var downloadPath = path.join(this._packagesTempPath, name);
  var fileName = version + '.tar.gz';

  async.waterfall([
    this._url.bind(this, name, version),
    function (url, callback) { util.download(downloadPath, fileName, url, {}, callback) },
    async.apply(util.extract, extractPath),
    async.apply(util.mkdirp, installPath)
  ], callback);
};

NpmClient.prototype.repo = function (name, callback) {
  this._getPackage(name, function (err, data) {
    if (err) {
      return callback(err);
    } else if (!data.repository) {
      return callback(new Error("npm: Failed to retrieve " + name));
    }

    var repository = data.repository;
    var repo = repository.type === 'git' ? repository.url : null;

    callback(null, repo);
  });
};

NpmClient.prototype._getPackage = function (name, callback) {
  this._client.get('https://registry.npmjs.org/' + name, {}, callback);
};

module.exports = new NpmClient();

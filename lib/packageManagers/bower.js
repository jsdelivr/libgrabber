var _ = require('lodash');
var path = require('path');
var bower = require('bower');

var config = require('../config');

var cache = {};

var BowerClient = function () {
  this._client = bower;
};

BowerClient.prototype.versions = function (name, callback) {
  this._client.commands
    .info(name)
    .on('error', function (err) {
      callback(err);
    })
    .on('end', function (result) {
      var versions = result.versions;

      callback(null, versions);
    });
};

BowerClient.prototype.install = function (name, version, installPath, callback) {
  var installDir = path.resolve(installPath, '..');

  // see https://github.com/bower/bower#using-a-different-name-and-a-specific-version-of-a-package
  // <installDir>=<packageName>#<version>
  var endpoint = version + '=' + name + '#' + version;

  bower.commands
    .install([endpoint], {}, {
      cwd: installDir,
      directory: ''
    })
    .on('error', function (err) {
      callback(err);
    })
    .on('end', function (results) {
      callback(null, results);
    });
};

module.exports = new BowerClient();
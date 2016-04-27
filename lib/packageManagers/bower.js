var path = require('path');
var bower = require('bower');
var RegistryClient = require('bower-registry-client');
var Config = require('bower-config');

var BowerClient = function () {
  this._client = bower;
  this._registryClient = new RegistryClient(Config.read(process.cwd()));
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

BowerClient.prototype.repo = function (name, callback) {
  this._registryClient.lookup(name, function (err, res) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, res.url);
  });
};

module.exports = new BowerClient();

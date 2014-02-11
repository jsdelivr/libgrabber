var _ = require('lodash');
var path = require('path');

var config = require('../config');

var RegClient = require('silent-npm-registry-client');
var client = new RegClient({
  registry: 'http://registry.npmjs.org',
  cache: path.join(config.cache, 'npm')
});

function versions(name, callback) {
  _getPackage(name, function (err, data) {
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
}

function url(name, version, callback) {
  _getPackage(name, function (err, data) {
    if (err) {
      return callback(err);
    }

    var url = data.versions[version].dist.tarball;

    callback(null, url);
  });
}

function _getPackage(name, callback) {
  client.get(name, callback);
}

module.exports = {
  versions: versions,
  url: url
};
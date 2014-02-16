var _ = require('lodash');

var GitHupApi = require('github');

var cache = {};
var client = _getClient();

function versions(name, callback) {
  _getTags(name, function (err, tags) {
    if (err) {
      return callback(err);
    }

    var versions = _.pluck(tags, 'name');

    callback(null, versions);
  });
}

function url(name, version, callback) {
  _getTags(name, function (err, tags) {
    if (err) {
      return callback(err);
    }

    var tag = _(tags)
      .find(function (tag) {
        return tag.name === version;
      });

    var url = tag ? tag['tarball_url'] : null;
    callback(null, url);
  });
}

function _getTags(name, callback) {
  if (cache[name]) {
    process.nextTick(function () {
      callback(null, cache[name]);
    });
    return;
  }

  var usernameRepo = name.split('/');

  client.repos.getTags({
    user: usernameRepo[0],
    repo: usernameRepo[1]
  }, function (err, data) {
    if (err) {
      callback(err);
      return;
    }

    cache[name] = data;
    callback(null, data);
  });
}

function _getClient() {
  var client = new GitHupApi({
    version: '3.0.0',
    protocol: 'https'
  });

  return client;
}

module.exports = {
  versions: versions,
  url: url
};
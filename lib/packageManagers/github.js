var _ = require('lodash');
var path = require('path');
var async = require('async');
var semverish = require('semvish');
var GitHupApi = require('github');

var config = require('../config');
var util = require('../util');

var cache = {};

var GitHubClient = function () {
  this._packagesTempPath = path.join(config.get('tmp'));

  var accessToken = config.get('github-access-token');
  this._client = this._getClient(accessToken);
};

GitHubClient.prototype.versions = function (name, callback) {
  this._getTags(name, function (err, tags) {
    if (err) {
      return callback(err);
    }

    var versions = _.pluck(tags, 'name');

    return callback(null, versions);
  });
};

GitHubClient.prototype._url = function url(name, version, callback) {
  this._getTags(name, function (err, tags) {
    if (err) {
      return callback(err);
    }

    var tag = _(tags)
      .find(function (tag) {
        return tag.name === version;
      });

    var url = tag ? tag['tarball_url'] : null;
    return callback(null, url);
  });
};

GitHubClient.prototype.install = function (name, version, installPath, callback) {
  var self = this;

  var packageId = name.split('/')[1];
  var cleanVersion = semverish.clean(version);

  var downloadPath = path.join(this._packagesTempPath, packageId);
  var fileName = cleanVersion + '.tar.gz';

  async.waterfall([
    function (callback) { self._url(name, version, callback); },
    async.apply(util.download, downloadPath, fileName),
    async.apply(util.extract, installPath),
    async.apply(util.mkdirp, installPath)
  ], callback);
};

GitHubClient.prototype.pullRequest = function (message, callback) {
  this._client.pullRequests.create(message, callback);
};

GitHubClient.prototype.repo = function (name, callback) {
  var repo = 'https://github.com/' + name;
  callback(null, repo);
};

GitHubClient.prototype._getTags = function(name, callback) {
  if (cache[name]) {
    process.nextTick(function () {
      callback(null, cache[name]);
    });
    return;
  }

  var usernameRepo = name.split('/');

  this._client.repos.getTags({
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
};

GitHubClient.prototype._getClient = function(accessToken) {
  var client = new GitHupApi({
    version: '3.0.0',
    protocol: 'https'
  });

  if (accessToken) {
    client.authenticate({
      type: 'oauth',
      token: accessToken
    });
  }

  return client;
};

module.exports = new GitHubClient();

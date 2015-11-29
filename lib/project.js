var vfs = require('vinyl-fs');
var path = require('path');
var jsonfile = require('jsonfile');
var concat = require('concat-stream');
var async = require('async');
var _ = require('lodash');
var semverish = require('semvish');
var gift = require('gift');
var remove = require('remove');

var config = require('./config');
var logger = require('./logger');
var util = require('./util');
var packageManagers = require('./packageManagers');
var templates = require('./templates');

function check(metadataPath, callback) {
  logger.debug('Checking project at %s', metadataPath);
  metadata(metadataPath, function (err, metadata) {
    if (err) {
      logger.warn('Failed to read metadata', { metadataPath: metadataPath, error: err });
      return callback(null, null);
    }
    var fsVersion = _.last(metadata.localVersions);
    var branchVersion = _.last(metadata.branchVersions);
    var lastInstalled = fsVersion && branchVersion ?
      semverish.gt(fsVersion, branchVersion) ? fsVersion : branchVersion
      : fsVersion || branchVersion;

    var lastAvailable = _.last(metadata.remoteVersions);
    
    var updateRemote = lastInstalled === undefined && lastAvailable !== undefined;
    if (lastInstalled && lastAvailable) {
      updateRemote = semverish.gt(lastAvailable, lastInstalled);
    }

    var result = {
      metadata: metadata,
      updateRemote: updateRemote,
      metadataPath: metadataPath,
      versions: []
    };
    if (updateRemote) {
      result.versions = _.takeRightWhile(metadata.remoteVersions, function (version) {
        return semverish.clean(version) !== lastInstalled;
      });
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

    var cleanVersion = semverish.clean(version);
    var pm = packageManagers.get(metadata.packageManager);
    var packageId = metadata.packageManager === 'github' ? metadata.repo : metadata.name;

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

        logger.info('Copied %d files', files.length, {name: metadata.name, version: version, files: _.pluck(files, 'path')});

        if (files.length === 0) {
          logger.warn('Something might be wrong with update.json', { name: metadata.name, version: version });

          remove(to, _.noop);
          callback(null, _.extend(updateInfo, { updated: false }));
        } else {
          callback(null, _.extend(updateInfo, { updated: true, updatePath: to }));
        }
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
      remoteVersions: async.apply(remoteVersions, metadata),
      branchVersions: async.apply(branchVersions, metadata)
    }, function (err, versions) {
      if (err) {
        logger.error('Error in getting package versions', { error: err, metadata: metadata });

        callback(err);
        return;
      }

      logger.debug('Read metadata', { metadata: metadata, versions: versions });
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
        .filter(function (v) {
          return semverish.valid(v);
        })
        .sort(semverish.compare)
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
      .filter(function (v) {
        return semverish.valid(v);
      })
      .sort(semverish.compare)
      .value();

    callback(null, versions);
  });
}

function branchVersions(metadata, callback) {
  var repo = gift(config.get('jsdelivr-path'));
  repo.git.cmd('ls-remote', {}, ['--heads', 'origin'], function (err, res) {
    if (err) {
      logger.error('Error in getting branches', { error: err, metadata: metadata });

      callback(err);
      return;
    }

    var regex = /refs\/heads\/([^\s]+)/;
    var lines = res.split('\n');
    var versions = _(lines)
      .map(function (line) {
        var match = regex.exec(line);

        return match ? match[1] : null;
      })
      .compact()
      .map(function (branch) {
        var nameVersion = branch.split('/');
        return nameVersion.length === 2 ? { name: nameVersion[0], version: nameVersion[1]} : null;
      })
      .compact()
      .filter({
        name: metadata.name
      })
      .pluck('version')
      .filter(function (v) {
        return semverish.valid(v);
      })
      .sort(semverish.compare)
      .value();

    callback(null, versions);
  });
}

function commit(jsDelivrPath, updateInfo, callback) {
  if (updateInfo.updated) {
    var commitDir = path.resolve(updateInfo.updatePath);
    var repo = gift(jsDelivrPath);
    var branchName = updateInfo.metadata.name + '/' + updateInfo.version;

    async.series([
      async.apply(repo.checkout.bind(repo), 'master'),
      async.apply(repo.create_branch.bind(repo), branchName),
      async.apply(repo.checkout.bind(repo), branchName)
    ], function (err) {
      if (err) {
        logger.error('Failed to create branch %s', branchName);

        remove(commitDir, _.noop);

        callback(err);
        return;
      }

      repo.add(path.resolve(commitDir), function (err) {
        if (err) {
          logger.error('Git add path %s to repo %s failed. ', jsDelivrPath, commitDir);

          remove(commitDir, _.noop);

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

            remove(commitDir, _.noop);

            callback(err);
            return;
          }

          repo.git.cmd('push', {}, ['origin', branchName], function (err) {
            if (err) {
              logger.error('Git push has failed ', {
                name: updateInfo.metadata.name,
                version: updateInfo.version,
                err: err
              });

              deleteRemoteAndLocalBranch(jsDelivrPath, branchName, function () {
                callback(err);
              });

              remove(commitDir, _.noop);

              return;
            }

            logger.info('Git commit and push %s %s success', updateInfo.metadata.name, updateInfo.version);

            deleteLocalBranch(jsDelivrPath, branchName, function () {
              callback(null, _.extend(updateInfo, { branch: branchName }));
            });
          });
        });
      });
    });
  } else {
    callback(null, updateInfo);
  }
}

function pullRequest(jsDelivrPath, updateInfo, callback) {
  if (updateInfo.branch) {
    var github = packageManagers.get('github');

    var pullToRepo = util.userRepo(config.get('pull-request-repo'));
    var originRepo = util.userRepo(config.get('origin-repo'));

    var pmId = updateInfo.metadata.packageManager;
    var pm = packageManagers.get(pmId);
    var packageId = pmId === 'github' ? updateInfo.metadata.repo : updateInfo.metadata.name;
    pm.repo(packageId, function (err, repoEndpoint) {
      if (err) {
        logger.error('Failed to get repoEndpoint url from package manager', {err: err });

        deleteRemoteAndLocalBranch(jsDelivrPath, updateInfo.branch, function () {
          callback(err);
        });

        return;
      }

      var context = {
        updateInfo: updateInfo,
        updateInfoPretty: util.prettyPrint(updateInfo)
      };

      context['mentionRepoOwner'] = config.get('mention-repo-owner');
      context['githubRepo'] = util.userRepo(repoEndpoint);

      async.series({
        title: async.apply(templates.render, 'pull-request-title', context),
        body: async.apply(templates.render, 'pull-request-body', context)
      }, function (err, rendered) {
        if (err) {
          logger.error('Error in rendering templates', { error: err });

          deleteRemoteAndLocalBranch(jsDelivrPath, updateInfo.branch, function () {
            callback(err);
          });

          return;
        }

        var message = {
          user: pullToRepo.user,
          repo: pullToRepo.repo,
          title: rendered.title,
          body: rendered.body,
          head: originRepo.user + ':' + updateInfo.branch,
          base: 'master'
        };
        logger.debug(message);
        github.pullRequest(message, function (err, res) {
          if (err) {
            logger.error('Error in creating pull request', { error: err });

            deleteRemoteAndLocalBranch(jsDelivrPath, updateInfo.branch, function () {
              callback(err);
            });

            return;
          }

          logger.info('Created pull request at ' + res.url);

          callback(null, _.extend(updateInfo, { pullRequestUrl: res.url }));
        });
      });
    });
  } else {
    callback(null, updateInfo);
  }
}

function deleteRemoteBranch(path, name, callback) {
  var repo = gift(path);

  repo.checkout('master', function (err) {
    if (err) {
      callback(err);
    }

    repo.git.cmd('push', {}, ['origin', '--delete', name], function (err) {
      if (err) {
        callback(err);
        return;
      }

      callback(null);
    });
  });
}

function deleteLocalBranch(path, name, callback) {
  var repo = gift(path);

  repo.checkout('master', function (err) {
    if (err) {
      callback(err);
    }

    repo.git.cmd('branch', {}, ['-D', name], function (err) {
      if (err) {
        callback(err);
        return;
      }

      callback(null);
    });
  });
}

function deleteRemoteAndLocalBranch(path, name, callback) {
  deleteRemoteBranch(path, name, function () {
    deleteLocalBranch(path, name, function () {
      callback(null);
    })
  })
}

module.exports = {
  check: check,
  metadata: metadata,
  update: update,
  commit: commit,
  pullRequest: pullRequest
};

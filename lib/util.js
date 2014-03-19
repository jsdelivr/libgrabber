var es = require('event-stream');
var concat = require('concat-stream');
var sv = require('semver');
var dl = require('download');
var mp = require('mkdirp');
var vfs = require('vinyl-fs');
var path = require('path');
var _ = require('lodash');
var decompress = require('decompress');
var fs = require('fs');

function dirs() {
  return es.map(function (vinyl, callback) {
    if (vinyl.stat.isDirectory()) {
      callback(null, vinyl);

      return;
    }

    callback();
  });
}

function semver() {
  return es.map(function (vinyl, callback) {
    var dir = vinyl.relative;
    var version = sv.clean(dir);

    if (sv.valid(version)) {
      return callback(null, version);
    }

    return callback();
  });
}

function download(downloadPath, fileName, url, callback) {
  var options = {
    headers: {
      'User-Agent': 'request'
    }
  };
  dl({url: url, name: fileName }, downloadPath, options)
    .on('error', function (status) {
      if (status) {
        callback(new Error('HTTP error status: ' + status));
      }
    })
    .on('close', function () {
      callback(null, path.join(downloadPath, fileName));
    });
}

function extract(extractPath, file, callback) {
  var options = {
    path: extractPath,
    strip: 1,
    ext: 'application/x-tgz'
  };

  fs.createReadStream(file)
    .pipe(decompress.extract(options))
    .pipe(concat(function () {
      callback(null, null);
    }));
}

function mkdirp(path, _, callback) {
  mp(path, callback);
}

function _joinWith(pathToJoin) {
  return function (it) {
    return path.join(pathToJoin, it);
  }
}

function _prependBang() {
  return function (it) {
    return '!' + it;
  }
}

function _sanitizePath() {
  return function (it) {
    return path.join('/', it);
  }
}

function _buildIncludes(joinWithPath, include) {
  return _(include)
    .map(_sanitizePath())
    .map(_joinWith(joinWithPath))
    .value();
}

function _buildExcludes(joinWithPath, exclude) {
  return _(exclude)
    .map(_sanitizePath())
    .map(_joinWith(joinWithPath))
    .map(_prependBang())
    .value();
}

function copy(from, to, files, callback) {
  if (!files) {
    files = {};
  }

  if (files.basePath) {
    from = path.join(from, files.basePath);
  }

  if (!_.isArray(files.include)) {
    files.include = ['**/*'];
  }

  if (!_.isArray(files.exclude)) {
    files.exclude = [];
  }

  var glob =
    _(_buildIncludes(from, files.include))
      .concat(_buildExcludes(from, files.exclude))
      .value();

  vfs
    .src(glob, { base: from})
    .pipe(vfs.dest(to))
    .pipe(concat({ encoding: 'object' }, function (files) {
      callback(files);
    }));
}

function remotes(repo, callback) {
  repo.git.cmd('remote', {}, ['-v'], function (err, res) {
    if (err) {
      callback(err);
      return;
    }

    var lines = res.split('\n');

    var remotes = _(lines)
      .map(function (line) {
        var remote = line.split(/\s+/);

        if (remote.length >= 2) {
          return {
            name: remote[0],
            url: remote[1]
          }
        }
      })
      .value();

    callback(null, remotes);
  });
}

// used for parsing git repo url (see http://goo.gl/nQkBHd)
var GIT_URL_SCHEME_1 = /(\w+:\/\/)(.+@)*([\w\d\.]+)(:[\d]+){0,1}\/*(.*)/;
var GIT_URL_SCHEME_2 = /(.+@)*([\w\d\.]+):(.*)/

function userRepo(url) {
  var match = GIT_URL_SCHEME_1.exec(url);
  var userRepo;
  if (match && match[5]) {
    userRepo = match[5];
  }

  if (!userRepo) {
    match = GIT_URL_SCHEME_2.exec(url);
    if (match && match[3]) {
      userRepo = match[3];
    }
  }

  if (userRepo) {
    userRepo = userRepo.replace(/\.git$/, '');
    var userRepoParts = userRepo.split('/');

    return { user: userRepoParts[0], repo: userRepoParts[1] }
  }

  return undefined;
}

module.exports = {
  vinyl: {
    dirs: dirs,
    semver: semver
  },
  download: download,
  extract: extract,
  mkdirp: mkdirp,
  copy: copy,
  remotes: remotes,
  userRepo: userRepo
};
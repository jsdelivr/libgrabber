var es = require('event-stream');
var concat = require('concat-stream');
var Dl = require('download');
var mp = require('mkdirp');
var vfs = require('vinyl-fs');
var path = require('path');
var _ = require('lodash');
var tar = require('tar');
var zlib = require('zlib');
var fs = require('fs');
var jsBeautify = require('js-beautify').js_beautify;
var async = require('async');
var cv = require('./clean-version');

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
    var version = cv(dir);

    if (version != null) {
      return callback(null, version);
    }

    return callback();
  });
}

function download(downloadPath, fileName, url, options, callback) {
  options.headers = options.headers || { headers: { 'User-Agent': 'request' } };

  new Dl(options)
    .get(url)
    .dest(downloadPath)
    .rename(fileName)
    .run(function (err) {
      if (err) {
        return callback(err);
      }

      callback(null, path.join(downloadPath, fileName));
    });
}

function normalizePath (path) {
  return path.replace(/\\/g, '/');
}

function extract(extractPath, file, callback) {
  var options = {
    path: extractPath,
    strip: 1
  };

  fs.createReadStream(file)
    .pipe(zlib.createGunzip())
    .pipe(tar.Extract(options))
    .on("error", function (err) {
      callback(err);
    })
    .on("end", function () {
      callback(null, null);
    });
}

function mkdirp(path, _, callback) {
  mp(path, callback);
}

function _joinWith(pathToJoin) {
  return function (it) {
    return path.join(pathToJoin, it);
  };
}

function _prependBang() {
  return function (it) {
    return '!' + it;
  };
}

function _sanitizePath() {
  return function (it) {
    return path.join('/', it);
  };
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

    var copiedFiles = [];

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

    async.eachSeries(files.include,function(includeRule,cb) {

        var basePath
            , hasStar = /\*\*\/\*/.test(includeRule);

        /*
         * if we're not using globs as a rule for file inclusion
         * we need to handle a few use cases to ensure proper
         * copy functionality
         */
        if(!hasStar) {

            //user wants to preserve directory structure
            if(includeRule.substring(0, 2) == './' ) {
                basePath = from;
            }
            //do not preserve the structure
            else {
                basePath = path.resolve(from,path.dirname(includeRule));
            }
        }
        else {
            basePath = from;
        }

        var glob =
            _(_buildIncludes(from, [includeRule]))
                .concat(_buildExcludes(from, files.exclude))
                .value();

        vfs
            .src(glob, { base: basePath})
            .pipe(vfs.dest(to))
            .pipe(concat({ encoding: 'object' }, function (files) {

                copiedFiles = _.union(copiedFiles,files);
                cb();
            }));

    },function(err) {

        if(err)
            logger.error('Error copying files', { error: err });

        callback(copiedFiles);
    });

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
          };
        }
      })
      .value();

    callback(null, remotes);
  });
}

// used for parsing git repo url (see http://goo.gl/nQkBHd)
var GIT_URL_SCHEME_1 = /(\w+:\/\/)(.+@)*([\w\d\.]+)(:[\d]+){0,1}\/*(.*)/;
var GIT_URL_SCHEME_2 = /(.+@)*([\w\d\.]+):(.*)/;

function userRepo(url) {
  var match = GIT_URL_SCHEME_1.exec(url);
  var userAndRepo;
  if (match && match[5]) {
    userAndRepo = match[5];
  }

  if (!userAndRepo) {
    match = GIT_URL_SCHEME_2.exec(url);
    if (match && match[3]) {
      userAndRepo = match[3];
    }
  }

  if (userAndRepo) {
    userAndRepo = userAndRepo.replace(/\.git$/, '');
    var userAndRepoParts = userAndRepo.split('/');

    return { user: userAndRepoParts[0], repo: userAndRepoParts[1] };
  }

  return undefined;
}

function prettyPrint(obj) {
  return jsBeautify(JSON.stringify(obj), { indent_size: 2 });
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
  userRepo: userRepo,
  prettyPrint: prettyPrint,
  normalizePath: normalizePath
};

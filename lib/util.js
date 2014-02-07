var es = require('event-stream');
var concat = require('concat-stream');
var sv = require('semver');
var dl = require('download');
var mp = require('mkdirp');
var vfs = require('vinyl-fs');
var path = require('path');

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
  })
}

function download(extractPath, url, callback) {
  dl(url, extractPath, { extract: true})
    .on('error', function (status) {
      if (status) {
        callback(new Error('HTTP error status: ' + status));
      }
    })
    .on('close', function () {
      callback(null, null)
    });
}

function mkdirp(path, _, callback) {
  mp(path, callback);
}

function copy(from, to, files, callback) {
  if (files.basePath) {
    from = path.join(from, files.basePath);
  }

  vfs
    .src([from + "/" + '**/*'], { base: from})
    .pipe(vfs.dest(to))
    .pipe(concat(function () {
      callback(null, null);
    }));
}

module.exports = {
  vinyl: {
    dirs: dirs,
    semver: semver
  },
  download: download,
  mkdirp: mkdirp,
  copy: copy
};
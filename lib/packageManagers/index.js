module.exports.get = function (name) {
  if (name === 'npm') {
    return require('./npm');
  } else {
    return null;
  }
}
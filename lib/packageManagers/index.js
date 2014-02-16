var npm = require('./npm');
var github = require('./github');

module.exports.get = function (name) {
  switch (name) {
    case 'npm':
      return npm;
    case 'github':
      return github;
    default:
      return null;
  }
};
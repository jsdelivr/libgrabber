var npm = require('./npm');
var github = require('./github');
var bower = require('./bower');

module.exports.get = function (name) {
  switch (name) {
    case 'npm':
      return npm;
    case 'github':
      return github;
    case 'bower':
      return bower;
    default:
      return null;
  }
};
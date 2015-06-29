var path = require('path');
var winston = require('winston');
var Papertrail = require('winston-papertrail').Papertrail;

var config = require('./config');

var level = config.get('NODE_ENV') === 'test' ? 'debug' : 'info';
var papertrailUrl = config.get('papertrail-url');
var papertrailHostname = config.get('papertrail-hostname');

var logFile = path.join(config.get('jsdelivr-path'), 'libgrabber.log');

var transports = [
  new (winston.transports.Console)({
    level: level,
    colorize: true,
    handleExceptions: true,
    exitOnError: false
  }),
  new (winston.transports.File)({
    level: level,
    filename: logFile,
    maxsize: 1024*1024,
    maxFiles: 3,
    json: false
  })
];

if (papertrailUrl && papertrailHostname) {
  var host = papertrailUrl.split(':')[0];
  var port = papertrailUrl.split(':')[1];

  var papertrailTransport = new Papertrail({
    level: 'debug',
    colorize: true,
    host: host,
    port: port,
    hostname: papertrailHostname,
    logFormat: function(level, message) {
      return '[' + level + '] ' + message;
    }
  });

  transports.push(papertrailTransport);
}
var logger = new (winston.Logger)({
  transports: transports
});

module.exports = logger;

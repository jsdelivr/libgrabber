var path = require('path');
var winston = require('winston');

var config = require('./config');

var level = config.get('NODE_ENV') === 'test' ? 'debug' : 'info';

var logFile = path.join(config.get('jsdelivr-path'), 'libgrabber.log');
var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      level: level,
      colorize: true,
      handleExceptions: true,
      exitOnError: false
    }),
    new (winston.transports.File)({
      filename: logFile,
      maxsize: 1024*1024,
      maxFiles: 3,
      json: false
    })
  ]
});

module.exports = logger;

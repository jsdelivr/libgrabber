var winston = require('winston');

var config = require('./config');

var level = config.get('NODE_ENV') === 'test' ? 'debug' : 'info';

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      level: level,
      colorize: true,
      handleExceptions: true,
      exitOnError: false
    })
    // new (winston.transports.File)({ filename: 'somefile.log' })
  ]
});

module.exports = logger;

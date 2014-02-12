var path = require('path');

var config = {
  cache: path.join(process.env.HOME, '.libgrabber', 'cache'),
  metadataFileName: 'update.json'
};

module.exports = config;

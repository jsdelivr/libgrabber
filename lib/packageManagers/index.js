/*
 * libgrabber
 * https://github.com/aleksandara/libgrabber
 *
 * Copyright (c) 2014 Aleksandar Antok
 * Licensed under the MIT license.
 */

module.exports.get = function (name) {
  if (name === 'npm') {
    return require('./npm');
  } else {
    return null;
  }
}
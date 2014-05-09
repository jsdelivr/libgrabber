#!/usr/bin/env node
var path = require('path');

var config = require('../lib/config');
var grabber = require('../lib/libgrabber');

var jsDelivrPath = config.get('jsdelivr-path');
var projectsDir = config.get('jsdelivr-projects-dir');
var projectsPath = path.join(jsDelivrPath, projectsDir);

grabber.updateAll(jsDelivrPath, projectsPath);
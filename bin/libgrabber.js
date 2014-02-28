#!/usr/bin/env node

var path = require('path');

var config = require('../lib/config');
var grabber = require('../lib/libgrabber');

var jsDelivrPath = config.get('jsDelivrPath');
var projectsDir = config.get('jsDelivrProjectsDir');
var projectsPath = path.join(jsDelivrPath, projectsDir);

grabber.updateAll(jsDelivrPath, projectsPath);
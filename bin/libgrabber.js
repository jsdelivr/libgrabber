#!/usr/bin/env node

var grabber = require('../lib/libgrabber');

var jsDelivrPath = process.argv[2];
var projectsPath = process.argv[3];

grabber.updateAll(jsDelivrPath, projectsPath);

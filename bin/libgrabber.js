#!/usr/bin/env node
var path = require('path');
var config = require('../lib/config');
var grabber = require('../lib/libgrabber');
var logger = require('../lib/logger');

var jsDelivrPath = config.get('jsdelivr-path') || '.';
var projectsDir = config.get('jsdelivr-projects-dir') || 'files';
var projectsFilter = config.get('projects-filter')
var projectsPath = path.join(jsDelivrPath, projectsDir);

logger.info("jsDelivrPath:", jsDelivrPath, "projectsPath:", projectsPath);
grabber.updateAll(jsDelivrPath, projectsPath, projectsFilter);

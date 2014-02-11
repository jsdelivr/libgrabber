#!/usr/bin/env node

var grabber = require('../lib/libgrabber');

var projectsPath = process.argv[2] || process.cwd();

grabber.traverse(projectsPath);

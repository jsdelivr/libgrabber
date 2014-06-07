libgrabber
==========

*Work in Progress*

Usage
-----

#### Requirements

- node 0.10.x

#### Instalation

##### Global package installation

```bash
$ npm install -g libgrabber
# 'libgrabber' will be in $PATH
```

##### Local package installation

```bash
$ mkdir libgrabber && cd libgrabber
$ npm install libgrabber
# Run it by executing 'node ./node_modules/libgrabber/bin/libgrabber.js'
```

#### Configuration

##### Repo

1. Properly configured git account (user.name, user.email, ssh key with empty ssh passphrase)
2. Forked jsdelivr repo
3. Upstream set to jsdelivr repo
```bash
$ git remote add upstream git@github.com:jsdelivr/jsdelivr.git
```

##### Libgrabber config

```json
{
  "github-access-token": "<secret>",
  "pull-request-repo": "https://github.com/jsdelivr/jsdelivr",
  "origin-repo": "<forked-repo-https-endpoint>",
  "mention-repo-owner": false,
  "papertrail-url": "<optional>",
  "papertrail-hostname": "<optional>"
}
```

#### Running

```bash
# --jsdelivr-path <path to the cloned forked repo>
# --config <path to the above mention config file>
$ libgrabber --jsdelivr-path jsdelivr/ --config jsdelivr/libgrabber.config.json
```

### Update.json schema

When libgrabber traverses through each project hosted on jsDelivr repo, it looks for ```update.json``` at the root of each project. ```update.json``` specifies where libgrabber should check for project updates and which files it should copy to jsDelivr. Besides getting project updates from github, libgrabber supports popular package managers [npm](http://npmjs.org/) and [bower](http://bower.io/). 

```json
{
  "packageManager": "<github|npm|bower>",
  "name": "<package-name>",
  "repo": "<user>/<repo>",
  "files": {
    "basePath": "<dir>",
    "include": ["<glob-string-1>", "<glob-string-2>"],
    "exclude": ["<glob-string-3>"]
  }
}
```

```packageManager``` (required) - type of package manager (github, npm or bower)

```name``` (required) - refers to package name on npm or bower, or repo name when github is used

```repo``` (optional when npm or bower is used) - github repository (for example ```jsdelivr/libgrabber```)

```files/basePath``` (optional) - base directory from which files are copied (for example ```dist```). Defaults to ```/``` (relative to the root directory of unpacked project package).

```files/include``` (optional) - specifies files and dirs that will be copied from project package. Accepts one or more glob strings. Defaults to ```**/*```, meaning all files and directories. Useful examples:

- ```main.js``` - copies ```main.js``` file in the base dir
- ```*.js``` - copies javascript files found in the base dir
- ```**/*.js``` - copies javascript files found in the base directory and recursively in all its subdirectories. Directory structure will be retained.
- ```dist/*.js``` - copies javascript files from dist dir. Directory structure will not be retained (e.g. ```dist``` dir will be stripped when copied). To retain directory structure prepend glob with ```./``` e.g. ```./dist/*.js``` 

```files/exclude``` (optional) - specifies files and dirs that will be excluded. See above examples.

Libgrabber glob functionality is based on [node-glob](https://github.com/isaacs/node-glob), for more information and examples, please see its [documentation](https://github.com/isaacs/node-glob).

#### [Bootstrap](https://github.com/twbs/bootstrap) Example (github)

Following example excludes non-minified resources:

```json
{
  "packageManager": "github",
  "name": "bootstrap",
  "repo": "twbs/bootstrap",
  "files": {
    "basePath": "dist/",
    "exclude": ["css/bootstrap.css", "css/bootstrap.css.map", "css/bootstrap-theme.css", "css/bootstrap-theme.css.map", "js/bootstrap.js"]
  }
}
```

#### [Humane-js](https://github.com/wavded/humane-js) Example (github)

```json
{
  "packageManager": "github",
  "name": "humane.js",
  "repo": "wavded/humane-js",
  "files": {
    "include": ["humane.min.js", "humane.js", "./themes/**/*"]
  }
}
```

#### [Lodash](https://github.com/lodash/lodash) Example (npm)

```json
{
  "packageManager": "npm",
  "name": "lodash",
  "repo": "lodash/lodash",
  "files": {
    "basePath": "dist/",
  }
}
```

### Updating Package

When your [SemVer](http://semver.org/) is updated on the master branch, libgrabber will automatically update your package on jsDelivr.

libgrabber
==========

libgrabber is a bot that runs on jsDelivr's servers to auto-update projects.
There are three simple steps to enable auto-updating:

1. [Prepare minifed files](#prepare-minifed-files)
2. [Add or update `update.json` schema at jsDelivr](#add-updatejson-schema-at-jsdelivrjsdelivr)
3. [Create New Package Release](#create-new-package-release)

If you are a developer and want to contribute to our bot's code, we also include [instructions](Running your own libgrabber bot) for running the bot locally.

Usage
-----

### Prepare minifed files
Not only will your users, but it helps us with hosting and promoting good practices 
Please upload only minified files on jsDelivr.  Smaller files helps users load websites faster.  Minified files also helps us with hosting and promotes good practices.  If you need to upload images, see if [extra compression](http://www.sitepoint.com/image-compression-tools/) can make your images smaller.  [SVG optimizers](https://github.com/svg/svgo#svgo----) may also help with SVG files from Inkscape and Illustrator.

### Add `update.json` <a href="#updatejson-schema"></a>

libgrabber looks for `update.json` at the root of each project folder.  This file tells libgrabber where to check for project updates and which files it should copy to jsDelivr.  You add `update.json` using these steps:

1. Fork the [jsDelivr/jsDelivr](https://github.com/jsdelivr/jsdelivr) repo
2. Open your project folder.  If it doesn't exist, please add a new folder and `info.ini` file using [jsDelivr's file structure](https://github.com/jsdelivr/jsdelivr#file-structure).
3. Write `update.json` using this format:

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

`packageManager` (required) (github, [npm](http://npmjs.org/) or [bower](http://bower.io/)) - to declare which package manager libgrabber watches for new versions

`name` (required) - refers to package name on npm or Bower, or repo name when GitHub is used

`repo` (optional when npm or bower is used) - GitHub repository (for example `jsdelivr/libgrabber`)

`files/basePath` (optional) - base directory from which files are copied (for example `dist/`). Defaults to `/` (relative to the root directory of unpacked project package).

`files/include` (optional) - specifies files and dirs that will be copied from project package. Accepts one or more glob strings. Defaults to `**/*`, meaning all files and directories. Useful examples:

- `main.min.js` - copies `main.min.js` file in the base dir
- `*.js` - copies javascript files found in the base dir
- `**/*.js` - copies javascript files found in the base directory and recursively in all its subdirectories. Directory structure will be retained.
- `dist/*.js` - copies javascript files from dist dir. Directory structure will not be retained (e.g. `dist` dir will be stripped when copied). To retain directory structure prepend glob with `./` e.g. `./vendors/*.js` 

`files/exclude` (optional) - specifies files and dirs that will be excluded.  Format is the same as `files/include`.

Libgrabber glob functionality is based on [node-glob](https://github.com/isaacs/node-glob), for more information and examples, please see its [documentation](https://github.com/isaacs/node-glob).

#### Examples

##### [Bootstrap](https://github.com/twbs/bootstrap) Example (github)

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

##### [Humane-js](https://github.com/wavded/humane-js) Example (github)

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

##### [Lodash](https://github.com/lodash/lodash) Example (npm)

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

### Create new package release

When libgrabber detects a release with a new [SemVer](http://semver.org/) complaint tag, it will automatically update the repo on jsDelivr.  The `packageManager` value you chose in `update.json` determines where you need to update your actual package.

#### GitHub Releases

You can use the [GitHub web GUI](https://help.github.com/articles/creating-releases), or from CLI use [`git-tag`](http://git-scm.com/book/en/Git-Basics-Tagging) to post a new Release.

#### npm

Use [`npm publish`](https://www.npmjs.org/doc/cli/npm-publish.html).

#### Bower

Bower has its own system to [register packages](http://bower.io/docs/creating-packages/), though the package file needs a git host.  If GitHub is used, follow the [instructions above](#github-releases) to let Bower know your package is updated.


Running your own libgrabber bot
-------------------------------

It is not required for you to run the bot yourself to update your own project.  These instructions are for you to run libgrabber locally for testing.

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

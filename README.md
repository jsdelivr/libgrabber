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

### Updating Package

When your [SemVer](http://semver.org/) is updated on the master branch, libgrabber will automatically update your package on jsDelivr.

var path = require('path');
var fs = require('fs');
var handlebars = require('handlebars');

var cache = {};
var templateDir = path.resolve(__dirname, '..', 'templates');


function render(templateName, data, cb) {
  if (!cache[templateName]) {
    compile(templateName, function (err, template) {
      if (err) {
        cb(err);
        return;
      }

      cache[templateName] = template;

      render(templateName, data, cb);
    });

    return;
  }

  var template = cache[templateName];
  try {
    var rendered = template(data);

    cb(null, rendered);
  } catch (e) {
    cb(e);
  }
}

function compile(templateName, cb) {
  var templatePath = path.join(templateDir, templateName + '.hbs');
  fs.readFile(templatePath, { encoding: 'utf8' }, function (err, data) {
    if (err) {
      cb(err);
      return;
    }

    try {
      var compiledTemplate = handlebars.compile(data);

      cb(null, compiledTemplate);
    } catch (e) {
      cb(e);
    }
  });
}

module.exports = {
  render: render
};
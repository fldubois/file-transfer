'use strict';

var path = require('path');

var express    = require('express');
var bodyParser = require('body-parser');
var xmlbuilder = require('xmlbuilder');

var VirtualFS = require('./virtual-fs');

module.exports = function (options, callback) {
  var server = express();

  // server.use(bodyParser.raw());
  server.use(bodyParser.raw({type: '*/*'}));

  server.fs = new VirtualFS();

  server.use(function (req, res, next) {
    if (options.hasOwnProperty('user')) {
      var authorization = req.headers.authorization;
      var hash = new Buffer(options.user + ':' + options.pass).toString('base64');

      if (!authorization || authorization.indexOf(hash) === -1) {
        return res.status(401).send('Unauthorized');
      }
    }

    return next();
  });

  server.options(/.*/, function (req, res) {
    res.status(200);
    res.header('allow', 'OPTIONS, GET, PUT, DELETE, MKCOL, PROPFIND');
    res.send();
  });

  server.get(/.*/, function (req, res) {
    var filepath = req.path.replace(/^\/?/, '');

    var file = server.fs.get(filepath);

    if (file === null) {
      return res.status(404).send('Not Found');
    }

    return res.status(200).send(file);
  });

  server.put(/.*/, function (req, res) {
    var filepath = req.path.replace(/^\/?/, '');

    server.fs.set(filepath, req.body);

    return res.status(201).send();
  });

  server.delete(/.*/, function (req, res) {
    var filepath = req.path.replace(/^\/?/, '');

    var cb = function (error) {
      if (error) {
        return res.status(500).send(error.message);
      }

      return res.status(201).send();
    };

    if (/\/$/.test(filepath)) {
      return server.fs.rmdir(filepath.replace(/\/$/, ''), cb);
    }

    return server.fs.unlink(filepath, cb);
  });

  server.mkcol(/.*/, function (req, res) {
    var filepath = req.path.replace(/^\/?/, '');

    server.fs.mkdir(filepath, function (error) {
      if (error) {
        return res.status(500).send(error.message);
      }

      return res.status(201).send();
    });
  });

  server.propfind(/.*/, function (req, res) {
    var filepath   = req.path.replace(/^\/?/, '');
    var collection = path.join('/', filepath, '/');

    return server.fs.readdir(filepath, function (error, files) {
      if (error) {
        return res.status(500).send(error.message);
      }

      var multistatus = xmlbuilder.create('D:multistatus', {version: '1.0', encoding: 'UTF-8'}, {'xmlns:D': 'DAV:'});

      files.forEach(function (file) {
        multistatus.element('D:response').element('D:href', (file === '.') ? collection : collection + file);
      });

      multistatus = multistatus.end({pretty: true});

      return res.status(200).send(multistatus.toString());
    });
  });

  return callback(null, server);
};

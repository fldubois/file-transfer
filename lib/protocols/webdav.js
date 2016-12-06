'use strict';

var events = require('events');
var fs     = require('fs');
var http   = require('http');
var path   = require('path');
var url    = require('url');
var util   = require('util');

var mime    = require('mime-types');
var request = require('request');
var xml     = require('xml2js');

var Promise = require('bluebird');

var HTTP_ERROR = 400;

function createWebDAVError(response) {
  var error = new Error('WebDAV request error');

  error.statusCode    = response.statusCode;
  error.statusMessage = response.statusMessage || http.STATUS_CODES[response.statusCode];

  return error;
}

function WebDAVClient(options) {
  this.options = options;

  if (!this.options.hasOwnProperty('path')) {
    this.options.path = '';
  }
}

util.inherits(WebDAVClient, events.EventEmitter);

WebDAVClient.prototype.request = function (method, remotePath, body, callback) {
  if (typeof body === 'function') {
    callback = body;
    body     = null;
  }

  var options = (typeof method === 'string') ? {method: method} : method;

  options.url  = url.format({
    protocol: 'http',
    hostname: this.options.host,
    port:     this.options.port,
    pathname: path.join(this.options.path, remotePath)
  });

  if (this.options.user) {
    options.auth = {
      user: this.options.user,
      pass: this.options.pass
    };
  }

  if (body) {
    options.body = body;
  }

  if (body !== null) {
    options.headers = {
      'Content-Type': mime.lookup(remotePath) || 'application/octet-stream'
    };
  }

  // Callback usage
  if (typeof callback === 'function') {
    options.callback = function (error, response, responseBody) {
      if (error) {
        return callback(error);
      }

      return (response.statusCode >= HTTP_ERROR) ? callback(createWebDAVError(response)) : callback(null, responseBody);
    };
  }

  var req = request(options);

  // Stream usage
  if (typeof callback !== 'function') {
    req.on('response', function (response) {
      if (response.statusCode >= HTTP_ERROR) {
        req.pause();

        req.removeAllListeners('data');
        req.removeAllListeners('end');

        req.emit('error', createWebDAVError(response));

        response.destroy();
      }
    });
  }

  return req;
};

WebDAVClient.prototype.connect = function (callback) {
  var self = this;

  return new Promise(function (resolve, reject) {
    self.request('OPTIONS', '/', function (error) {
      return error ? reject(error) : resolve();
    });
  }).asCallback(callback);
};

WebDAVClient.prototype.createReadStream = function (remotePath) {
  return this.request('GET', remotePath);
};

WebDAVClient.prototype.createWriteStream = function (remotePath) {
  var stream = this.request('PUT', remotePath);

  stream.on('end', function () {
    stream.emit('finish');
  });

  return stream;
};

WebDAVClient.prototype.get = function (remote, local, callback) {
  var stream = this.createReadStream(remote).on('error', callback).pipe(fs.createWriteStream(local));

  stream.on('finish', callback);
  stream.on('error', callback);
};

WebDAVClient.prototype.mkdir = function (remotePath, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = {};
  }

  this.request('MKCOL', remotePath, function (error) {
    return callback(error);
  });
};

WebDAVClient.prototype.put = function (local, remote, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = {};
  }

  var stream = fs.createReadStream(local).on('error', callback).pipe(this.createWriteStream(remote));

  stream.on('end', callback);
  stream.on('error', callback);
};

WebDAVClient.prototype.readdir = function (remotePath, callback) {
  var basePath = path.join('/', this.options.path, remotePath, '/').replace(/\//g, '\\/');
  var regexp   = new RegExp('^' + basePath);

  this.request({
    method:  'PROPFIND',
    headers: {
      'Content-Type': 'text/xml',
      'Depth':        1
    }
  }, remotePath, function (error, body) {
    if (error) {
      return callback(error);
    }

    xml.parseString(body.replace(/(<\/?)\w+:/g, '$1'), function (parseError, content) {
      if (parseError) {
        return callback(parseError);
      }

      if (content === null) {
        return callback(new Error('Empty response on PROPFIND'));
      }

      var files = content.multistatus.response.map(function (response) {
        return response.href[0].replace(regexp, '').replace(/\/$/, '');
      }).filter(function (file) {
        return (typeof file === 'string' && file.length > 0);
      });

      return callback(null, files);
    });
  });
};

WebDAVClient.prototype.rmdir = function (remotePath, callback) {
  if (remotePath.charAt(remotePath.length - 1) !== '/') {
    remotePath += '/';
  }

  this.request({
    method:  'DELETE',
    headers: {
      Depth: 'infinity'
    }
  }, remotePath, function (error) {
    return callback(error);
  });
};

WebDAVClient.prototype.unlink = function (remotePath, callback) {
  this.request('DELETE', remotePath, function (error) {
    return callback(error);
  });
};

WebDAVClient.prototype.disconnect = function () {
  return null;
};

module.exports = WebDAVClient;

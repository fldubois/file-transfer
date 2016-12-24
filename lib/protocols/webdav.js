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
  this.connected = false;
  this.options   = options;

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

  if (this.connected === false && options.force !== true) {
    var error = new Error('WebDAV client not connected');

    if (typeof callback !== 'function') {
      throw error;
    }

    return callback(error);
  }

  delete options.force;

  options.url  = url.format({
    protocol: 'http',
    hostname: this.options.host,
    port:     this.options.port,
    pathname: path.join(this.options.path, remotePath)
  });

  if (this.options.username || this.options.user) {
    options.auth = {
      user: this.options.username || this.options.user,
      pass: this.options.password || this.options.pass
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
    options.callback = function (error, response, content) {
      if (error) {
        return callback(error);
      }

      if (response.statusCode >= HTTP_ERROR) {
        return callback(createWebDAVError(response));
      }

      return callback(null, response, content);
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

WebDAVClient.prototype.requestAsync = function(method, remotePath, body) {
  return new Promise(function (resolve, reject) {
    this.request(method, remotePath, body, function (error, response, content) {
      return error ? reject(error) : resolve([response, content]);
    });
  }.bind(this));
};

WebDAVClient.prototype.connect = function (callback) {
  return this.requestAsync({
    method: 'OPTIONS',
    force:  true
  }, '/').bind(this).spread(function (response) {
    var unsupported = ['OPTIONS', 'GET', 'PUT', 'DELETE', 'MKCOL', 'PROPFIND'].filter(function (method) {
      return response.headers.allow.indexOf(method) === -1;
    });

    if (unsupported.length > 0) {
      throw new Error('Unsupported HTTP methods: ' + unsupported.join(', '));
    }

    this.connected = true;
  }).asCallback(callback);
};

WebDAVClient.prototype.isConnected = function () {
  return this.connected;
};

WebDAVClient.prototype.supportsStreams = function () {
  return true;
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
  return new Promise(function (resolve, reject) {
    var stream = this.createReadStream(remote).on('error', reject).pipe(fs.createWriteStream(local));

    stream.on('finish', resolve);
    stream.on('error', reject);
  }.bind(this)).asCallback(callback);
};

WebDAVClient.prototype.mkdir = function (remotePath, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = {};
  }

  return this.requestAsync('MKCOL', remotePath).thenReturn(null).asCallback(callback);
};

WebDAVClient.prototype.put = function (local, remote, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = {};
  }

  return new Promise(function (resolve, reject) {
    var stream = fs.createReadStream(local).on('error', reject).pipe(this.createWriteStream(remote));

    stream.on('end', resolve);
    stream.on('error', reject);
  }.bind(this)).asCallback(callback);
};

WebDAVClient.prototype.readdir = function (remotePath, callback) {
  var basePath = path.join('/', this.options.path, remotePath, '/').replace(/\//g, '\\/');
  var regexp   = new RegExp('^' + basePath);

  return this.requestAsync({
    method:  'PROPFIND',
    headers: {
      'Content-Type': 'text/xml',
      'Depth':        1
    }
  }, remotePath).spread(function (response, body) {
    return new Promise(function (resolve, reject) {
      xml.parseString(body.replace(/(<\/?)\w+:/g, '$1'), function (parseError, content) {
        if (parseError) {
          return reject(parseError);
        }

        if (content === null) {
          return reject(new Error('Empty response on PROPFIND'));
        }

        var files = content.multistatus.response.map(function (element) {
          return element.href[0].replace(regexp, '').replace(/\/$/, '');
        }).filter(function (file) {
          return (typeof file === 'string' && file.length > 0);
        });

        return resolve(files);
      });
    });
  }).asCallback(callback);
};

WebDAVClient.prototype.rmdir = function (remotePath, callback) {
  if (remotePath.charAt(remotePath.length - 1) !== '/') {
    remotePath += '/';
  }

  return this.requestAsync({
    method:  'DELETE',
    headers: {
      Depth: 'infinity'
    }
  }, remotePath).thenReturn(null).asCallback(callback);
};

WebDAVClient.prototype.unlink = function (remotePath, callback) {
  this.requestAsync('DELETE', remotePath).thenReturn(null).asCallback(callback);
};

WebDAVClient.prototype.disconnect = function () {
  this.connected = false;

  return null;
};

module.exports = WebDAVClient;

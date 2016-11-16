'use strict';

var events = require('events');
var fs     = require('fs');
var http   = require('http');
var path   = require('path');
var url    = require('url');
var util   = require('util');

var merge   = require('merge');
var request = require('request');
var xml     = require('xml2js');

function WebDAVClient(options) {
  this.options = options;
  this.baseURL = url.parse(options.baseURL);
}

util.inherits(WebDAVClient, events.EventEmitter);

WebDAVClient.prototype.request = function (method, remotePath, body, callback) {
  if (typeof body === 'function') {
    callback = body;
    body     = null;
  }

  var options = (typeof method === 'string') ? {method: method} : method;

  options.url  = url.format(merge(true, this.baseURL, {pathname: path.join(this.baseURL.pathname, remotePath)}));
  options.auth = this.options.credentials;

  if (body) {
    options.body = body;
  }

  return request(options, function (err, response, responseBody) {
    if (typeof callback === 'function') {
      if (err) {
        return callback(err);
      }

      if (response.statusCode > 300) {
        var error = new Error('WebDAV request error');

        error.statusCode    = response.statusCode;
        error.statusMessage = response.statusMessage || http.STATUS_CODES[response.statusCode];

        return callback(error);
      }

      return callback(err, responseBody);
    }
  });
};

WebDAVClient.prototype.connect = function () {
  var self = this;

  request({
    method: 'OPTIONS',
    url:    url.format(self.baseURL),
    auth:   self.options.credentials
  }, function (err, response) {
    if (err) {
      self.emit('error', err);
    } else if (response.statusCode > 300) {
      var error = new Error('WebDAV request error');

      error.statusCode    = response.statusCode;
      error.statusMessage = response.statusMessage || http.STATUS_CODES[response.statusCode];

      self.emit('error', error);
    } else {
      self.emit('ready');
    }
  });
};

WebDAVClient.prototype.createReadStream = function (remotePath) {
  var stream = this.request('GET', remotePath);

  stream.on('response', function (response) {
    if (response.statusCode >= 400) {
      var error = new Error('WebDAV request error');

      error.statusCode    = response.statusCode;
      error.statusMessage = response.statusMessage || http.STATUS_CODES[response.statusCode];

      stream.pause();

      stream.removeAllListeners('data');
      stream.removeAllListeners('end');

      stream.emit('error', error);

      response.destroy();
    }
  });

  return stream;
};

WebDAVClient.prototype.createWriteStream = function (remotePath) {
  var stream = this.request('PUT', remotePath);

  stream.on('response', function (response) {
    if (response.statusCode >= 400) {
      var error = new Error('WebDAV request error');

      error.statusCode    = response.statusCode;
      error.statusMessage = response.statusMessage || http.STATUS_CODES[response.statusCode];

      stream.pause();

      stream.removeAllListeners('data');
      stream.removeAllListeners('end');

      stream.emit('error', error);

      response.destroy();
    }
  });

  return stream;
};

WebDAVClient.prototype.get = function (remote, local, callback) {
  var stream = this.createReadStream(remote).on('error', callback).pipe(fs.createWriteStream(local));

  stream.on('finish', callback);
  stream.on('error', callback);
};

WebDAVClient.prototype.mkdir = function (remotePath, mode, callback) {
  if (typeof mode === 'function') {
    callback = mode;
    mode     = null;
  }

  this.request('MKCOL', remotePath, function (error) {
    return callback(error);
  });
};

WebDAVClient.prototype.put = function (local, remote, callback) {
  var stream = fs.createReadStream(local).on('error', callback).pipe(this.createWriteStream(remote));

  stream.on('finish', callback);
  stream.on('error', callback);
};

WebDAVClient.prototype.readdir = function (remotePath, callback) {
  var basePath = path.join(this.baseURL.pathname, remotePath, '/').replace(/\//g, '\\/');
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

      var files = content.multistatus.response.map(function (response) {
        return response.href[0].replace(regexp, '');
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

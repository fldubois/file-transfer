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

  return request(options, function (err, response, body) {
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

      return callback(err, body);
    }
  });
};

WebDAVClient.prototype.propfind = function (path, depth, callback) {
  if (typeof depth === 'function') {
    callback = depth;
    depth    = 0;
  }

  this.request({
    method: 'PROPFIND',
    headers: {
      'Content-Type': 'text/xml',
      'Depth':        depth,
    }
  }, path, callback);
};

WebDAVClient.prototype.connect = function () {
  var self = this;

  self.propfind('/', function (error, body) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('ready');
    }
  });
};

WebDAVClient.prototype.createReadStream = function (path, options) {
  return this.request('GET', path).on('response', function (response) {
    if (response.statusCode >= 400) {
      var error = new Error('WebDAV request error');

      error.statusCode    = response.statusCode;
      error.statusMessage = response.statusMessage || http.STATUS_CODES[response.statusCode];

      response.destroy(error);
    }
  });
};

WebDAVClient.prototype.createWriteStream = function (path, options) {
  return this.request('PUT', path).on('response', function (response) {
    if (response.statusCode >= 400) {
      var error = new Error('WebDAV request error');

      error.statusCode    = response.statusCode;
      error.statusMessage = response.statusMessage || http.STATUS_CODES[response.statusCode];

      response.destroy(error);
    }
  });
};

WebDAVClient.prototype.get = function(remote, local, callback) {
  var stream = this.createReadStream(remote).on('error', callback).pipe(fs.createWriteStream(local));

  stream.on('finish', callback);
  stream.on('error', callback);
};

WebDAVClient.prototype.mkdir = function(path, mode, callback) {
  if (typeof mode === 'function') {
    callback = mode;
    mode     = null;
  }

  this.request('MKCOL', path, function (error) {
    return callback(error);
  });
};

WebDAVClient.prototype.put = function(local, remote, callback) {
  var stream = fs.createReadStream(local).on('error', callback).pipe(this.createWriteStream(remote));

  stream.on('finish', callback);
  stream.on('error', callback);
};

WebDAVClient.prototype.readdir = function (directory, callback) {
  var basePath = path.join(this.baseURL.pathname, directory, '/').replace(/\//g, '\\/');
  var regexp   = new RegExp('^' + basePath);

  this.propfind(directory, 1, function (error, body) {
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

WebDAVClient.prototype.rmdir = function (path, callback) {
  if (path.charAt(path.length - 1) !== '/') {
    path += '/';
  }

  this.request({
    method: 'DELETE',
    headers: {
      'Depth': 'infinity',
    }
  }, path, function (error) {
    return callback(error);
  });
};

WebDAVClient.prototype.unlink = function (path, callback) {
  this.request('DELETE', path, function (error) {
    return callback(error);
  });
};

module.exports = WebDAVClient;

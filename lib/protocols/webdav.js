'use strict';

var events = require('events');
var path   = require('path');
var url    = require('url');
var util   = require('util');

var merge   = require('merge');
var request = require('request');

function WebDAVClient(options) {
  this.options = options;
  this.baseURL = url.parse(options.baseURL);
}

util.inherits(WebDAVClient, events.EventEmitter);

WebDAVClient.prototype.connect = function () {
  var self = this;

  self.propfind('', function (error, body) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('ready');
    }
  });
};

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
    if (response.statusCode > 300) {
      var error = new Error('WebDAV request error');

      error.data = {
        status: response.statusCode,
        body:   body,
        href:   response.request.href
      };

      return callback(error);
    }

    return callback(err, body);
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

module.exports = WebDAVClient;

'use strict';

var get   = require('lodash.get');
var set   = require('lodash.set');
var unset = require('lodash.unset');

function VirtualFS() {
  this.files   = {};
  this.handles = {};
  this.next    = 0;
}

VirtualFS.prototype.open = function (path, flags, mode, callback) {
  if (typeof mode === 'function') {
    callback = mode;
    mode     = parseInt('666', 8);
  }

  var error = null;

  // TODO: Support all flags
  if (['r', 'w', 'wx'].indexOf(flags) === -1) {
    return callback(new Error('Unknown file open flag: ' + flags));
  }

  var file = get(this.files, path.split('/'), null);

  if (flags.indexOf('r') !== -1 && file === null) {
    error = new Error('ENOENT, open \'' + path + '\'');

    error.errno = 34;
    error.code  = 'ENOENT';
    error.path  = path;

    return callback(error);
  }

  if (flags.indexOf('x') !== -1 && file !== null) {
    error = new Error('EEXIST, open \'' + path + '\'');

    error.errno = 47;
    error.code  = 'EEXIST';
    error.path  = path;

    return callback(error);
  }

  if (flags.indexOf('w') !== -1 || (flags.indexOf('a') !== -1 && file === null)) {
    set(this.files, path.split('/'), new Buffer(0));
  }

  var fd = this.next++;

  this.handles[fd] = path;

  return callback(null, fd);
};

VirtualFS.prototype.stat = function (path, callback) {
  var file = get(this.files, path.split('/'), null);

  if (file === null) {
    var error = new Error('ENOENT, stat \'' + path + '\'');

    error.errno = 34;
    error.code  = 'ENOENT';
    error.path  = path;

    return callback(error);
  }

  var now = Date.now();

  // TODO: Return a fs.Stats instance
  var stats = {
    mode:  '666',
    uid:   0,
    gid:   0,
    size:  Buffer.isBuffer(file) ? file.length : 0,
    atime: now,
    mtime: now
  };

  stats.isDirectory = function () {
    return !Buffer.isBuffer(file);
  };

  stats.isFile = function () {
    return Buffer.isBuffer(file);
  };

  return callback(null, stats);
};

VirtualFS.prototype.read = function (fd, buffer, offset, length, position, callback) {
  if (typeof this.handles[fd] !== 'string') {
    var error = new Error('EBADF, read');

    error.errno = 9;
    error.code  = 'EBADF';

    return callback(error);
  }

  var path = this.handles[fd];
  var file = get(this.files, path.split('/'), null);

  if (offset > file.length) {
    return callback(null, 0, null);
  }

  var bytesRead = Math.min(file.length - offset, length);

  file.copy(buffer, 0, offset, bytesRead);

  return callback(null, bytesRead, buffer);
};

VirtualFS.prototype.write = function (fd, buffer, offset, length, position, callback) {
  if (typeof this.handles[fd] !== 'string') {
    var error = new Error('EBADF, read');

    error.errno = 9;
    error.code  = 'EBADF';

    return callback(error);
  }

  var path = this.handles[fd];
  var file = get(this.files, path.split('/'), null);

  var newFile = new Buffer(Math.max(file.length, offset + buffer.length));

  file.copy(newFile);
  buffer.copy(newFile, offset);

  set(this.files, path.split('/'), newFile);

  return callback(null, buffer.length, buffer);
};

VirtualFS.prototype.mkdir = function (path, mode, callback) {
  var error = null;
  var file  = get(this.files, path.split('/'), null);

  if (typeof mode === 'function') {
    callback = mode;
    mode     = null;
  }

  mode = mode || parseInt('666', 8);


  if (file !== null) {
    error = new Error('EEXIST, mkdir \'' + path + '\'');

    error.errno = 47;
    error.code  = 'EEXIST';
    error.path  = path;

    return callback(error);
  }

  set(this.files, path.split('/'), {'.': {mode: mode}});

  return callback(null);
};

VirtualFS.prototype.readdir = function (path, callback) {
  var error = null;
  var file  = get(this.files, path.split('/'), null);

  if (file === null) {
    error = new Error('ENOENT, readdir \'' + path + '\'');

    error.errno = 34;
    error.code  = 'ENOENT';
    error.path  = path;

    return callback(error);
  }

  if (Buffer.isBuffer(file)) {
    error = new Error('ENOTDIR,, readdir \'' + path + '\'');

    error.errno = 27;
    error.code  = 'ENOTDIR,';
    error.path  = path;

    return callback(error);
  }

  return callback(null, Object.keys(file));
};

VirtualFS.prototype.rmdir = function (path, callback) {
  var error = null;
  var file  = get(this.files, path.split('/'), null);

  if (file === null) {
    error = new Error('ENOENT, rmdir \'' + path + '\'');

    error.errno = 34;
    error.code  = 'ENOENT';
    error.path  = path;

    return callback(error);
  }

  if (Buffer.isBuffer(file)) {
    error = new Error('ENOTDIR, rmdir \'' + path + '\'');

    error.errno = 27;
    error.code  = 'ENOTDIR';
    error.path  = path;

    return callback(error);
  }

  unset(this.files, path.split('/'));

  return callback(null);
};

VirtualFS.prototype.unlink = function (path, callback) {
  var error = null;
  var file  = get(this.files, path.split('/'), null);

  if (file === null) {
    error = new Error('ENOENT, unlink \'' + path + '\'');

    error.errno = 34;
    error.code  = 'ENOENT';
    error.path  = path;

    return callback(error);
  }

  if (!Buffer.isBuffer(file)) {
    error = new Error('EISDIR, unlink \'' + path + '\'');

    error.errno = 28;
    error.code  = 'EISDIR';
    error.path  = path;

    return callback(error);
  }

  unset(this.files, path.split('/'));

  return callback(null);
};

VirtualFS.prototype.close = function (fd, callback) {
  if (typeof this.handles[fd] !== 'string') {
    var error = new Error('EBADF, close');

    error.errno = 9;
    error.code  = 'EBADF';

    return callback(error);
  }

  delete this.handles[fd];

  return callback(null);
};

VirtualFS.prototype.writeFile = function(filename, data, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = {};
  }

  if (!Buffer.isBuffer(data)) {
    data = new Buffer(data.toString(), options.encoding || 'utf8');
  }

  // TODO: Support options.flag and options.mode

  set(this.files, filename.split('/'), data);

  return callback(null);
};

VirtualFS.prototype.readFile = function(filename, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = {};
  }

  var file = get(this.files, filename.split('/'), null);

  if (file === null) {
    error = new Error('ENOENT, open \'' + filename + '\'');

    error.errno = 34;
    error.code  = 'ENOENT';
    error.path  = filename;

    return callback(error);
  }

  return callback(null, options.hasOwnProperty('encoding') ? file.toString(options.encoding) : file);
};

VirtualFS.prototype.rename = function(oldPath, newPath, callback) {
  var file = get(this.files, oldPath.split('/'), null);

  if (file === null) {
    error = new Error('ENOENT, open \'' + oldPath + '\'');

    error.errno = 34;
    error.code  = 'ENOENT';
    error.path  = oldPath;

    return callback(error);
  }

  if (get(this.files, newPath.split('/'), null) !== null) {
    error = new Error('EEXIST, open \'' + newPath + '\'');

    error.errno = 47;
    error.code  = 'EEXIST';
    error.path  = newPath;

    return callback(error);
  }

  set(this.files, newPath.split('/'), file);

  unset(this.files, oldPath.split('/'));

  return callback(null);
};

VirtualFS.prototype.get = function (path) {
  return get(this.files, path.split('/'), null);
};

VirtualFS.prototype.set = function (path, file) {
  return set(this.files, path.split('/'), file);
};

module.exports = VirtualFS;

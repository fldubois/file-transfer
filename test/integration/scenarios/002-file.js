'use strict';

var fs = require('fs');
var os = require('os');

var expect = require('chai').expect;

var Promise = require('bluebird');

Promise.promisifyAll(fs);

module.exports = function (instances) {

  describe('Scenario: File functions', function () {

    var paths = {
      download: {
        remote: 'path/to/download.txt',
        local:  os.tmpdir() + '/download-' + Date.now() + '.txt'
      },
      upload: {
        remote: 'path/to/upload.txt',
        local:  os.tmpdir() + '/upload-' + Date.now() + '.txt'
      },
      unlink: {
        remote: 'path/to/unlink.txt'
      }
    };

    before('create the remote file', function () {
      instances.server.fs.set(paths.download.remote, new Buffer('Hello, downloaded friend !', 'utf8'));
      instances.server.fs.set(paths.unlink.remote, new Buffer('Hello, deleted friend !', 'utf8'));
    });

    before('create the local file', function (done) {
      fs.writeFile(paths.upload.local, 'Hello, uploaded friend !', 'utf8', done);
    });

    it('should download a file', function () {
      return instances.client.get(paths.download.remote, paths.download.local).then(function () {
        return fs.readFileAsync(paths.download.local, 'utf8');
      }).then(function (content) {
        expect(content).to.equal('Hello, downloaded friend !');
      });
    });

    it('should upload a file', function () {
      return instances.client.put(paths.upload.local, paths.upload.remote).then(function () {
        expect(Buffer.isBuffer(instances.server.fs.get(paths.upload.remote))).to.equal(true);
        expect(instances.server.fs.get(paths.upload.remote).toString()).to.equal('Hello, uploaded friend !');
      });
    });

    it('should delete a file', function () {
      return instances.client.unlink(paths.unlink.remote).then(function () {
        expect(instances.server.fs.get(paths.unlink.remote)).to.equal(null);
      });
    });

    after('delete the local file', function () {
      return Promise.all([
        fs.unlinkAsync(paths.download.local),
        fs.unlinkAsync(paths.upload.local)
      ]);
    });

    after('delete the remote files', function (done) {
      instances.server.fs.rmdir('path', done);
    });

  });

};

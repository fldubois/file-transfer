'use strict';

var os = require('os');

var chai       = require('chai');
var expect     = chai.expect;
var proxyquire = require('proxyquire').noCallThru();

var Promise = require('bluebird');

var ftp = require('test/unit/mocks/ftp');

var VirtualFS = require('test/integration/utils/virtual-fs');

var vfs = new VirtualFS();

var FTPClient = proxyquire('lib/protocols/ftp', {
  fs:  vfs,
  ftp: ftp
});

chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));

function createFTPClient() {
  var client  = new FTPClient({});

  return client.connect().thenReturn(client);
}

describe('protocols/ftp', function () {

  it('should expose common client interface', function () {
    expect(FTPClient).to.be.a('function');
    expect(FTPClient).to.respondTo('connect');
    expect(FTPClient).to.respondTo('disconnect');
  });

  describe('connect()', function () {

    beforeEach(function () {
      ftp.clear();
    });

    it('should open a FTP connection', function () {
      var options = {
        host: 'localhost',
        port: -1
      };

      var client = new FTPClient(options);

      return client.connect().then(function () {
        expect(client.connected).to.equal(true);

        expect(client.client).to.be.an.instanceOf(ftp);

        expect(client.client.connect).to.have.callCount(1);
        expect(client.client.connect).to.have.been.calledWith(options);
      });
    });

    it('should accept credentials variants', function () {
      return Promise.each([
        {user:     'elliot', pass:     'fsociety'},
        {user:     'elliot', password: 'fsociety'},
        {username: 'elliot', pass:     'fsociety'},
        {username: 'elliot', password: 'fsociety'},
        {username: 'elliot', password: 'fsociety', user: 'elliot', pass: 'fsociety'}
      ], function (options) {
        options.host = 'localhost';
        options.port = -1;

        var client = new FTPClient(options);

        return client.connect().then(function () {
          expect(client.client.connect).to.have.been.calledWith(options);
        });
      });
    });

    it('should emit an error on FTP connection error', function () {
      var client = new FTPClient({});
      var error  = new Error('Fake FTP connection error');

      ftp.setError('connect', error);

      return expect(client.connect()).to.be.rejectedWith(error).then(function () {
        expect(client.connected).to.equal(false);
      });
    });

    after(function () {
      ftp.clear();
    });

  });

  describe('isConnected()', function () {

    it('should return true when the client is connected', function () {
      var client = new FTPClient({});

      expect(client.isConnected()).to.equal(false);

      return client.connect().then(function () {
        expect(client.isConnected()).to.equal(true);

        client.disconnect();

        expect(client.isConnected()).to.equal(false);
      });
    });

  });

  describe('get()', function () {

    it('should download the file via the FTP connection', function (done) {
      var path = os.tmpdir() + '/' + Date.now() + '.txt';

      vfs.mkdir(os.tmpdir(), function (error) {
        if (error) {
          return done(error);
        }

        createFTPClient().then(function (client) {
          client.get('file.txt', path, function (error) {
            if (error) {
              return done(error);
            }

            vfs.readFile(path, 'utf8', function (error, content) {
              if (error) {
                return done(error);
              }

              expect(content.toString()).to.equal('Hello, friend.');

              expect(client.client.get).to.have.callCount(1);
              expect(client.client.get).to.have.been.calledWith('file.txt');

              return vfs.unlink(path, done);
            });
          });
        }).catch(done);
      });
    });

    it('should transmit FTP errors', function (done) {
      createFTPClient().then(function (client) {
        var fakeError = new Error('Fake get() error');

        ftp.setError('get', fakeError);

        client.get('/path/to/remote/file', '/path/to/local/file', function (error) {
          expect(error).to.equal(fakeError);

          return done();
        });
      }).catch(done);
    });

    it('should fail if the client is not connected', function (done) {
      var client = new FTPClient({});

      client.get('/path/to/remote/file', '/path/to/local/file', function (error) {
        expect(error).to.be.an('error');
        expect(error.message).to.equal('FTP client not connected');

        return done();
      });
    });

  });

  describe('supportsStreams()', function () {

    it('should return false', function () {
      expect(new FTPClient({}).supportsStreams()).to.equal(false);
    });

  });

  describe('createReadStream()', function () {

    it('should throw `Not implemented` error', function (done) {
      createFTPClient().then(function (client) {
        expect(function () {
          client.createReadStream('file.txt');
        }).to.throw('Not implemented');

        return done();
      }).catch(done);
    });

  });

  describe('createWriteStream()', function () {

    it('should throw `Not implemented` error', function (done) {
      createFTPClient().then(function (client) {
        expect(function () {
          client.createWriteStream('file.txt');
        }).to.throw('Not implemented');

        return done();
      }).catch(done);
    });

  });

  describe('mkdir()', function () {

    it('should create a directory via the FTP connection', function (done) {
      createFTPClient().then(function (client) {
        var path = '/path/to/directory';

        client.mkdir(path, function (error) {
          if (error) {
            return done(error);
          }

          expect(client.client.mkdir).to.have.callCount(1);
          expect(client.client.mkdir).to.have.been.calledWith(path);

          return done();
        });
      }).catch(done);
    });

    it('should ignore `options`parameter', function (done) {
      createFTPClient().then(function (client) {
        var path = '/path/to/directory';

        client.mkdir(path, {test: true}, function (error) {
          if (error) {
            return done(error);
          }

          expect(client.client.mkdir).to.have.callCount(1);
          expect(client.client.mkdir).to.have.been.calledWith(path);

          return done();
        });
      }).catch(done);
    });

    it('should transmit FTP errors', function (done) {
      createFTPClient().then(function (client) {
        var fakeError = new Error('Fake mkdir() error');

        ftp.setError('mkdir', fakeError);

        client.mkdir('/path/to/directory', function (err) {
          expect(err).to.equal(fakeError);

          return done();
        });
      }).catch(done);
    });

    it('should fail if the client is not connected', function (done) {
      var client = new FTPClient({});

      client.mkdir('/path/to/directory', function (err) {
        expect(err).to.be.an('error');
        expect(err.message).to.equal('FTP client not connected');

        return done();
      });
    });

  });

  describe('put()', function () {

    var local  = '/path/to/local/file';
    var remote = '/path/to/remote/file';

    afterEach('clean virtual fs', function () {
      vfs.unset(local);
    });

    it('should upload the file via the FTP connection', function (done) {
      createFTPClient().then(function (client) {
        vfs.set(local, new Buffer('Hello, friend.'));

        client.put(local, remote, function (error) {
          if (error) {
            return done(error);
          }

          expect(client.client.put).to.have.callCount(1);
          expect(client.client.put).to.have.been.calledWith(local, remote);

          return done();
        });
      }).catch(done);
    });

    it('should ignore `options` parameter', function (done) {
      createFTPClient().then(function (client) {
        vfs.set(local, new Buffer('Hello, friend.'));

        client.put(local, remote, {test: true}, function (error) {
          if (error) {
            return done(error);
          }

          expect(client.client.put).to.have.callCount(1);
          expect(client.client.put).to.have.been.calledWith(local, remote);

          return done();
        });
      }).catch(done);
    });

    it('should fail on local file not found', function (done) {
      createFTPClient().then(function (client) {
        client.put(local, remote, function (err) {
          expect(err).to.be.an('error');
          expect(err.message).to.equal('ENOENT, stat \'/path/to/local/file\'');

          return done();
        });
      }).catch(done);
    });

    it('should fail on directory', function (done) {
      createFTPClient().then(function (client) {
        vfs.mkdir(local, function (error) {
          if (error) {
            return done(error);
          }

          client.put(local, remote, function (err) {
            expect(err).to.be.an('error');
            expect(err.message).to.equal('Not a file: /path/to/local/file');

            return done();
          });
        });
      }).catch(done);
    });

    it('should fail if the client is not connected', function (done) {
      var client = new FTPClient({});

      client.put(local, remote, function (err) {
        expect(err).to.be.an('error');
        expect(err.message).to.equal('FTP client not connected');

        return done();
      });
    });

  });

  describe('readdir()', function () {

    it('should return a list of filenames', function (done) {
      createFTPClient().then(function (client) {
        var path = '/path/to/directory';

        client.readdir(path, function (error, files) {
          if (error) {
            return done(error);
          }

          expect(client.client.list).to.have.callCount(1);
          expect(client.client.list).to.have.been.calledWith(path);

          expect(files).to.be.an('array');
          expect(files.length).to.equal(6);

          files.forEach(function (file) {
            expect(file).to.match(/file\d/);
          });

          return done();
        });
      }).catch(done);
    });

    it('should transmit FTP errors', function (done) {
      createFTPClient().then(function (client) {
        var fakeError = new Error('Fake list() error');

        ftp.setError('list', fakeError);

        client.readdir('/path/to/directory', function (err, files) {
          expect(err).to.equal(fakeError);
          expect(files).to.be.a('undefined');

          return done();
        });
      }).catch(done);
    });

    it('should fail if the client is not connected', function (done) {
      var client = new FTPClient({});

      client.readdir('/path/to/directory', function (err, files) {
        expect(err).to.be.an('error');
        expect(err.message).to.equal('FTP client not connected');

        expect(files).to.be.a('undefined');

        return done();
      });
    });

  });

  describe('rmdir()', function () {

    it('should delete the directory', function (done) {
      createFTPClient().then(function (client) {
        var path = '/path/to/directory';

        client.rmdir(path, function (error) {
          if (error) {
            return done(error);
          }

          expect(client.client.rmdir).to.have.callCount(1);
          expect(client.client.rmdir).to.have.been.calledWith(path);

          return done();
        });
      }).catch(done);
    });

    it('should transmit FTP errors', function (done) {
      createFTPClient().then(function (client) {
        var fakeError = new Error('Fake rmdir() error');

        ftp.setError('rmdir', fakeError);

        client.rmdir('/path/to/directory', function (err) {
          expect(err).to.equal(fakeError);

          return done();
        });
      }).catch(done);
    });

    it('should fail if the client is not connected', function (done) {
      var client = new FTPClient({});

      client.rmdir('/path/to/directory', function (err) {
        expect(err).to.be.an('error');
        expect(err.message).to.equal('FTP client not connected');

        return done();
      });
    });

  });

  describe('unlink()', function () {

    it('should delete the file via the FTP connection', function (done) {
      createFTPClient().then(function (client) {
        var path = '/path/to/file';

        client.unlink(path, function (error) {
          if (error) {
            return done(error);
          }

          expect(client.client.delete).to.have.callCount(1);
          expect(client.client.delete).to.have.been.calledWith(path);

          return done();
        });
      }).catch(done);
    });

    it('should transmit FTP errors', function (done) {
      createFTPClient().then(function (client) {
        var fakeError = new Error('Fake delete() error');

        ftp.setError('delete', fakeError);

        client.unlink('/path/to/file', function (err) {
          expect(err).to.equal(fakeError);

          return done();
        });
      }).catch(done);
    });

    it('should fail if the client is not connected', function (done) {
      var client = new FTPClient({});

      client.unlink('/path/to/file', function (err) {
        expect(err).to.be.an('error');
        expect(err.message).to.equal('FTP client not connected');

        return done();
      });
    });

  });

  describe('disconnect()', function () {

    it('should close the SSH connection', function (done) {
      createFTPClient().then(function (client) {
        expect(client.connected).to.equal(true);

        expect(client.client.end).to.have.callCount(0);

        client.disconnect();

        expect(client.client.end).to.have.callCount(1);

        expect(client.connected).to.equal(false);

        return done();
      }).catch(done);
    });

    it('should do nothing on unconnected client', function () {
      var client = new FTPClient({});

      expect(client.connected).to.equal(false);
      expect(client.client.end).to.have.callCount(0);

      client.disconnect();

      expect(client.connected).to.equal(false);
      expect(client.client.end).to.have.callCount(0);
    });

  });

});

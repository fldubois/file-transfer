'use strict';

var chai       = require('chai');
var expect     = chai.expect;
var proxyquire = require('proxyquire').noCallThru();

var ssh2 = require('test/unit/mocks/ssh2');

var SFTPClient = proxyquire('lib/protocols/sftp', {
  ssh2: ssh2
});

chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));

function createSFTPClient() {
  var client  = new SFTPClient({});

  return client.connect().thenReturn(client);
}

describe('protocols/sftp', function () {

  it('should expose common client interface', function () {
    expect(SFTPClient).to.be.a('function');
    expect(SFTPClient).to.respondTo('connect');
    expect(SFTPClient).to.respondTo('disconnect');
  });

  describe('connect()', function () {

    beforeEach(function () {
      ssh2.clear();
    });

    it('should open a SFTP connection', function () {
      var options = {
        host: 'localhost',
        port: -1
      };

      var client = new SFTPClient(options);

      return client.connect().then(function () {
        expect(client.connected).to.equal(true);

        expect(client.client).to.be.an.instanceOf(ssh2.Client, 'should create a new ssh2 client');

        expect(client.client.connect).to.have.callCount(1);
        expect(client.client.connect).to.have.been.calledWith(options);

        expect(client.client.sftp).to.have.callCount(1);
      });
    });

    it('should emit an error on SSH connection error', function () {
      var client = new SFTPClient({});
      var error  = new Error('Fake SSH connection error');

      ssh2.setError('connect', error);

      return expect(client.connect()).to.be.rejectedWith(error).then(function () {
        expect(client.connected).to.equal(false);
      });
    });

    it('should emit an error on SFTP initialization error', function () {
      var client = new SFTPClient({});
      var error  = new Error('Fake SFTP initialization error');

      ssh2.setError('sftp', error);

      return expect(client.connect()).to.be.rejectedWith(error).then(function () {
        expect(client.connected).to.equal(false);
        expect(client.client.end).to.have.callCount(1);
      });
    });

    after(function () {
      ssh2.clear();
    });

  });

  describe('get()', function () {

    it('should download the file via the SFTP connection', function (done) {
      createSFTPClient().then(function (client) {
        var remote = '/path/to/remote/file';
        var local  = '/path/to/local/file';

        client.get(remote, local, function (error) {
          if (error) {
            return done(error);
          }

          expect(client.sftp.fastGet).to.have.callCount(1);
          expect(client.sftp.fastGet).to.have.been.calledWith(remote, local);

          return done();
        });
      }).catch(done);
    });

    it('should transmit errors', function (done) {
      createSFTPClient().then(function (client) {
        var fakeError = new Error('Fake fastGet() error');

        ssh2.setError('fastGet', fakeError);

        client.get('/path/to/remote/file', '/path/to/local/file', function (err) {
          expect(err).to.equal(fakeError);

          return done();
        });
      }).catch(done);
    });

    it('should fail if the client is not connected', function (done) {
      var client = new SFTPClient({});

      client.get('/path/to/remote/file', '/path/to/local/file', function (err) {
        expect(err).to.be.an('error');
        expect(err.message).to.equal('SFTP client not connected');

        return done();
      });
    });

  });

  describe('createReadStream()', function () {

    it('should create a readable stream from the SFTP connection', function (done) {
      createSFTPClient().then(function (client) {
        var path    = '/path/to/file';
        var options = {test: true};

        var stream = client.createReadStream(path, options);

        expect(stream).to.be.an('object');
        expect(stream).to.deep.equal({
          readable: true,
          path:     path,
          options:  options
        });

        expect(client.sftp.createReadStream).to.have.callCount(1);
        expect(client.sftp.createReadStream).to.have.been.calledWith(path, options);

        return done();
      }).catch(done);
    });

    it('should ignore the `handle` option', function (done) {
      createSFTPClient().then(function (client) {
        var path    = '/path/to/file';
        var options = {test: true, handle: 0};

        client.createReadStream(path, options);

        expect(client.sftp.createReadStream).to.have.been.calledWith(path, {test: true});

        return done();
      }).catch(done);
    });

    it('should throw an error if the client is not connected', function () {
      var client = new SFTPClient({});

      expect(function () {
        client.createReadStream('/path/to/file');
      }).to.throw('SFTP client not connected');
    });

  });

  describe('createWriteStream()', function () {

    it('should create a writable stream from the SFTP connection', function (done) {
      createSFTPClient().then(function (client) {
        var path    = '/path/to/file';
        var options = {test: true};

        var stream = client.createWriteStream(path, options);

        expect(stream).to.be.an('object');
        expect(stream).to.deep.equal({
          writable: true,
          path:     path,
          options:  options
        });

        expect(client.sftp.createWriteStream).to.have.callCount(1);
        expect(client.sftp.createWriteStream).to.have.been.calledWith(path, options);

        return done();
      }).catch(done);
    });

    it('should ignore the `handle` option', function (done) {
      createSFTPClient().then(function (client) {
        var path    = '/path/to/file';
        var options = {test: true, handle: 0};

        client.createWriteStream(path, options);

        expect(client.sftp.createWriteStream).to.have.been.calledWith(path, {test: true});

        return done();
      }).catch(done);
    });

    it('should throw an error if the client is not connected', function () {
      var client = new SFTPClient({});

      expect(function () {
        client.createWriteStream('/path/to/file');
      }).to.throw('SFTP client not connected');
    });

  });

  describe('mkdir()', function () {

    it('should create a directory via the SFTP connection', function (done) {
      createSFTPClient().then(function (client) {
        var path = '/path/to/directory';

        client.mkdir(path, function (error) {
          if (error) {
            return done(error);
          }

          expect(client.sftp.mkdir).to.have.callCount(1);
          expect(client.sftp.mkdir).to.have.been.calledWith(path);

          return done();
        });
      }).catch(done);
    });

    it('should accept `mode` option', function (done) {
      createSFTPClient().then(function (client) {
        var path = '/path/to/directory';

        client.mkdir(path, {mode: '0775'}, function (error) {
          if (error) {
            return done(error);
          }

          expect(client.sftp.mkdir).to.have.callCount(1);
          expect(client.sftp.mkdir).to.have.been.calledWith(path, {mode: '0775'});

          return done();
        });
      }).catch(done);
    });

    it('should transmit errors', function (done) {
      createSFTPClient().then(function (client) {
        var fakeError = new Error('Fake mkdir() error');

        ssh2.setError('mkdir', fakeError);

        client.mkdir('/path/to/directory', function (err) {
          expect(err).to.equal(fakeError);

          return done();
        });
      }).catch(done);
    });

    it('should fail if the client is not connected', function (done) {
      var client = new SFTPClient({});

      client.mkdir('/path/to/directory', function (err) {
        expect(err).to.be.an('error');
        expect(err.message).to.equal('SFTP client not connected');

        return done();
      });
    });

  });

  describe('put()', function () {

    it('should download the file via the SFTP connection', function (done) {
      createSFTPClient().then(function (client) {
        var local  = '/path/to/local/file';
        var remote = '/path/to/remote/file';

        client.put(local, remote, function (error) {
          if (error) {
            return done(error);
          }

          expect(client.sftp.fastPut).to.have.callCount(1);
          expect(client.sftp.fastPut).to.have.been.calledWith(local, remote);

          return done();
        });
      }).catch(done);
    });

    it('should accept options', function (done) {
      createSFTPClient().then(function (client) {
        var local  = '/path/to/local/file';
        var remote = '/path/to/remote/file';

        client.put(local, remote, {mode: '0775'}, function (error) {
          if (error) {
            return done(error);
          }

          expect(client.sftp.fastPut).to.have.callCount(1);
          expect(client.sftp.fastPut).to.have.been.calledWith(local, remote, {mode: '0775'});

          return done();
        });
      }).catch(done);
    });

    it('should transmit errors', function (done) {
      createSFTPClient().then(function (client) {
        var fakeError = new Error('Fake fastPut() error');

        ssh2.setError('fastPut', fakeError);

        client.put('/path/to/local/file', '/path/to/remote/file', function (err) {
          expect(err).to.equal(fakeError);

          return done();
        });
      }).catch(done);
    });

    it('should fail if the client is not connected', function (done) {
      var client = new SFTPClient({});

      client.put('/path/to/local/file', '/path/to/remote/file', function (err) {
        expect(err).to.be.an('error');
        expect(err.message).to.equal('SFTP client not connected');

        return done();
      });
    });

  });

  describe('readdir()', function () {

    it('should return a list of filenames', function (done) {
      createSFTPClient().then(function (client) {
        var path = '/path/to/directory';

        client.readdir(path, function (error, files) {
          if (error) {
            return done(error);
          }

          expect(client.sftp.readdir).to.have.callCount(1);
          expect(client.sftp.readdir).to.have.been.calledWith(path);

          expect(files).to.be.an('array');
          expect(files.length).to.equal(6);

          files.forEach(function (file) {
            expect(file).to.match(/file\d/);
          });

          return done();
        });
      }).catch(done);
    });

    it('should transmit errors', function (done) {
      createSFTPClient().then(function (client) {
        var fakeError = new Error('Fake readdir() error');

        ssh2.setError('readdir', fakeError);

        client.readdir('/path/to/directory', function (err, files) {
          expect(err).to.equal(fakeError);
          expect(files).to.be.a('undefined');

          return done();
        });
      }).catch(done);
    });

    it('should fail if the client is not connected', function (done) {
      var client = new SFTPClient({});

      client.readdir('/path/to/directory', function (err, files) {
        expect(err).to.be.an('error');
        expect(err.message).to.equal('SFTP client not connected');

        expect(files).to.be.a('undefined');

        return done();
      });
    });

  });

  describe('rmdir()', function () {

    it('should create a directory via the SFTP connection', function (done) {
      createSFTPClient().then(function (client) {
        var path = '/path/to/directory';

        client.rmdir(path, function (error) {
          if (error) {
            return done(error);
          }

          expect(client.sftp.rmdir).to.have.callCount(1);
          expect(client.sftp.rmdir).to.have.been.calledWith(path);

          return done();
        });
      }).catch(done);
    });

    it('should transmit errors', function (done) {
      createSFTPClient().then(function (client) {
        var fakeError = new Error('Fake rmdir() error');

        ssh2.setError('rmdir', fakeError);

        client.rmdir('/path/to/directory', function (err) {
          expect(err).to.equal(fakeError);

          return done();
        });
      }).catch(done);
    });

    it('should fail if the client is not connected', function (done) {
      var client = new SFTPClient({});

      client.rmdir('/path/to/directory', function (err) {
        expect(err).to.be.an('error');
        expect(err.message).to.equal('SFTP client not connected');

        return done();
      });
    });

  });

  describe('unlink()', function () {

    it('should delete the file via the SFTP connection', function (done) {
      createSFTPClient().then(function (client) {
        var path = '/path/to/file';

        client.unlink(path, function (error) {
          if (error) {
            return done(error);
          }

          expect(client.sftp.unlink).to.have.callCount(1);
          expect(client.sftp.unlink).to.have.been.calledWith(path);

          return done();
        });
      }).catch(done);
    });

    it('should transmit errors', function (done) {
      createSFTPClient().then(function (client) {
        var fakeError = new Error('Fake unlink() error');

        ssh2.setError('unlink', fakeError);

        client.unlink('/path/to/file', function (err) {
          expect(err).to.equal(fakeError);

          return done();
        });
      }).catch(done);
    });

    it('should fail if the client is not connected', function (done) {
      var client = new SFTPClient({});

      client.unlink('/path/to/file', function (err) {
        expect(err).to.be.an('error');
        expect(err.message).to.equal('SFTP client not connected');

        return done();
      });
    });

  });

  describe('disconnect()', function () {

    it('should close the SSH connection', function (done) {
      createSFTPClient().then(function (client) {
        expect(client.connected).to.equal(true);

        expect(client.client.end).to.have.callCount(0);

        client.disconnect();

        expect(client.client.end).to.have.callCount(1);

        expect(client.connected).to.equal(false);

        return done();
      }).catch(done);
    });

  });

});

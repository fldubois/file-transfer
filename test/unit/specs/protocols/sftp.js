'use strict';

var chai       = require('chai');
var expect     = chai.expect;
var proxyquire = require('proxyquire').noCallThru();

var Promise = require('bluebird');

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

        expect(client.client).to.be.an.instanceOf(ssh2.Client);

        expect(client.client.connect).to.have.callCount(1);
        expect(client.client.connect).to.have.been.calledWith(options);

        expect(client.client.sftp).to.have.callCount(1);
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

        var client = new SFTPClient(options);

        return client.connect().then(function () {
          expect(client.client.connect).to.have.been.calledWith(options);
        });
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

  describe('isConnected()', function () {

    it('should return true when the client is connected', function () {
      var client = new SFTPClient({});

      expect(client.isConnected()).to.equal(false);

      return client.connect().then(function () {
        expect(client.isConnected()).to.equal(true);

        client.disconnect();

        expect(client.isConnected()).to.equal(false);
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

    it('should do nothing on unconnected client', function () {
      var client = new SFTPClient({});

      expect(client.connected).to.equal(false);
      expect(client.client.end).to.have.callCount(0);

      client.disconnect();

      expect(client.connected).to.equal(false);
      expect(client.client.end).to.have.callCount(0);
    });

  });

  describe('supportsStreams()', function () {

    it('should return true', function () {
      expect(new SFTPClient({}).supportsStreams()).to.equal(true);
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

  describe('get()', function () {

    it('should download the file via the SFTP connection', function () {
      var remote = '/path/to/remote/file';
      var local  = '/path/to/local/file';

      return createSFTPClient().tap(function (client) {
        return client.get(remote, local);
      }).then(function (client) {
        expect(client.sftp.fastGet).to.have.callCount(1);
        expect(client.sftp.fastGet).to.have.been.calledWith(remote, local);
      });
    });

    it('should transmit SFTP errors', function () {
      var fakeError = new Error('Fake fastGet() error');

      ssh2.setError('fastGet', fakeError);

      return createSFTPClient().then(function (client) {
        return expect(client.get('/path/to/remote/file', '/path/to/local/file')).to.be.rejectedWith(fakeError);
      });
    });

    it('should fail if the client is not connected', function () {
      var remote = '/path/to/remote/file';
      var local  = '/path/to/local/file';

      var client = new SFTPClient({});

      return expect(client.get(remote, local)).to.be.rejectedWith('SFTP client not connected');
    });

  });

  describe('put()', function () {

    it('should upload the file via the SFTP connection', function () {
      var local  = '/path/to/local/file';
      var remote = '/path/to/remote/file';

      return createSFTPClient().tap(function (client) {
        return client.put(local, remote);
      }).then(function (client) {
        expect(client.sftp.fastPut).to.have.callCount(1);
        expect(client.sftp.fastPut).to.have.been.calledWith(local, remote);
      });
    });

    it('should accept options', function () {
      var local  = '/path/to/local/file';
      var remote = '/path/to/remote/file';

      return createSFTPClient().tap(function (client) {
        return client.put(local, remote, {mode: '0775'});
      }).then(function (client) {
        expect(client.sftp.fastPut).to.have.callCount(1);
        expect(client.sftp.fastPut).to.have.been.calledWith(local, remote, {mode: '0775'});
      });
    });

    it('should acccept the callback as third parameter', function (done) {
      var local  = '/path/to/local/file';
      var remote = '/path/to/remote/file';

      createSFTPClient().then(function (client) {
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

    it('should transmit SFTP errors', function () {
      var fakeError = new Error('Fake fastPut() error');

      ssh2.setError('fastPut', fakeError);

      return createSFTPClient().then(function (client) {
        return expect(client.put('/path/to/local/file', '/path/to/remote/file')).to.be.rejectedWith(fakeError);
      });
    });

    it('should fail if the client is not connected', function () {
      var local  = '/path/to/local/file';
      var remote = '/path/to/remote/file';

      var client = new SFTPClient({});

      return expect(client.put(local, remote)).to.be.rejectedWith('SFTP client not connected');
    });

  });

  describe('unlink()', function () {

    it('should delete the file via the SFTP connection', function () {
      var path = '/path/to/file';

      return createSFTPClient().tap(function (client) {
        return client.unlink(path);
      }).then(function (client) {
        expect(client.sftp.unlink).to.have.callCount(1);
        expect(client.sftp.unlink).to.have.been.calledWith(path);
      });
    });

    it('should transmit SFTP errors', function () {
      var fakeError = new Error('Fake unlink() error');

      ssh2.setError('unlink', fakeError);

      return createSFTPClient().then(function (client) {
        return expect(client.unlink('/path/to/file')).to.be.rejectedWith(fakeError);
      });
    });

    it('should fail if the client is not connected', function () {
      var client = new SFTPClient({});

      return expect(client.unlink('/path/to/file')).to.be.rejectedWith('SFTP client not connected');
    });

  });

  describe('readdir()', function () {

    it('should return a list of filenames', function () {
      var client = null;
      var path   = '/path/to/directory';

      return createSFTPClient().then(function (_client) {
        client = _client;

        return client.readdir(path);
      }).then(function (files) {
        expect(client.sftp.readdir).to.have.callCount(1);
        expect(client.sftp.readdir).to.have.been.calledWith(path);

        expect(files).to.be.an('array');
        expect(files.length).to.equal(6);

        files.forEach(function (file) {
          expect(file).to.match(/file\d/);
        });
      });
    });

    it('should transmit SFTP errors', function () {
      var fakeError = new Error('Fake readdir() error');

      ssh2.setError('readdir', fakeError);

      return createSFTPClient().then(function (client) {
        return expect(client.readdir('/path/to/directory')).to.be.rejectedWith(fakeError);
      });
    });

    it('should fail if the client is not connected', function () {
      var client = new SFTPClient({});

      return expect(client.readdir('/path/to/directory')).to.be.rejectedWith('SFTP client not connected');
    });

  });

  describe('mkdir()', function () {

    it('should create a directory via the SFTP connection', function () {
      var path = '/path/to/directory';

      return createSFTPClient().tap(function (client) {
        return client.mkdir(path);
      }).then(function (client) {
        expect(client.sftp.mkdir).to.have.callCount(1);
        expect(client.sftp.mkdir).to.have.been.calledWith(path);
      });
    });

    it('should accept `mode` option', function () {
      var path = '/path/to/directory';

      return createSFTPClient().tap(function (client) {
        return client.mkdir(path, {mode: '0775'});
      }).then(function (client) {
        expect(client.sftp.mkdir).to.have.callCount(1);
        expect(client.sftp.mkdir).to.have.been.calledWith(path, {mode: '0775'});
      });
    });

    it('should acccept the callback as second parameter', function (done) {
      var path = '/path/to/directory';

      createSFTPClient().then(function (client) {
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

    it('should transmit SFTP errors', function () {
      var fakeError = new Error('Fake mkdir() error');

      ssh2.setError('mkdir', fakeError);

      return createSFTPClient().then(function (client) {
        return expect(client.mkdir('/path/to/directory')).to.be.rejectedWith(fakeError);
      });
    });

    it('should fail if the client is not connected', function () {
      var client = new SFTPClient({});

      return expect(client.mkdir('/path/to/directory')).to.be.rejectedWith('SFTP client not connected');
    });

  });

  describe('rmdir()', function () {

    it('should delete the directory via the SFTP connection', function () {
      var path = '/path/to/directory';

      return createSFTPClient().tap(function (client) {
        return client.rmdir(path);
      }).then(function (client) {
        expect(client.sftp.rmdir).to.have.callCount(1);
        expect(client.sftp.rmdir).to.have.been.calledWith(path);
      });
    });

    it('should transmit SFTP errors', function () {
      var fakeError = new Error('Fake rmdir() error');

      ssh2.setError('rmdir', fakeError);

      return createSFTPClient().then(function (client) {
        return expect(client.rmdir('/path/to/directory')).to.be.rejectedWith(fakeError);
      });
    });

    it('should fail if the client is not connected', function () {
      var client = new SFTPClient({});

      return expect(client.rmdir('/path/to/directory')).to.be.rejectedWith('SFTP client not connected');
    });

  });

});

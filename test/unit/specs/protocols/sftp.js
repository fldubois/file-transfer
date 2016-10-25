'use strict';

var chai       = require('chai');
var expect     = chai.expect;
var proxyquire = require('proxyquire').noCallThru();

var ssh2 = require('test/unit/mocks/ssh2');

var SFTPClient = proxyquire('lib/protocols/sftp', {
  ssh2: ssh2
});

chai.use(require('sinon-chai'));

function createClient(callback) {
  var sftp  = new SFTPClient({});

  sftp.once('ready', function () {
    return callback(null, sftp);
  });

  sftp.once('error', function (error) {
    return callback(error);
  });

  sftp.connect();
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

    it('should open a SFTP connection', function (done) {
      var options = {
        host: 'localhost',
        port: -1
      };

      var sftp = new SFTPClient(options);

      sftp.once('ready', function () {
        expect(sftp.connected).to.equal(true);

        expect(sftp.client).to.be.an.instanceOf(ssh2.Client, 'should create a new ssh2 client');

        expect(sftp.client.connect).to.have.callCount(1);
        expect(sftp.client.connect).to.have.been.calledWith(options);

        expect(sftp.client.sftp).to.have.callCount(1);

        return done();
      });

      sftp.once('error', function (error) {
        return done(error);
      });

      sftp.connect();
    });

    it('should emit an error on SSH connection error', function (done) {
      var sftp  = new SFTPClient({});
      var error = new Error('Fake SSH connection error');

      ssh2.setError('connect', error);

      sftp.once('ready', function () {
        return done(new Error('connect() succeed with SSH connection error'));
      });

      sftp.once('error', function (err) {
        expect(sftp.connected).to.equal(false);

        expect(err).to.equal(error);

        return done();
      });

      sftp.connect();
    });

    it('should emit an error on SFTP initialization error', function (done) {
      var sftp  = new SFTPClient({});
      var error = new Error('Fake SFTP initialization error');

      ssh2.setError('sftp', error);

      sftp.once('ready', function () {
        return done(new Error('connect() succeed with SFTP initialization error'));
      });

      sftp.once('error', function (err) {
        expect(sftp.connected).to.equal(false);

        expect(err).to.equal(error);

        expect(sftp.client.end).to.have.callCount(1);

        return done();
      });

      sftp.connect();
    });

    after(function () {
      ssh2.clear();
    });

  });

  describe('get()', function () {

    it('should download the file via the SFTP connection', function (done) {
      createClient(function (error, client) {
        if (error) {
          return done(error);
        }

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
      });
    });

    it('should transmit errors', function (done) {
      createClient(function (error, client) {
        if (error) {
          return done(error);
        }

        var fakeError = new Error('Fake fastGet() error');

        ssh2.setError('fastGet', fakeError);

        client.get('/path/to/remote/file', '/path/to/local/file', function (err) {
          expect(err).to.equal(fakeError);

          return done();
        });
      });
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
      createClient(function (error, client) {
        if (error) {
          return done(error);
        }

        var path    = '/path/to/file';
        var options = {test: true};

        client.createReadStream(path, options);

        expect(client.sftp.createReadStream).to.have.callCount(1);
        expect(client.sftp.createReadStream).to.have.been.calledWith(path, options);

        return done();
      });
    });

    it('should ignore the `handle` option', function (done) {
      createClient(function (error, client) {
        if (error) {
          return done(error);
        }

        var path    = '/path/to/file';
        var options = {test: true, handle: 0};

        client.createReadStream(path, options);

        expect(client.sftp.createReadStream).to.have.been.calledWith(path, {test: true});

        return done();
      });
    });

    it('should throw an error if the client is not connected', function () {
      var client = new SFTPClient({});

      expect(function () {
        client.createReadStream('/path/to/file');
      }).to.throw('SFTP client not connected');
    });

  });

  describe('createWriteStream()', function () {

    it('should create a readable stream from the SFTP connection', function (done) {
      createClient(function (error, client) {
        if (error) {
          return done(error);
        }

        var path    = '/path/to/file';
        var options = {test: true};

        client.createWriteStream(path, options);

        expect(client.sftp.createWriteStream).to.have.callCount(1);
        expect(client.sftp.createWriteStream).to.have.been.calledWith(path, options);

        return done();
      });
    });

    it('should ignore the `handle` option', function (done) {
      createClient(function (error, client) {
        if (error) {
          return done(error);
        }

        var path    = '/path/to/file';
        var options = {test: true, handle: 0};

        client.createWriteStream(path, options);

        expect(client.sftp.createWriteStream).to.have.been.calledWith(path, {test: true});

        return done();
      });
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
      createClient(function (error, client) {
        if (error) {
          return done(error);
        }

        var path = '/path/to/directory';

        client.mkdir(path, function (error) {
          if (error) {
            return done(error);
          }

          expect(client.sftp.mkdir).to.have.callCount(1);
          expect(client.sftp.mkdir).to.have.been.calledWith(path);

          return done();
        });
      });
    });

    it('should accept `mode` parameter', function (done) {
      createClient(function (error, client) {
        if (error) {
          return done(error);
        }

        var path = '/path/to/directory';

        client.mkdir(path, '0775', function (error) {
          if (error) {
            return done(error);
          }

          expect(client.sftp.mkdir).to.have.callCount(1);
          expect(client.sftp.mkdir).to.have.been.calledWith(path, {mode: '0775'});

          return done();
        });
      });
    });

    it('should transmit errors', function (done) {
      createClient(function (error, client) {
        if (error) {
          return done(error);
        }

        var fakeError = new Error('Fake mkdir() error');

        ssh2.setError('mkdir', fakeError);

        client.mkdir('/path/to/directory', function (err) {
          expect(err).to.equal(fakeError);

          return done();
        });
      });
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
      createClient(function (error, client) {
        if (error) {
          return done(error);
        }

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
      });
    });

    it('should transmit errors', function (done) {
      createClient(function (error, client) {
        if (error) {
          return done(error);
        }

        var fakeError = new Error('Fake fastPut() error');

        ssh2.setError('fastPut', fakeError);

        client.put('/path/to/local/file', '/path/to/remote/file', function (err) {
          expect(err).to.equal(fakeError);

          return done();
        });
      });
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
      createClient(function (error, client) {
        if (error) {
          return done(error);
        }

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
      });
    });

    it('should transmit errors', function (done) {
      createClient(function (error, client) {
        if (error) {
          return done(error);
        }

        var fakeError = new Error('Fake readdir() error');

        ssh2.setError('readdir', fakeError);

        client.readdir('/path/to/directory', function (err, files) {
          expect(err).to.equal(fakeError);
          expect(files).to.be.a('undefined');

          return done();
        });
      });
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
      createClient(function (error, client) {
        if (error) {
          return done(error);
        }

        var path = '/path/to/directory';

        client.rmdir(path, function (error) {
          if (error) {
            return done(error);
          }

          expect(client.sftp.rmdir).to.have.callCount(1);
          expect(client.sftp.rmdir).to.have.been.calledWith(path);

          return done();
        });
      });
    });

    it('should transmit errors', function (done) {
      createClient(function (error, client) {
        if (error) {
          return done(error);
        }

        var fakeError = new Error('Fake rmdir() error');

        ssh2.setError('rmdir', fakeError);

        client.rmdir('/path/to/directory', function (err) {
          expect(err).to.equal(fakeError);

          return done();
        });
      });
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
      createClient(function (error, client) {
        if (error) {
          return done(error);
        }

        var path = '/path/to/file';

        client.unlink(path, function (error) {
          if (error) {
            return done(error);
          }

          expect(client.sftp.unlink).to.have.callCount(1);
          expect(client.sftp.unlink).to.have.been.calledWith(path);

          return done();
        });
      });
    });

    it('should transmit errors', function (done) {
      createClient(function (error, client) {
        if (error) {
          return done(error);
        }

        var fakeError = new Error('Fake unlink() error');

        ssh2.setError('unlink', fakeError);

        client.unlink('/path/to/file', function (err) {
          expect(err).to.equal(fakeError);

          return done();
        });
      });
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
      createClient(function (error, client) {
        if (error) {
          return done(error);
        }

        expect(client.connected).to.equal(true);

        expect(client.client.end).to.have.callCount(0);

        client.disconnect();

        expect(client.client.end).to.have.callCount(1);

        expect(client.connected).to.equal(false);

        return done();
      });
    });

  });

});

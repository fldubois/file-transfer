'use strict';

var expect     = require('chai').expect;
var proxyquire = require('proxyquire').noCallThru();

var ssh2 = require('../../mocks/ssh2');

var SFTPClient = proxyquire('../../../lib/protocols/sftp', {
  ssh2: ssh2
});

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
        expect(sftp.client).to.be.an.instanceOf(ssh2.Client, 'should create a new ssh2 client');

        expect(sftp.client.connect.calledOnce).to.equal(true, 'should call connect() on ssh2 client');
        expect(sftp.client.connect.calledWith(options)).to.equal(true, 'should pass options to connect()');

        expect(sftp.client.sftp.calledOnce).to.equal(true, 'should call sftp() on ssh2 client');

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
        expect(err).to.equal(error);

        expect(sftp.client.end.calledOnce).to.equal(true, 'should call end() on ssh2 client');

        return done();
      });

      sftp.connect();
    });

    after(function () {
      ssh2.clear();
    });

  });

  describe('createReadStream()', function () {

    it('should create a readable stream from the SFTP connection', function (done) {
      createClient(function (error, sftp) {
        if (error) {
          return done(error);
        }

        var path    = '/path/to/file';
        var options = {test: true};

        sftp.createReadStream(path, options);

        var spy = sftp.sftp.createReadStream;

        expect(spy.calledOnce).to.equal(true, 'should call createReadStream() on ssh2 client');
        expect(spy.calledWith(path, options)).to.equal(true, 'should pass path and options');

        return done();
      });
    });

    it('should ignore the `handle` option', function (done) {
      createClient(function (error, sftp) {
        if (error) {
          return done(error);
        }

        var path    = '/path/to/file';
        var options = {test: true, handle: 0};

        sftp.createReadStream(path, options);

        var spy = sftp.sftp.createReadStream;

        expect(spy.calledWith(path, {test: true})).to.equal(true, 'should remove handle from options');

        return done();
      });
    });

  });

  describe('createWriteStream()', function () {

    it('should create a readable stream from the SFTP connection', function (done) {
      createClient(function (error, sftp) {
        if (error) {
          return done(error);
        }

        var path    = '/path/to/file';
        var options = {test: true};

        sftp.createWriteStream(path, options);

        var spy = sftp.sftp.createWriteStream;

        expect(spy.calledOnce).to.equal(true, 'should call createWriteStream() on ssh2 client');
        expect(spy.calledWith(path, options)).to.equal(true, 'should pass path and options');

        return done();
      });
    });

    it('should ignore the `handle` option', function (done) {
      createClient(function (error, sftp) {
        if (error) {
          return done(error);
        }

        var path    = '/path/to/file';
        var options = {test: true, handle: 0};

        sftp.createWriteStream(path, options);

        var spy = sftp.sftp.createWriteStream;

        expect(spy.calledWith(path, {test: true})).to.equal(true, 'should remove handle from options');

        return done();
      });
    });

  });

  describe('mkdir()', function () {

    it('should create a directory via the SFTP connection', function (done) {
      createClient(function (error, sftp) {
        if (error) {
          return done(error);
        }

        var path = '/path/to/directory';

        sftp.mkdir(path, function (error) {
          if (error) {
            return done(error);
          }

          var spy = sftp.sftp.mkdir;

          expect(spy.calledOnce).to.equal(true, 'should call mkdir() on ssh2 client');
          expect(spy.calledWith(path)).to.equal(true, 'should pass path');

          return done();
        });
      });
    });

    it('should accept `mode` parameter', function (done) {
      createClient(function (error, sftp) {
        if (error) {
          return done(error);
        }

        var path = '/path/to/directory';

        sftp.mkdir(path, '0775', function (error) {
          if (error) {
            return done(error);
          }

          var spy = sftp.sftp.mkdir;

          expect(spy.calledOnce).to.equal(true, 'should call mkdir() on ssh2 client');
          expect(spy.calledWith(path, {mode: '0775'})).to.equal(true, 'should pass path and mode');

          return done();
        });
      });
    });

    it('should transmit errors', function (done) {
      createClient(function (error, sftp) {
        if (error) {
          return done(error);
        }

        var error = new Error('Fake mkdir() error');

        ssh2.setError('mkdir', error);

        sftp.mkdir('/path/to/directory', function (err) {
          expect(err).to.equal(error);

          return done();
        });
      });
    });

  });

  describe('readdir()', function () {

    it('should return a list of filenames', function (done) {
      createClient(function (error, sftp) {
        if (error) {
          return done(error);
        }

        var path = '/path/to/file';

        sftp.readdir(path, function (error, files) {
          if (error) {
            return done(error);
          }

          var spy = sftp.sftp.readdir;

          expect(spy.calledOnce).to.equal(true, 'should call readdir() on ssh2 client');
          expect(spy.calledWith(path)).to.equal(true, 'should pass path');

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
      createClient(function (error, sftp) {
        if (error) {
          return done(error);
        }

        var error = new Error('Fake readdir() error');

        ssh2.setError('readdir', error);

        sftp.readdir('/path/to/file', function (err, files) {
          expect(err).to.equal(error);
          expect(files).to.be.a('undefined');

          return done();
        });
      });
    });

  });

  describe('rmdir()', function () {

    it('should create a directory via the SFTP connection', function (done) {
      createClient(function (error, sftp) {
        if (error) {
          return done(error);
        }

        var path = '/path/to/directory';

        sftp.rmdir(path, function (error) {
          if (error) {
            return done(error);
          }

          var spy = sftp.sftp.rmdir;

          expect(spy.calledOnce).to.equal(true, 'should call rmdir() on ssh2 client');
          expect(spy.calledWith(path)).to.equal(true, 'should pass path');

          return done();
        });
      });
    });

    it('should transmit errors', function (done) {
      createClient(function (error, sftp) {
        if (error) {
          return done(error);
        }

        var error = new Error('Fake rmdir() error');

        ssh2.setError('rmdir', error);

        sftp.rmdir('/path/to/directory', function (err) {
          expect(err).to.equal(error);

          return done();
        });
      });
    });

  });

  describe('unlink()', function () {

    it('should delete the file via the SFTP connection', function (done) {
      createClient(function (error, sftp) {
        if (error) {
          return done(error);
        }

        var path = '/path/to/file';

        sftp.unlink(path, function (error) {
          if (error) {
            return done(error);
          }

          var spy = sftp.sftp.unlink;

          expect(spy.calledOnce).to.equal(true, 'should call unlink() on ssh2 client');
          expect(spy.calledWith(path)).to.equal(true, 'should pass parameters');

          return done();
        });
      });
    });

    it('should transmit errors', function (done) {
      createClient(function (error, sftp) {
        if (error) {
          return done(error);
        }

        var error = new Error('Fake unlink() error');

        ssh2.setError('unlink', error);

        sftp.unlink('/path/to/file', function (err) {
          expect(err).to.equal(error);

          return done();
        });
      });
    });

  });

  describe('disconnect()', function () {

    it('should close the SSH connection', function (done) {
      createClient(function (error, sftp) {
        if (error) {
          return done(error);
        }

        expect(sftp.client.end.calledOnce).to.equal(false, 'should not call end() on ssh2 client at connection');

        sftp.disconnect();

        expect(sftp.client.end.calledOnce).to.equal(true, 'should call end() on ssh2 client');

        return done();
      });
    });

  });

});

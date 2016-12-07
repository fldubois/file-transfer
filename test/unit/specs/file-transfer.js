'use strict';

var chai       = require('chai');
var expect     = chai.expect;
var proxyquire = require('proxyquire').noCallThru();

var Promise = require('bluebird');

var ClientMock = require('test/unit/mocks/client');

chai.use(require('chai-as-promised'));

var transfer = proxyquire('lib/file-transfer', {
  './protocols/sftp':   ClientMock,
  './protocols/webdav': ClientMock
});

describe('file-transfer', function () {

  it('should export clients', function () {
    expect(transfer).to.include.keys('clients');
    expect(transfer.clients).to.be.an('object');

    Object.keys(transfer.clients).forEach(function (name) {
      expect(transfer.clients[name]).to.be.a('function');
      expect(transfer.clients[name]).to.equal(ClientMock);
    });
  });

  it('should export connect()', function () {
    expect(transfer).to.respondTo('connect');
  });

  describe('connect()', function () {

    it('should return an error on unknown protocol', function (done) {
      transfer.connect('unknown', {}, function (error, client) {
        expect(error).to.be.an('error');
        expect(error.message).to.equal('Unknown file transfer protocol: unknown');

        expect(client).to.be.an('undefined');

        done();
      });
    });

    it('should return an error on connection error', function (done) {
      var options = {
        errors: {
          connect: 'Fake connection error'
        }
      };

      transfer.connect('sftp', options, function (error, client) {
        expect(error).to.be.an('error');
        expect(error.message).to.equal('Fake connection error');

        expect(client).to.be.an('undefined');

        done();
      });
    });

    it('should initialize a new client', function (done) {
      var options = {test: true};

      transfer.connect('sftp', options, function (error, client) {
        if (error) {
          return done(error);
        }

        expect(client).to.be.an.instanceOf(ClientMock, 'should instantiate a new client');

        expect(client.connect.calledOnce).to.equal(true, 'should call connect() on client');
        expect(client.options).to.equal(options, 'shoul set options on client');

        done();
      });
    });

    it('should accept protocol in options', function (done) {
      var options = {
        protocol: 'sftp',
        test:     true
      };

      transfer.connect(options, function (error, client) {
        if (error) {
          return done(error);
        }

        expect(client).to.be.an.instanceOf(ClientMock, 'should instantiate a new client');

        expect(client.connect.calledOnce).to.equal(true, 'should call connect() on client');
        expect(client.options).to.deep.equal({test: true}, 'shoul set options on client');

        done();
      });
    });

    it('should return a Promise', function () {
      expect(transfer.connect('sftp', {test: true})).to.eventually.be.an.instanceOf(ClientMock);
    });

  });

  describe('disposer()', function () {

    it('should automatically close the client', function () {
      var client  = null;
      var options = {test: true};

      return Promise.using(transfer.disposer('sftp', options), function (_client) {
        expect(_client).to.be.an.instanceOf(ClientMock, 'should instantiate a new client');

        expect(_client.connect.calledOnce).to.equal(true, 'should call connect() on client');
        expect(_client.options).to.equal(options, 'shoul set options on client');

        client = _client;
      }).then(function () {
        expect(client.disconnect.calledOnce).to.equal(true, 'should call disconnect() on client');
      });
    });

  });

});

'use strict';

var os = require('os');
var fs = require('fs');

var chai   = require('chai');
var expect = chai.expect;
var nock   = require('nock');

var Promise = require('bluebird');

var WebDAVClient = require('lib/protocols/webdav');

var options = {
  host:     'www.example.com',
  path:     'webdav',
  username: 'john',
  password: '117'
};

var credentials = {
  user: 'john',
  pass: '117'
};

var methods = ['OPTIONS', 'GET', 'PUT', 'DELETE', 'MKCOL', 'PROPFIND'];

Promise.promisifyAll(fs);

function createWebDAVClient() {
  nock('http://www.example.com')
    .intercept('/webdav/', 'OPTIONS')
    .basicAuth(credentials)
    .reply(200, '', {
      allow: methods.join(',')
    });

  var client = new WebDAVClient(options);

  return client.connect().thenReturn(client);
}

describe('protocols/webdav', function () {

  before('disable unmocked HTTP requests', function () {
    nock.disableNetConnect();
  });

  beforeEach(function () {
    nock.cleanAll();
  });

  it('should expose common client interface', function () {
    expect(WebDAVClient).to.be.a('function');
    expect(WebDAVClient).to.respondTo('connect');
    expect(WebDAVClient).to.respondTo('disconnect');
  });

  describe('connect()', function () {

    it('should check WebDAV connectivity with an OPTIONS request', function () {
      var scope = nock('http://www.webdav-example.com')
        .intercept('/', 'OPTIONS')
        .reply(200, '', {
          allow: methods.join(',')
        });

      var client = new WebDAVClient({
        host: 'www.webdav-example.com'
      });

      return client.connect().then(function () {
        expect(scope.isDone()).to.equal(true);
        expect(client.connected).to.equal(true);
      });
    });

    it('should accept credentials variants', function () {
      var scope = nock('http://www.example.com')
        .intercept('/webdav/', 'OPTIONS')
        .basicAuth(credentials)
        .reply(200, '', {
          allow: methods.join(',')
        });

      var client = new WebDAVClient({
        host: 'www.example.com',
        path: 'webdav',
        user: 'john',
        pass: '117'
      });

      return client.connect().then(function () {
        expect(scope.isDone()).to.equal(true);
        expect(client.connected).to.equal(true);
      });
    });

    it('should check supported HTTP methods', function (done) {
      var scope = nock('http://www.example.com')
        .intercept('/webdav/', 'OPTIONS')
        .basicAuth(credentials)
        .reply(200, '', {
          allow: ['OPTIONS', 'PUT', 'DELETE', 'PROPFIND'].join(',')
        });

      var client = new WebDAVClient(options);

      client.connect().then(function () {
        return done(new Error('connect() succeed with unsupported methods'));
      }).catch(function (error) {
        expect(scope.isDone()).to.equal(true);

        expect(client.connected).to.equal(false);

        expect(error).to.be.an('error');

        expect(error.message).to.equal('Unsupported HTTP methods: GET, MKCOL');

        return done();
      });
    });

    it('should return an error on OPTIONS request error', function (done) {
      var scope = nock('http://www.example.com')
        .intercept('/webdav/', 'OPTIONS')
        .basicAuth(credentials)
        .reply(401);

      var client = new WebDAVClient(options);

      client.connect().then(function () {
        return done(new Error('connect() succeed with OPTIONS request error'));
      }).catch(function (error) {
        expect(scope.isDone()).to.equal(true);

        expect(client.connected).to.equal(false);

        expect(error).to.be.an('error');

        expect(error.message).to.equal('WebDAV request error');
        expect(error.statusCode).to.equal(401);
        expect(error.statusMessage).to.equal('Unauthorized');

        return done();
      });
    });

    it('should return an error on request failure', function (done) {
      var client = new WebDAVClient(options);

      client.connect().then(function () {
        return done(new Error('connect() succeed with request failure'));
      }).catch(function (error) {
        expect(error.message).to.equal('Nock: Not allow net connect for "www.example.com:80/webdav/"');

        expect(client.connected).to.equal(false);

        return done();
      });
    });

  });

  describe('isConnected()', function () {

    it('should return true when the client is connected', function () {
      nock('http://www.example.com')
        .intercept('/webdav/', 'OPTIONS')
        .basicAuth(credentials)
        .reply(200, '', {
          allow: methods.join(',')
        });

      var client = new WebDAVClient(options);

      expect(client.isConnected()).to.equal(false);

      return client.connect().then(function () {
        expect(client.isConnected()).to.equal(true);

        client.disconnect();

        expect(client.isConnected()).to.equal(false);
      });
    });

  });

  describe('supportsStreams()', function () {

    it('should return true', function () {
      expect(new WebDAVClient(options).supportsStreams()).to.equal(true);
    });

  });

  describe('createReadStream()', function () {

    it('should return a read stream', function (done) {
      var scope = nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(credentials)
        .reply(200, 'Hello, friend.');

      createWebDAVClient().then(function (client) {
        var stream  = client.createReadStream('file.txt');
        var content = '';

        stream.on('data', function (data) {
          content += data.toString();
        });

        stream.on('error', done);

        stream.on('end', function () {
          expect(scope.isDone()).to.equal(true);
          expect(content).to.equal('Hello, friend.');
          return done();
        });
      }).catch(done);
    });

    it('should return an error on request bad response', function (done) {
      var scope = nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(credentials)
        .reply(404);

      createWebDAVClient().then(function (client) {
        var stream = client.createReadStream('file.txt');

        stream.on('data', function () {
          return done(new Error('Read stream created with request error'));
        });

        stream.on('error', function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message).to.equal('WebDAV request error');
          expect(error.statusCode).to.equal(404);
          expect(error.statusMessage).to.equal('Not Found');

          return done();
        });

        stream.on('end', function () {
          return done(new Error('Read stream created with request error'));
        });
      }).catch(done);
    });

  });

  describe('createWriteStream()', function () {

    it('should return a read stream', function (done) {
      var scope = nock('http://www.example.com')
        .put('/webdav/file.txt', 'Hello, friend.')
        .basicAuth(credentials)
        .reply(200);

      createWebDAVClient().then(function (client) {
        var stream  = client.createWriteStream('file.txt');

        stream.on('error', done);

        stream.on('end', function () {
          expect(scope.isDone()).to.equal(true);
          return done();
        });

        stream.end('Hello, friend.', 'utf8');
      }).catch(done);
    });

    it('should return an error on request bad response', function (done) {
      var scope = nock('http://www.example.com')
        .put('/webdav/file.txt')
        .basicAuth(credentials)
        .reply(401);

      createWebDAVClient().then(function (client) {
        var stream = client.createWriteStream('file.txt');

        stream.on('error', function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message).to.equal('WebDAV request error');
          expect(error.statusCode).to.equal(401);
          expect(error.statusMessage).to.equal('Unauthorized');

          return done();
        });
      }).catch(done);
    });

  });

  describe('get()', function () {

    it('should download the file', function () {
      var scope = nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(credentials)
        .reply(200, 'Hello, friend.');

      var path = os.tmpdir() + '/' + Date.now() + '.txt';

      return createWebDAVClient().then(function (client) {
        return client.get('file.txt', path);
      }).then(function () {
        return fs.readFileAsync(path, 'utf8');
      }).then(function (content) {
        expect(scope.isDone()).to.equal(true);
        expect(content).to.equal('Hello, friend.');
      }).finally(function () {
        return fs.unlinkAsync(path);
      });
    });

    it('should return an error on request bad response', function () {
      var scope = nock('http://www.example.com')
        .get('/webdav/remote.txt')
        .basicAuth(credentials)
        .reply(404);

      return createWebDAVClient().then(function (client) {
        return expect(client.get('remote.txt', 'local.txt')).to.be.rejectedWith('WebDAV request error');
      });
    });
  });

  describe('mkdir()', function () {

    it('should send a MKCOL request', function () {
      var scope = nock('http://www.example.com')
        .intercept('/webdav/path/to/directory', 'MKCOL')
        .basicAuth(credentials)
        .reply(201);

      return createWebDAVClient().then(function (client) {
        return client.mkdir('path/to/directory');
      }).then(function () {
        expect(scope.isDone()).to.equal(true);
      });
    });

    it('should ignore `mode` parameter', function () {
      var scope = nock('http://www.example.com')
        .intercept('/webdav/path/to/directory', 'MKCOL')
        .basicAuth(credentials)
        .reply(201);

      return createWebDAVClient().then(function (client) {
        return client.mkdir('path/to/directory', '0775');
      }).then(function () {
        expect(scope.isDone()).to.equal(true);
      });
    });

    it('should acccept the callback as second parameter', function (done) {
      var scope = nock('http://www.example.com')
        .intercept('/webdav/path/to/directory', 'MKCOL')
        .basicAuth(credentials)
        .reply(201);

      createWebDAVClient().then(function (client) {
        client.mkdir('path/to/directory', function (error) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);

          return done();
        });
      }).catch(done);
    });

    it('should return an error on request bad response', function () {
      var scope = nock('http://www.example.com')
        .intercept('/webdav/path/to/directory', 'MKCOL')
        .basicAuth(credentials)
        .reply(400);

      return createWebDAVClient().then(function (client) {
        return expect(client.mkdir('path/to/directory')).to.be.rejectedWith('WebDAV request error');
      });
    });

  });

  describe('put()', function () {

    it('should upload the file', function () {
      var scope = nock('http://www.example.com')
        .put('/webdav/file.txt', 'Hello, friend.')
        .basicAuth(credentials)
        .reply(200);

      var path = os.tmpdir() + '/' + Date.now() + '.txt';

      return createWebDAVClient().tap(function (client) {
        return fs.writeFileAsync(path, 'Hello, friend.', 'utf8');
      }).then(function (client) {
        return client.put(path, 'file.txt');
      }).then(function () {
        expect(scope.isDone()).to.equal(true);
      }).finally(function () {
        return fs.unlinkAsync(path);
      });
    });

    it('should ignore the `option` parameter', function () {
      var scope = nock('http://www.example.com')
        .put('/webdav/file.txt', 'Hello, friend.')
        .basicAuth(credentials)
        .reply(200);

      var path = os.tmpdir() + '/' + Date.now() + '.txt';

      return createWebDAVClient().tap(function (client) {
        return fs.writeFileAsync(path, 'Hello, friend.', 'utf8');
      }).then(function (client) {
        return client.put(path, 'file.txt', {test: true});
      }).then(function () {
        expect(scope.isDone()).to.equal(true);
      }).finally(function () {
        return fs.unlinkAsync(path);
      });
    });

    it('should acccept the callback as third parameter', function (done) {
      var scope = nock('http://www.example.com')
        .put('/webdav/file.txt', 'Hello, friend.')
        .basicAuth(credentials)
        .reply(200);

      var path = os.tmpdir() + '/' + Date.now() + '.txt';

      createWebDAVClient().tap(function (client) {
        return fs.writeFileAsync(path, 'Hello, friend.', 'utf8');
      }).then(function (client) {
        client.put(path, 'file.txt', function (error) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);

          return done();
        });
      }).catch(done).finally(function () {
        return fs.unlinkAsync(path);
      });
    });

    it('should return an error on request bad response', function () {
      var scope = nock('http://www.example.com')
        .put('/webdav/file.txt', 'Hello, friend.')
        .basicAuth(credentials)
        .reply(400);

      var path = os.tmpdir() + '/' + Date.now() + '.txt';

      return createWebDAVClient().tap(function (client) {
        return fs.writeFileAsync(path, 'Hello, friend.', 'utf8');
      }).then(function (client) {
        return expect(client.put(path, 'file.txt')).to.be.rejectedWith('WebDAV request error');
      }).finally(function () {
        return fs.unlinkAsync(path);
      });
    });

  });

  describe('readdir()', function () {

    it('should return a list of filenames', function () {
      var headers = {
        'Content-Type': 'text/xml',
        'Depth':        1
      };

      var scope = nock('http://www.example.com', headers)
        .intercept('/webdav/dir', 'PROPFIND')
        .basicAuth(credentials)
        .reply(200, [
          '<?xml version="1.0" encoding="utf-8"?>',
          '<D:multistatus xmlns:D="DAV:">',
          '  <D:response xmlns:lp2="http://apache.org/dav/props/" xmlns:lp1="DAV:">',
          '    <D:href>/webdav/dir/</D:href>',
          '  </D:response>',
          '  <D:response xmlns:lp2="http://apache.org/dav/props/" xmlns:lp1="DAV:">',
          '    <D:href>/webdav/dir/</D:href>',
          '  </D:response>',
          '  <D:response xmlns:lp2="http://apache.org/dav/props/" xmlns:lp1="DAV:">',
          '    <D:href>/webdav/dir/subdir/</D:href>',
          '  </D:response>',
          '  <D:response xmlns:lp2="http://apache.org/dav/props/" xmlns:lp1="DAV:">',
          '    <D:href>/webdav/dir/file1.txt</D:href>',
          '  </D:response>',
          '  <D:response xmlns:lp2="http://apache.org/dav/props/" xmlns:lp1="DAV:">',
          '    <D:href>/webdav/dir/file2.txt</D:href>',
          '  </D:response>',
          '</D:multistatus>'
        ].join('\n'));

      return createWebDAVClient().then(function (client) {
        return client.readdir('dir');
      }).then(function (files) {
        expect(scope.isDone()).to.equal(true);

        expect(files).to.be.an('array');
        expect(files).to.deep.equal(['subdir', 'file1.txt', 'file2.txt']);
      });
    });

    it('should return an error on request bad response', function () {
      var headers = {
        'Content-Type': 'text/xml',
        'Depth':        1
      };

      var scope = nock('http://www.example.com', headers)
        .intercept('/webdav/dir', 'PROPFIND')
        .basicAuth(credentials)
        .reply(400);

      return createWebDAVClient().then(function (client) {
        return expect(client.readdir('dir')).to.be.rejectedWith('WebDAV request error');
      });
    });

    it('should return an error on bad XML response', function () {
      var headers = {
        'Content-Type': 'text/xml',
        'Depth':        1
      };

      var scope = nock('http://www.example.com', headers)
        .intercept('/webdav/dir', 'PROPFIND')
        .basicAuth(credentials)
        .reply(200, 'Not an XML');

      return createWebDAVClient().then(function (client) {
        return expect(client.readdir('dir')).to.be.rejectedWith('Non-whitespace before first tag.');
      });
    });

    it('should return an error on empty response', function () {
      var headers = {
        'Content-Type': 'text/xml',
        'Depth':        1
      };

      var scope = nock('http://www.example.com', headers)
        .intercept('/webdav/dir', 'PROPFIND')
        .basicAuth(credentials)
        .reply(200, '');

      return createWebDAVClient().then(function (client) {
        return expect(client.readdir('dir')).to.be.rejectedWith('Empty response on PROPFIND');
      });
    });

  });

  describe('rmdir()', function () {

    it('should delete the WebDAV collection', function () {
      var scope = nock('http://www.example.com', {Depth: 'infinity'})
        .delete('/webdav/path/to/directory/')
        .basicAuth(credentials)
        .reply(201);

      return createWebDAVClient().then(function (client) {
        return client.rmdir('path/to/directory');
      }).then(function () {
        expect(scope.isDone()).to.equal(true);
      });
    });

    it('should return an error on request bad response', function () {
      var scope = nock('http://www.example.com', {Depth: 'infinity'})
        .delete('/webdav/path/to/directory/')
        .basicAuth(credentials)
        .reply(400);

      return createWebDAVClient().then(function (client) {
        return expect(client.rmdir('path/to/directory/')).to.be.rejectedWith('WebDAV request error');
      });
    });

  });

  describe('unlink()', function () {

    it('should delete the WebDAV file', function () {
      var scope = nock('http://www.example.com')
        .delete('/webdav/path/to/file.txt')
        .basicAuth(credentials)
        .reply(201);

      return createWebDAVClient().then(function (client) {
        return client.unlink('path/to/file.txt');
      }).then(function () {
        expect(scope.isDone()).to.equal(true);
      });
    });

    it('should return an error on request bad response', function () {
      var scope = nock('http://www.example.com')
        .delete('/webdav/path/to/file.txt')
        .basicAuth(credentials)
        .reply(400);

      return createWebDAVClient().then(function (client) {
        return expect(client.unlink('path/to/file.txt')).to.be.rejectedWith('WebDAV request error');
      });
    });

  });

  describe('disconnect()', function () {

    it('should set connected to false and return null', function (done) {
      createWebDAVClient().then(function (client) {
        expect(client.disconnect()).to.equal(null);
        expect(client.connected).to.equal(false);

        return done();
      }).catch(done);
    });

  });

  describe('request()', function () {

    it('should return the request instance', function (done) {
      nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(credentials)
        .reply(200, 'Hello');

      createWebDAVClient().then(function (client) {
        var request = client.request('GET', 'file');

        expect(request).to.include.keys(['method', 'headers', 'uri', 'httpModule']);

        return done();
      }).catch(done);
    });

    it('should send the HTTP request', function (done) {
      var scope = nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(credentials)
        .reply(200, 'Hello');

      createWebDAVClient().then(function (client) {
        client.request('GET', 'file.txt', function (error, response, body) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);
          expect(response).to.include.keys(['connection', 'statusCode', 'url', 'httpVersion']);
          expect(body).to.equal('Hello');

          return done();
        });
      }).catch(done);
    });

    it('should send the request body', function (done) {
      var scope = nock('http://www.example.com')
        .post('/webdav/file.txt', 'Hello')
        .basicAuth(credentials)
        .reply(200, 'World');

      createWebDAVClient().then(function (client) {
        client.request('POST', 'file.txt', 'Hello', function (error, response, body) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);
          expect(response).to.include.keys(['connection', 'statusCode', 'url', 'httpVersion']);
          expect(body).to.equal('World');

          return done();
        });
      }).catch(done);
    });

    it('should accept request options', function (done) {
      var headers = {
        From: 'me'
      };

      var scope = nock('http://www.example.com', headers)
        .get('/webdav/file.txt')
        .basicAuth(credentials)
        .reply(200, 'Hello');

      createWebDAVClient().then(function (client) {
        client.request({
          method:  'GET',
          headers: headers
        }, 'file.txt', function (error, response, body) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);
          expect(response).to.include.keys(['connection', 'statusCode', 'url', 'httpVersion']);
          expect(body).to.equal('Hello');

          return done();
        });
      }).catch(done);
    });

    it('should send request on unconnected client with `force` option', function (done) {
      var scope = nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(credentials)
        .reply(200, 'Hello');

      var client = new WebDAVClient(options);

      client.request({
        method: 'GET',
        force:  true
      }, 'file.txt', function (error, response, body) {
        if (error) {
          return done(error);
        }

        expect(scope.isDone()).to.equal(true);
        expect(response).to.include.keys(['connection', 'statusCode', 'url', 'httpVersion']);
        expect(body).to.equal('Hello');

        return done();
      });
    });

    it('should throw an error with synchronous usage on unconnected client', function () {
      var client = new WebDAVClient(options);

      expect(function () {
        client.request('GET', 'file.txt');
      }).to.throw('WebDAV client not connected');
    });

    it('should return an error on unconnected client', function (done) {
      var client = new WebDAVClient(options);

      client.request('GET', 'file.txt', function (error) {
        expect(error).to.be.an('error');
        expect(error.message).to.equal('WebDAV client not connected');

        return done();
      });
    });

    it('should return an error on request bad response', function (done) {
      var scope = nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(credentials)
        .reply(400);

      createWebDAVClient().then(function (client) {
        client.request('GET', 'file.txt', function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message).to.equal('WebDAV request error');
          expect(error.statusCode).to.equal(400);
          expect(error.statusMessage).to.equal('Bad Request');

          return done();
        });
      }).catch(done);
    });

    it('should return an error on request failure', function (done) {
      createWebDAVClient().then(function (client) {
        client.request('GET', 'file.txt', function (error) {
          expect(error.message).to.match(/^Nock: No match for request/);

          return done();
        });
      }).catch(done);
    });

  });

  describe('requestAsync()', function () {

    it('should encapsulate the HTTP request in a Promise', function () {
      var scope = nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(credentials)
        .reply(200, 'Hello');

      return createWebDAVClient().then(function (client) {
        var req = client.requestAsync('GET', 'file.txt');

        expect(req).to.be.an.instanceOf(Promise);

        return req;
      }).then(function (data) {
        expect(scope.isDone()).to.equal(true);

        expect(data).to.be.an('array');
        expect(data.length).to.equal(2);

        var response = data[0];
        var body     = data[1];

        expect(response).to.include.keys(['connection', 'statusCode', 'url', 'httpVersion']);
        expect(body).to.equal('Hello');
      });
    });

  });

  after('enable unmocked HTTP requests', function () {
    nock.enableNetConnect();
  });

});

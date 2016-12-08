'use strict';

var os = require('os');
var fs = require('fs');

var chai   = require('chai');
var expect = chai.expect;
var nock   = require('nock');

var WebDAVClient = require('lib/protocols/webdav');

var options = {
  host: 'www.example.com',
  path: 'webdav',
  user: 'john',
  pass: '117'
};

var credentials = {
  user: 'john',
  pass: '117'
};

function createWebDAVClient() {
  nock('http://www.example.com')
    .intercept('/webdav/', 'OPTIONS')
    .basicAuth(credentials)
    .reply(200);

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
        .reply(200);

      var client = new WebDAVClient({
        host: 'www.webdav-example.com'
      });

      return client.connect().then(function () {
        expect(scope.isDone()).to.equal(true);
        expect(client.connected).to.equal(true);
      });
    });

    it('should emit an error on OPTIONS request error', function (done) {
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

    it('should emit an error on request failure', function (done) {
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
        .reply(200);

      var client = new WebDAVClient(options);

      expect(client.isConnected()).to.equal(false);

      return client.connect().then(function () {
        expect(client.isConnected()).to.equal(true);

        client.disconnect();

        expect(client.isConnected()).to.equal(false);
      });
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

    it('should emit an error on request bad response', function (done) {
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

    it('should emit an error on request bad response', function (done) {
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

    it('should download the file', function (done) {
      var scope = nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(credentials)
        .reply(200, 'Hello, friend.');

      createWebDAVClient().then(function (client) {
        var path = os.tmpdir() + '/' + Date.now() + '.txt';

        client.get('file.txt', path, function (error) {
          if (error) {
            return done(error);
          }

          fs.readFile(path, 'utf8', function (error, content) {
            if (error) {
              return done(error);
            }

            expect(scope.isDone()).to.equal(true);
            expect(content).to.equal('Hello, friend.');

            fs.unlink(path, done);
          });
        });
      }).catch(done);
    });

    it('should emit an error on request bad response', function (done) {
      var scope = nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(credentials)
        .reply(404);

      createWebDAVClient().then(function (client) {
        var path = os.tmpdir() + '/' + Date.now() + '.txt';

        client.get('file.txt', path, function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message).to.equal('WebDAV request error');
          expect(error.statusCode).to.equal(404);
          expect(error.statusMessage).to.equal('Not Found');

          return done();
        });
      }).catch(done);
    });

  });

  describe('mkdir()', function () {

    it('should send a MKCOL request', function (done) {
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

    it('should ignore `mode` parameter', function (done) {
      var scope = nock('http://www.example.com')
        .intercept('/webdav/path/to/directory', 'MKCOL')
        .basicAuth(credentials)
        .reply(201);

      createWebDAVClient().then(function (client) {
        client.mkdir('path/to/directory', '0775', function (error) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);

          return done();
        });
      }).catch(done);
    });

    it('should emit an error on request bad response', function (done) {
      var scope = nock('http://www.example.com')
        .intercept('/webdav/path/to/directory', 'MKCOL')
        .basicAuth(credentials)
        .reply(400);

      createWebDAVClient().then(function (client) {
        client.mkdir('path/to/directory', function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message).to.equal('WebDAV request error');
          expect(error.statusCode).to.equal(400);
          expect(error.statusMessage).to.equal('Bad Request');

          return done();
        });
      }).catch(done);
    });

  });

  describe('put()', function () {

    it('should upload the file', function (done) {
      var scope = nock('http://www.example.com')
        .put('/webdav/file.txt', 'Hello, friend.')
        .basicAuth(credentials)
        .reply(200);

      createWebDAVClient().then(function (client) {
        var path = os.tmpdir() + '/' + Date.now() + '.txt';

        fs.writeFile(path, 'Hello, friend.', 'utf8', function (error) {
          if (error) {
            return done(error);
          }

          client.put(path, 'file.txt', function (error) {
            if (error) {
              return done(error);
            }

            expect(scope.isDone()).to.equal(true);

            fs.unlink(path, done);
          });
        });
      }).catch(done);
    });

    it('should ignore the `option` parameter', function (done) {
      var scope = nock('http://www.example.com')
        .put('/webdav/file.txt', 'Hello, friend.')
        .basicAuth(credentials)
        .reply(200);

      createWebDAVClient().then(function (client) {
        var path = os.tmpdir() + '/' + Date.now() + '.txt';

        fs.writeFile(path, 'Hello, friend.', 'utf8', function (error) {
          if (error) {
            return done(error);
          }

          client.put(path, 'file.txt', {test: true}, function (error) {
            if (error) {
              return done(error);
            }

            expect(scope.isDone()).to.equal(true);

            fs.unlink(path, done);
          });
        });
      }).catch(done);
    });

    it('should emit an error on request bad response', function (done) {
      var scope = nock('http://www.example.com')
        .put('/webdav/file.txt', 'Hello, friend.')
        .basicAuth(credentials)
        .reply(400);

      createWebDAVClient().then(function (client) {
        var path = os.tmpdir() + '/' + Date.now() + '.txt';

        fs.writeFile(path, 'Hello, friend.', 'utf8', function (error) {
          if (error) {
            return done(error);
          }

          client.put(path, 'file.txt', function (error) {
            expect(scope.isDone()).to.equal(true);

            expect(error).to.be.an('error');
            expect(error.message).to.equal('WebDAV request error');
            expect(error.statusCode).to.equal(400);
            expect(error.statusMessage).to.equal('Bad Request');

            fs.unlink(path, done);
          });
        });
      }).catch(done);
    });

  });

  describe('readdir()', function () {

    it('should return a list of filenames', function (done) {
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

      createWebDAVClient().then(function (client) {
        client.readdir('dir', function (error, files) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);

          expect(files).to.be.an('array');
          expect(files).to.deep.equal(['subdir', 'file1.txt', 'file2.txt']);

          return done();
        });
      }).catch(done);
    });

    it('should emit an error on request bad response', function (done) {
      var headers = {
        'Content-Type': 'text/xml',
        'Depth':        1
      };

      var scope = nock('http://www.example.com', headers)
        .intercept('/webdav/dir', 'PROPFIND')
        .basicAuth(credentials)
        .reply(400);

      createWebDAVClient().then(function (client) {
        client.readdir('dir', function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message).to.equal('WebDAV request error');
          expect(error.statusCode).to.equal(400);
          expect(error.statusMessage).to.equal('Bad Request');

          return done();
        });
      }).catch(done);
    });

    it('should emit an error on bad XML response', function (done) {
      var headers = {
        'Content-Type': 'text/xml',
        'Depth':        1
      };

      var scope = nock('http://www.example.com', headers)
        .intercept('/webdav/dir', 'PROPFIND')
        .basicAuth(credentials)
        .reply(200, 'Not an XML');

      createWebDAVClient().then(function (client) {
        client.readdir('dir', function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message.split('\n')[0]).to.equal('Non-whitespace before first tag.');

          return done();
        });
      }).catch(done);
    });

    it('should emit an error on empty response', function (done) {
      var headers = {
        'Content-Type': 'text/xml',
        'Depth':        1
      };

      var scope = nock('http://www.example.com', headers)
        .intercept('/webdav/dir', 'PROPFIND')
        .basicAuth(credentials)
        .reply(200, '');

      createWebDAVClient().then(function (client) {
        client.readdir('dir', function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message).to.equal('Empty response on PROPFIND');

          return done();
        });
      }).catch(done);
    });

  });

  describe('rmdir()', function () {

    it('should delete the WebDAV collection', function (done) {
      var scope = nock('http://www.example.com', {Depth: 'infinity'})
        .delete('/webdav/path/to/directory/')
        .basicAuth(credentials)
        .reply(201);

      createWebDAVClient().then(function (client) {
        client.rmdir('path/to/directory', function (error) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);

          return done();
        });
      }).catch(done);
    });

    it('should emit an error on request bad response', function (done) {
      var scope = nock('http://www.example.com', {Depth: 'infinity'})
        .delete('/webdav/path/to/directory/')
        .basicAuth(credentials)
        .reply(400);

      createWebDAVClient().then(function (client) {
        client.rmdir('path/to/directory/', function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message).to.equal('WebDAV request error');
          expect(error.statusCode).to.equal(400);
          expect(error.statusMessage).to.equal('Bad Request');

          return done();
        });
      }).catch(done);
    });

  });

  describe('unlink()', function () {

    it('should delete the WebDAV file', function (done) {
      var scope = nock('http://www.example.com')
        .delete('/webdav/path/to/file.txt')
        .basicAuth(credentials)
        .reply(201);

      createWebDAVClient().then(function (client) {
        client.unlink('path/to/file.txt', function (error) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);

          return done();
        });
      }).catch(done);
    });

    it('should emit an error on request bad response', function (done) {
      var scope = nock('http://www.example.com')
        .delete('/webdav/path/to/file.txt')
        .basicAuth(credentials)
        .reply(400);

      createWebDAVClient().then(function (client) {
        client.unlink('path/to/file.txt', function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message).to.equal('WebDAV request error');
          expect(error.statusCode).to.equal(400);
          expect(error.statusMessage).to.equal('Bad Request');

          return done();
        });
      }).catch(done);
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
        client.request('GET', 'file.txt', function (error, body) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);
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
        client.request('POST', 'file.txt', 'Hello', function (error, body) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);
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
        }, 'file.txt', function (error, body) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);
          expect(body).to.equal('Hello');

          return done();
        });
      }).catch(done);
    });

    it('should emit an error on request bad response', function (done) {
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

    it('should emit an error on request failure', function (done) {
      createWebDAVClient().then(function (client) {
        client.request('GET', 'file.txt', function (error) {
          expect(error.message).to.match(/^Nock: No match for request/);

          return done();
        });
      }).catch(done);
    });

  });

  after('enable unmocked HTTP requests', function () {
    nock.enableNetConnect();
  });

});

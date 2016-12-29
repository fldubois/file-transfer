# file-transfer

> Multiprotocol file transfer

## Supported protocols

* SFTP
* FTP
* WebDAV

## Usage

```js
var transfer = require('file-transfer');

transfer.connect('sftp', {
  host:     'sftp.example.com',
  username: 'foo',
  password: 'bar'
}).then(function (client) {
  // Work with client

  client.disconnect();
});
```

#### Automatic disconnection

To ensure the client connection is closed after the work is done, you can use the `disposer()` function.
It take the same paramerters as `connect()` and returns a [`Bluebird's disposer`](http://bluebirdjs.com/docs/api/disposer.html) that will close the connection when the returning `Promise` is resolved.

```js
var transfer = require('file-transfer');

var Promise = require('bluebird');

var disposer = transfer.disposer({
  protocol: 'sftp',
  host:     'sftp.example.com',
  username: 'foo',
  password: 'bar'
});

Promise.using(disposer, function (client) {
  // Work with client
}).then(function () {
  // The connection is closed
});
```

## Documentation

### Client initialization

This module expose two functions to initialize a connection.

#### connect

> Open the connection to the remote server.

###### Usage

```js
transfer.connect([protocol], options) -> Promise
```

###### Parameters

| Parameter    | Type(s)  | Required | Default | Description                                                                      |
| ------------ | -------- | -------- | --------| -------------------------------------------------------------------------------- |
| `protocol`   | `string` | No       |         | Protocol name (`sftp`, `ftp` or `webdav`)                                        |
| `options`    | `object` | **Yes**  |         | Connection parameters (see [Client constructor options](docs/client.md#options)) |

The `protocol` can be passed as the first parameter, or as an `options` property.

#### disposer

> Open the connection to the remote server and return a disposer to automatically close the connection (see [`Bluebird's disposer documentation`](http://bluebirdjs.com/docs/api/disposer.html)).

###### Usage

```js
transfer.disposer([protocol], options) -> disposer
```

`disposer()` use the same parameters as `connect()`.

---

### Client API

* [Client API reference](docs/client.md)
* [Protocols' specific options and additional methods](docs/protocols.md)

## License

See [License](LICENSE)

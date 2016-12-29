## Client API

* [Client constructor](#client-constructor)
* [connect](#connect)
* [isConnected](#isconnected)
* [checkConnection](#checkconnection)
* [disconnect](#disconnect)
* [supportsStreams](#supportsstreams)
* [createReadStream](#createreadstream)
* [createWriteStream](#createwritestream)
* [get](#get)
* [put](#put)
* [unlink](#unlink)
* [readdir](#readdir)
* [mkdir](#mkdir)
* [rmdir](#rmdir)

---

### Client constructor

##### Usage

```js
new Client(options) -> Client
```

##### Parameters

| Parameter | Type(s)  | Required | Default | Description          |
| --------- | -------- | -------- | --------| -------------------- |
| `options` | `object` | **Yes**  |         | Connection paramters |

###### Options

| Option              | Type(s)  | Required | Description                                           |
| ------------------- | -------- | -------- | ----------------------------------------------------  |
| `host`              | `string` | **Yes**  | Remote host.                                          |
| `port`              | `number` | No       | Remote port (protocol default port if not specified). |
| `user` / `username` | `string` | **Yes**  | User name                                             |
| `pass` / `password` | `string` | **Yes**  | User password                                         |

For protocols' specific options, see [protocols documentation](protocols.md).

[▲ Back to top](#client-api)

---

### connect

> Open the connection to the remote server.

##### Usage

```js
client.connect() -> Promise
```

[▲ Back to top](#client-api)

---

### isConnected

> Returns true if the connection is open, false otherwise.

##### Usage

```js
client.isConnected() -> boolean
```

[▲ Back to top](#client-api)

---

### checkConnection

> Returns a `Promise` fullfiled if the connection is open, rejected otherwise.

##### Usage

```js
client.checkConnection() -> Promise
```

[▲ Back to top](#client-api)

---

### disconnect

> Close the client connection.

##### Usage

```js
client.disconnect() -> null
```

[▲ Back to top](#client-api)

---

### supportsStreams

> Returns true if the client supports stream related methods (`createReadStream` and `createWriteStream`), false otherwise.

##### Usage

```js
client.supportsStreams() -> boolean
```

[▲ Back to top](#client-api)

---

### createReadStream

> Create a Readable stream on the remote file.

##### Usage

```js
client.createReadStream(path, options) -> Readable
```

##### Parameters

| Parameter | Type(s)  | Required | Default | Description                               |
| --------- | -------- | -------- | --------| ----------------------------------------- |
| `path`    | `string` | **Yes**  |         | File path                                 |
| `options` | `object` | No       | `{}`    | [Protocol specific options](protocols.md) |

[▲ Back to top](#client-api)

---

### createWriteStream

> Create a Writable stream on the remote file.

##### Usage

```js
client.createWriteStream(path, options) -> Writable
```

##### Parameters

| Parameter | Type(s)  | Required | Default | Description                               |
| --------- | -------- | -------- | --------| ----------------------------------------- |
| `path`    | `string` | **Yes**  |         | File path                                 |
| `options` | `object` | No       | `{}`    | [Protocol specific options](protocols.md) |

[▲ Back to top](#client-api)

---

### get

> Download the remote file.

##### Usage

```js
client.get(remote, local) -> Promise
```

##### Parameters

| Parameter | Type(s)  | Required | Default | Description      |
| --------- | -------- | -------- | --------| ---------------- |
| `remote`  | `string` | **Yes**  |         | Remote file path |
| `local`   | `string` | **Yes**  |         | Local file path  |

[▲ Back to top](#client-api)

---

### put

> Upload the local file.

##### Usage

```js
client.put(local, remote, options) -> Promise
```

##### Parameters

| Parameter | Type(s)  | Required | Default | Description                               |
| --------- | -------- | -------- | --------| ----------------------------------------- |
| `local`   | `string` | **Yes**  |         | Local file path                           |
| `remote`  | `string` | **Yes**  |         | Remote file path                          |
| `options` | `object` | No       | `{}`    | [Protocol specific options](protocols.md) |

[▲ Back to top](#client-api)

---

### unlink

> Delete a file.

##### Usage

```js
client.unlink(path) -> Promise
```

##### Parameters

| Parameter | Type(s)  | Required | Default | Description |
| --------- | -------- | -------- | --------| ----------- |
| `path`    | `string` | **Yes**  |         | File path   |

[▲ Back to top](#client-api)

---

### readdir

> List the files of a directory.

##### Usage

```js
client.readdir(path) -> Promise
```

##### Parameters

| Parameter | Type(s)  | Required | Default | Description    |
| --------- | -------- | -------- | --------| -------------- |
| `path`    | `string` | **Yes**  |         | Directory path |

##### Return value

An `Array` containing the filenames

[▲ Back to top](#client-api)

---

### mkdir

> Create a directory on the remote server.

##### Usage

```js
client.mkdir(path, options) -> Promise
```

##### Parameters

| Parameter | Type(s)  | Required | Default | Description                               |
| --------- | -------- | -------- | --------| ----------------------------------------- |
| `path`    | `string` | **Yes**  |         | Directory path                            |
| `options` | `object` | No       | `{}`    | [Protocol specific options](protocols.md) |

[▲ Back to top](#client-api)

---

### rmdir

> Delete a directory.

##### Usage

```js
client.rmdir(path) -> Promise
```

##### Parameters

| Parameter | Type(s)  | Required | Default | Description    |
| --------- | -------- | -------- | --------| -------------- |
| `path`    | `string` | **Yes**  |         | Directory path |

[▲ Back to top](#client-api)

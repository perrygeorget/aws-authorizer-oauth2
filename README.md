# aws-authorizer-oauth2
This is an AWS Authorizer for OAuth2.  It uses DynamoDB as a scalable cloud backend and leverages an existing OAuth2 Server library.

## Getting Started

### Requirements

* AWS Account
* Node JS 8.11.x
* yarn

### Quick Start

```bash
yarn
yarn dynamodb:install
yarn start
```

After it has started, execute in another shell:

```bash
yarn migrate
```

Now you have a clean, running OAuth2 server and client example.

## Documentation

### Setup

```bash
yarn
yarn dynamodb:install
```

### Deploy

```bash
yarn deploy
```

### Running Locally

#### Against DynamoDB Local

```bash
yarn start
```

Then in another process

```bash
yarn dynamodb:migrate
```

#### Against AWS Hosted DynamoDB

```bash
yarn start:remotedb
```

### CLI Tools

A number of CLI tools exist for you to setup data for testing or development.
These include scripts to:

* manage credentials, `yarn credential`
* manage clients, `yarn client`
* execute sample authorization code flows, `yarn authorize`

#### Managing Credentials

#### Via Lambda

Every event has an `action` and `params`.

| Attribute | Description | Default |
| --------- | ----------- | ------- | ------- |
| action    | Action to be performed | _undefined_ |
| params    | Parameters for the action to be performed | _undefined_ |

Response:

| Attribute | Description |
| --------- | ----------- |
| status | Either "ok" for success or "error" for error |
| response | Object returned with a "ok" status |
| error | Object returned with a "error" status |
| error.message | What went wrong |

##### get

`event.params`:

| Attribute | Description | Default | Example |
| --------- | ----------- | ------- | ------- |
| username | The username for the credential | _undefined_ | "homer" |

`response`:

TODO

##### getById

`event.params`:

| Attribute | Description | Default | Example |
| --------- | ----------- | ------- | ------- |
| id | The id for the credential | _undefined_ | "00000000-0000-0000-0000-000000000000" |

`response`:

TODO

##### put

`event.params`:

| Attribute | Description | Default | Example |
| --------- | ----------- | ------- | ------- |
| id | The id of the user | _undefined_ | "00000000-0000-0000-0000-000000000000" |
| username | The username for the credential | _undefined_ | "homer" |
| password | The password for the credential | _undefined_ | "beer.n.donuts.4ever" |

`response`:

TODO

##### delete

`event.params`:

| Attribute | Description | Default | Example |
| --------- | ----------- | ------- | ------- |
| username | The username for the credential | _undefined_ | "homer" |

`response`:

TODO

##### list

`event.param`:

n/a

`response`:

TODO

#### Via Command Line

You can run CUDL (create, update, delete, list) operations against the credentials table locally and remotely.

```bash
yarn credential --help
``` 

```text
Usage: credential [options] [command]
Options:
  -V, --version                 output the version number
  -s, --stage [value]           Stage of the service (default: dev)
  -r, --region [value]          AWS regin (default: us-west-2)
  -d, --debug                   Show debug information
  -l, --local                   Executes against local resources
  -h, --help                    output usage information
Commands:
  create <username> <password>  Add new credentials
  update <username> <password>  Update existing credentials
  delete <username>             Remove existing credentials
  list                          List all credentials
  env                           Dump environment variables
```

#### Managing Clients

#### Via Lambda

Every event has an `action` and `params`.

| Attribute | Description | Default |
| --------- | ----------- | ------- | ------- |
| action    | Action to be performed | _undefined_ |
| params    | Parameters for the action to be performed | _undefined_ |

Response:

| Attribute | Description |
| --------- | ----------- |
| status | Either "ok" for success or "error" for error |
| response | Object returned with a "ok" status |
| error | Object returned with a "error" status |
| error.message | What went wrong |

##### get

`event.params`:

| Attribute | Description | Default | Example |
| --------- | ----------- |-------- | ------- |
| client_id | The id for the client | _undefined_ | "00000000-0000-0000-0000-000000000000" |

`response`:

TODO

##### put

`event.params`:

| Attribute | Description | Default | Example |
| --------- | ----------- | ------- | ------- |
| client_id | The id for the client | <uuid> | "00000000-0000-0000-0000-000000000000" |
| client_secret | The secret for the client | <string> | "000000000000000000000000000000000000000" |
| user_id | The id of the user | _undefined_ | "00000000-0000-0000-0000-000000000000" |
| description | The description for the client | _undefined_ | "lorem ipsum" |
| grants | An array of grants to be allowed by this client | _undefined_ | \["password", "client_credentials", "authorization_code", "refresh_token"\] |
| redirect_uris | An array of grants to be allowed by this client | _undefined_ | \["http://www.example.com/cb", "https://www.example.com/cb"\] |

`response`:

TODO

##### delete

`event.params`:

| Attribute | Description | Default | Example |
| --------- | ----------- | ------- | ------- |
| client_id | The id for the client | _undefined_ |"00000000-0000-0000-0000-000000000000" |

`response`:

TODO

##### listForUser

`event.params`:

| Attribute | Description | Default | Example |
| --------- | ----------- | ------- | ------- |
| user_id | The id of the user | _undefined_ |"00000000-0000-0000-0000-000000000000" |

`response`:

TODO

##### list

`event.param`:

n/a

`response`:

TODO

#### Via Command Line

You can run CUDL (create, update, delete, list) operations against the clients table locally and remotely.

```bash
yarn client --help
``` 

```text
Usage: client [options] [command]
Options:
  -V, --version                                       output the version number
  -s, --stage [value]                                 Stage of the service (defaul
 dev)
  -r, --region [value]                                AWS regin (default: us-west-

  -d, --debug                                         Show debug information
  -l, --local                                         Executes against local resources
  -h, --help                                          output usage information
Commands:
  create [options] <username> [description]           Add a new client
  update [options] <client> <username> [description]  Update an existing client
  delete <client>                                     Remove an existing client
  list                                                List all clients
  env                                                 Dump environment variables
```

#### Execute Sample Authorization Code Flows

You can execute authorization flows via the command line againt a locally running instance or a cloud instance.

```bash
yarn authorize --help
``` 

```text
Usage: authorize [options] [command]
Options:
  -V, --version                                        output the version number
  -s, --stage [value]                                  Stage of the service (default: dev)
  -r, --region [value]                                 AWS regin (default: us-west-2)
  -d, --debug                                          Show debug information
  -l, --local                                          Executes against local resources
  -h, --help                                           output usage information
Commands:
  code [options] <client_id>                           Generates and authorization code using client_id and state (recommended) with optional redirect URI and scope
  password [options] <client_id>                       Authorize using username and password
  client_credentials [options] <client_id>             Authorize using client credentials
  refresh_token [options] <client_id> <refresh_token>  Authorize using a refresh token, client_id, and secret
  env                                                  Dump environment variables
```

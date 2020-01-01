# aws-authorizer-oauth2
This is an AWS Authorizer for OAuth2.  It uses DynamoDB as a scalable cloud backend and leverages an existing OAuth2 Server library.

## Getting Started

### Requirements

* AWS Account
* Node JS 12.x
* yarn

### Quick Start

```bash
yarn
yarn dynamodb:install
yarn start
```

After it has started, execute in another shell:

```bash
yarn dynamodb:migrate
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

Setup the performance test using the password "jmeter" for the credentials.
(JMeter is configured with that password as a default.)

```bash
yarn credential -l create jmeter
client -d -l create -C -R -A 'http://localhost:3000/callback' -P jmeter 'My test client'
```

Get the client_id and client_secret

```bash
yarn client -l list
```

Now run the test using the client_id and secret that you obtained.

```bash
yarn jmeter:run -Jclient_id=<client_id> -Jclient_secret=<client_secret>
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

You can run CUDL (create, update, delete, list) operations against the credentials table locally and remotely.

```bash
yarn credential --help
``` 

```text
Usage: credential [options] [command]

Options:

  -V, --version         output the version number
  -s, --stage [value]   Stage of the service (default: dev)
  -r, --region [value]  AWS regin (default: us-west-2)
  -d, --debug           Show debug information
  -l, --local           Executes against local resources
  -h, --help            output usage information

Commands:

  create <username>     Add new credentials
  update <username>     Update existing credentials
  delete <username>     Remove existing credentials
  list                  List all credentials
  env                   Dump environment variables
```

#### Managing Clients

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

### JMeter performance test execution

#### Local Setup and Execution

Setup the performance test using the password "jmeter" for the credentials.
(JMeter is configured with that password as a default.)

```bash
yarn credential -l create jmeter
client -l create -C -R -A 'http://localhost:3000/callback' -P jmeter 'My test client'
```

Get the client_id and client_secret.

```bash
yarn client -l list
```

Now run the test using the `client_id` and `client_secret` that you obtained.

```bash
yarn jmeter:run -Jclient_id=<client_id> -Jclient_secret=<client_secret>
``` 

# Remote Setup and Execution

Using the callback URL that you obtained for your deployment,
setup the performance test using the password "jmeter" for the credentials.
(JMeter is configured with that password as a default.)

```bash
yarn credential create jmeter
client create -C -R -A 'https://<prefix>.execute-api.<region>.amazonaws.com/<stage>>/callback' -P jmeter 'My test client'
```

NOTE: The above URL will vary, and the above URL contains placeholders for what will vary.
Those placeholders will be referred to below. 

Get the client_id and client_secret.

```bash
yarn client list
```

Now run the test using the `client_id` and `client_secret` that you obtained.

```bash
yarn jmeter:run -Jclient_id=<client_id> -Jclient_secret=<client_secret> \
    -Jendpoint_protocol=https -Jendpoint_host=<prefix>.execute-api.<region>.amazonaws.com \
    -Jendpoint_port=443 -Jendpoint_path=/<stage>
``` 

### Lambda Functions

You can manage credentials and clients stored on AWS in DynamoDB programmatically via lambda function calls.
In your applications you would only need to store the `user_id` as a reference to the credentials.
You would store the user profile with `user_id` as foreign key.
You can  

#### Managing Credentials

Every event has an `action` and `params`.

| Attribute | Description | Default |
| --------- | ----------- | ------- |
| action    | Action to be performed | _undefined_ |
| params    | Parameters for the action to be performed | _undefined_ |

Response:

| Attribute | Description |
| --------- | ----------- |
| status | Either "ok" for success or "error" for error |
| response | Object returned with a "ok" status |
| error | Object returned with a "error" status |
| error.message | What went wrong |

##### authenticate

`event.params`:

| Attribute | Description | Default | Example |
| --------- | ----------- | ------- | ------- |
| username | The username for the credential | _undefined_ | "homer" |
| password | The username for the credential | _undefined_ | "dough.nuts" |

`response`:

A boolean value of `true` if authenticated by username and password, `false` otherwise.

##### get

`event.params`:

| Attribute | Description | Default | Example |
| --------- | ----------- | ------- | ------- |
| username | The username for the credential | _undefined_ | "homer" |

`response`:

An object representing the found unique credential with attributes:

| Attribute | Description |
| --------- | ----------- |
| id | The id for the credential |
| username | The username for the credential |

##### getById

`event.params`:

| Attribute | Description | Default | Example |
| --------- | ----------- | ------- | ------- |
| id | The id for the credential | _undefined_ | "00000000-0000-0000-0000-000000000000" |

`response`:

An object representing the found unique credential with attributes:

| Attribute | Description |
| --------- | ----------- |
| id | The id for the credential |
| username | The username for the credential |

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

_None_

`response`:

An array of objects representing credentials with attributes:

| Attribute | Description |
| --------- | ----------- |
| id | The id for the credential |
| username | The username for the credential |

#### Managing Clients

Every event has an `action` and `params`.

| Attribute | Description | Default |
| --------- | ----------- | ------- |
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
| client_id | The id for the client | \<uuid\> | "00000000-0000-0000-0000-000000000000" |
| client_secret | The secret for the client | \<string\> | "000000000000000000000000000000000000000" |
| user_id | The id of the user | _undefined_ | "00000000-0000-0000-0000-000000000000" |
| description | The description for the client | _undefined_ | "lorem ipsum" |
| grants | An array of grants to be allowed by this client | _undefined_ | \[ "password", "client_credentials", "authorization_code", "refresh_token" \] |
| redirect_uris | An array of grants to be allowed by this client | _undefined_ | \[ "http://www.example.com/cb", "https://www.example.com/cb" \] |

`response`:

TODO

##### delete

`event.params`:

| Attribute | Description | Default | Example |
| --------- | ----------- | ------- | ------- |
| client_id | The id for the client | _undefined_ | "00000000-0000-0000-0000-000000000000" |

`response`:

TODO

##### listForUser

`event.params`:

| Attribute | Description | Default | Example |
| --------- | ----------- | ------- | ------- |
| user_id | The id of the user | _undefined_ | "00000000-0000-0000-0000-000000000000" |

`response`:

TODO

##### list

`event.param`:

_None_

`response`:

TODO

## CloudFormation Stack

Some information is exported to allow for extension of this oauth2 and authentication implementaiton.

### Exports

| Name | Description | Example |
| ---- | ----------- | ------- |
| CredentialsTableName-{stage} | Name of the DynamoDB credentials table | CredentialsTableName-dev | 
| CredentialsLambdaFunctionName-{stage} | Name of the credentials lambda function | CredentialsLambdaFunctionName-dev | 
| ClientsLambdaFunctionName-{stage} | Name of the oauth2 clients lambda function | ClientsLambdaFunctionName-dev | 
| OAuth2ServiceInternalEndpoint-{stage} | The endpoint to use internally | OAuth2ServiceInternalEndpoint-dev | 

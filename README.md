# Modern MERN backend for SaaS 🚀

Modern MERN backend code for the REST Api. The code comes up with a Todo application with CRUD operation: create, read, update and delete a Todo. So, it makes easier to understand the backend architecture and you can adapt easily to your needs. You can also accept payment right away with the provided Stripe Integration. You have access to the all code source if you need more customization or need to go further.

### Requirements

- Node.js 18+ (Node.js 20 recommended) and npm

### Getting started

Run the following command on your local environment after cloning the project:

```sh
cd my-project-name-backend
npm install
code . # Open VSCode with command line or open it manually. Please make sure that the file `package.json` is at the root of the project in VSCode. `package.json` should NOT be in a subfolder.
```

Then, you can run locally in development mode with live reload:

```
npm run dev
```

Open http://localhost:4000 with your favorite browser to see your project. You should get a `{"errors":"not_found"}`. It's genius error because the `index` isn't defined and it's normal.

If you want to test the backend without the front, you can use `Postman` but what I suggest instead is to use `humao.rest-client` VSCode extension. It helps to run HTTP request in your VSCode.

Located at `tests/api.http`, it's a file where you can run requests directly in `humao.rest-client`. All supported requests are provided. So, you can test all the request directly in your VSCode.

### File structure, most important folder

```sh
.
├── README.md                               # README file
├── __mocks__                               # Jest mocks folder for mocking imports
├── aws-resources                           # Additional AWS resources used by serverless.yml
├── serverless.yml                          # Serverless configuration file
├── src
│   ├── app.ts                              # Express.js initialization
│   ├── controllers                         # Controller folder
│   │   └── index.ts
│   ├── emails                              # Email templates folder
│   ├── error                               # Error management folder
│   │   ├── ApiError.ts
│   │   ├── ErrorCode.ts
│   │   └── RequestError.ts                 # Express Handler for error
│   ├── handler.ts                          # AWS Lambda entrypoint
│   ├── middlewares                         # Express middleware
│   │   └── Validation.ts
│   ├── models                              # Database models
│   │   ├── AbstractModel.ts                # All database models are extended from AbstractModel
│   ├── routes                              # Express.s routes
│   ├── services                            # Services folder
│   │   └── index.ts
│   ├── types                               # Types for TypeScript
│   ├── utils                               # Utilities
│   └── validations                         # Incoming request validator with Zod
└── tests                                    # Test folder
    └── integration                         # Integration tests
```

### Customization

You can easily configure Modern MERN by making a search in the whole project with `FIXME:` for making quick customization.

You have access to the whole code source if you need further customization. The provided code is only example for you to start your SaaS products. The sky is the limit 🚀.

For your information, you don't need to customize the service name in `serverless.yml` file for one project. But, when you have multiple projects, it'll have name collision. So, you need to update the service name in `serverless.yml` file by choosing a new name instead `modernmern`. And, don't forget to update `sst.json` file in Modern MERN Infra repository.

### Deploy to production

If you deploy for the first time, please checkout [this guide](https://github.com/Nextlessjs/Modern-MERN-Quick-Start/blob/main/PRODUCTION_DEPLOYMENT.md).

You can deploy to production with the following command:

```
npm run deploy-prod
```

It's exactly the same command `npm run deploy-prod` when you want to update the backend after making changes: whether it's a code or configuration change.

(optional) You can try Seed.run for an automatic backend deployment integrated to your GitHub workflow.

### SES local server

In local/development environment, the SES service is simulated. So, you can work offline without internet connection. You can visualize the email by opening a browser at http://localhost:8005.

> :warning: When your browser have a tab opened at http://localhost:8005, you need to close the tab before stopping the backend server.

### Install dynamodb-admin (optional)

For better developer experience, you can install `dynamodb-admin`:

```
npm install -g dynamodb-admin
```

Then, you can run:

```
dynamodb-admin
```

Open http://localhost:8001 with your favorite browser and you can visually browse your data stored in your local DynamoDB.

### Testing

All unit tests are located close to the source code in the same folder. For example, a file located at `src/service/` with the name `RandomService.ts` will have a unit test file located at `src/service/RandomService.test.ts`.

The backend also includes integration tests for testing all backend layers including the database. They are located at `tests/integration/`.

### VSCode information (optional)

If you are VSCode users, you can have a better integration with VSCode by installing the suggested extension in `.vscode/extension.json`. The starter code comes up with Settings for a seamless integration with VSCode. The Debug configuration is also provided for frontend and backend debugging experience.

Pro tips: if you need a project wide type checking with TypeScript, you can run a build with <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd> on Mac.

The debug configuration is also provided for VSCode. 1 debug configurations is provided:

| Name | Description |
| --- | ----------- |
| `Severless debug` | Launch Serverless in debug mode |

### Going further with third party tool (optional)

- Add Seed.run for automatic deployment integrated to your GitHub workflow.

For you information, Seed.run doesn't load `.env` files. You need to indicate the environment variable manually in Seed.run user interface, here how to do it: https://seed.run/docs/storing-secrets.html

- Add a better serverless monitoring and debugging tool like Lumigo. Or, any equivalent Dashbird, Epsagon, Tundra.
- Using Sentry isn't recommended for backend, there are a lot of overhead (written on Tuesday 31th August 2021).

### Contributions

Everyone is welcome to contribute to this project. Feel free to open an issue if you have question or found a bug.

---

Made with ♥ by [CreativeDesignsGuru](https://creativedesignsguru.com) [![Twitter](https://img.shields.io/twitter/url/https/twitter.com/cloudposse.svg?style=social&label=Follow%20%40Ixartz)](https://twitter.com/ixartz)

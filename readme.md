# BeaveCMS
Operations handling

- Global CMS or all brands
- APIs for all brands

## Stack
- [node.js] - evented I/O for the backend
- [Express] - fast node.js network app framework [@tjholowaychuk]
- [MongoDB] - Database
- [Redis] - Caching DB

## Installation
To install BeaveCMS, follow these steps:

- Open your terminal or command prompt.
- Run the following command to install BeaveCMS:

```
npx create-beave-app my-app
```
Replace my-app with the desired name of your project folder.
This will prompt you with a few questions regarding your project configurations. You can change these values later on.

1. `Installation Type` :
   You will be asked to choose an installation type:

   | Options | Description                                                                                                                               |
   | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
   | 1       | Quick Installation: This will create an auto-generated .env file on your project root with default configuration parameters.              |
   | 2       | Manual Installation: You can configure the database connection and other values from the CLI terminal. You can change these values later. |

If you choose Manual Installation, the terminal will ask you the following questions:

2. `Docker` :
   By default, the value will be false. If you want the Beave app in a Docker container, you can turn it to true.
3. `Environment` :
   You will be asked to choose the environment:

   |     | Description                             |
   | --- | --------------------------------------- |
   | 1   | Development: Only for local development |
   | 2   | Staging: For Staging application        |
   | 3   | Production: For live application        |

4. `PORT` :
   By default, the port value will be 1380. You can change it if you want.

5. `Organisation name`: Default value will be `beave-cms`.
6. `Paste your Mongodb Connection URL`: Insert your mongodb connection URL. By default the value will be `mongodb://localhost:27017`. We recommend [MongoDB Atlas Connection](https://account.mongodb.com/account/login).
7. `Your Database Name` : Mongodb collection name.
8. `Redis URL` : Your redis connection URL. By Default value will be `redis://localhost:6379`.

If you choose the `docker` value `true`, the installation will take bit higher than the normal installation.

### Starting the Application
To start the BeaveCMS application, follow these steps:

- You are now ready to start the Beave app. Run the following commands to start:
- Make sure you are in the root directory of your BeaveCMS project.

Run the following command to start the application:
```
cd my-app && npm start
```

To check the health of the application, navigate to:

```sh
127.0.0.1:1380/health
```

To Access the admin panel:

```sh
127.0.0.1:1380/admin
```

If you are accessing this page for the first time, it will redirect you to sign up, and you can create a super admin account.

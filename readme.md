# LANDMARK LEISURE - CMS
Operations handling

- Global CMS or all brands
- APIs for all brands

## Stack
- [node.js] - evented I/O for the backend
- [Express] - fast node.js network app framework [@tjholowaychuk]
- [MongoDB] - Database
- [Redis] - Caching DB

## Installation (Docker)

Pull the code from repo.
Setup the Redis DB on your Host machine / Docker 
Create `.env` file on projetc root.
```sh
NODE_ENV=development
PORT=8080
APP_KEY=testkey

FRONTEND_URL=http://localhost:3000
# Local DB
DB_CONNECTION=mongodb+srv://<username>:<password>@cluster0.aukq2.mongodb.net/?retryWrites=true&w=majority
DB_NAME=landmark-leisure

# SLACK
SLACK_ADMIN_CHANNEL=

# IMAGEKIT
IMAGEKIT_PUBLIC_KEY=public_
IMAGEKIT_PRIVATE_KEY=private_
IMAGEKIT_URL=

# Mailgun
MAILGUN_DOMAIN=
MAILGUN_API_KEY=
MAILGUN_FROM=
MAILGUN_OTP_TEMPLATE=
MAILGUN_FORGOT_PASSWORD_TEMPLATE=
MAILGUN_FORGOT_PASSWORD_THANKYOU_TEMPLATE=
MAILGUN_ORDER_COMPLETE_TEMPLATE=
MAILGUN_WELCOME_TEMPLATE=

# SMS -Aptiva
APTIVA_SENDER_ID=
APTIVA_USRNAME=
APTIVA_PASSWORD=

# GA Tracking API
CLIENT_EMAIL="google-analytics-nodejs-test@experiment-d4168.iam.gserviceaccount.com"
GA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----"

# PAYFORT
PAYFORT_URL=https://sbcheckout.PayFort.com
PAYFORT_API_URL=https://sbpaymentservices.payfort.com
MERCHANT_IDENTIFIER=
ACCESS_CODE=
SHA_REQUEST_PARSE=
SHA_RESPONSE_PARSE=
SHA_TYPE=

#Cache
CACHE_LOCAL_DATA=true
CACHE_SEMNOX_DATA=true
WEB_USER_TOKEN_EXPIRY=24h
MOBILE_USER_TOKEN_EXPIRY=24h
CART_EXPIRY=600

REDIS_URL=redis://host.docker.internal:6379
```
Once done, run the Docker image and map the port to whatever you wish on
your host. In this project, we simply map port `8400` of the host to
port `8080` of the Docker (or whatever port was exposed in the Dockerfile and docker-compose.yml):

```sh
cd <PROJECT_ROOT>
docker compose up --build
```

Package Installation
```sh
docker exec -it landmark-leisure-cms npm i
```

Run Seeder
```sh
docker exec -it landmark-leisure-cms node seeder
```

Verify the project setup by navigating to your server address in
your preferred browser.

```sh
127.0.0.1:8400/health
```

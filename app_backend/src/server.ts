import app from './app';
// import {uri} from "./Utils/dbConnection";
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import Authentication from './Repository/Authentication';
import UserRepository from './Repository/UserRepository';
import ArticleTypeRepository from './Repository/ArticleTypeRepository';
import ArticleRepository from './Repository/ArticleRepository';
import GlossaryRepository from './Repository/GlossaryRepository';
//
dotenv.config();
const port = process.env.NODE_ENV === 'docker' ? 8001 : 8000;
//
const mongoHost = process.env.NODE_ENV === 'docker' ? 'mongo' : process.env.MONGO_HOST;
const mongoPort = process.env.NODE_ENV === 'docker' ? 27018 : process.env.MONGO_PORT;
const dbName =
  process.env.ENV === 'production'
    ? process.env.MONGO_DB
    : process.env.MONGO_TEST_DB;
const uri = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${mongoHost}:${mongoPort}/${dbName}?authSource=admin`;
console.log(process.env.NODE_ENV);
console.log(uri);
// @ts-ignore
MongoClient.connect(uri, {
  wtimeoutMS: 2500,
  useNewUrlParser: true
})
  .catch((err) => {
    console.error(err.stack);
    process.exit(1);
  })
  .then(async (client) => {
    // console.log(client);
    await UserRepository.injectDB(client);
    await Authentication.injectDB(client);
    await ArticleTypeRepository.injectDB(client);
    await ArticleRepository.injectDB(client);
    await GlossaryRepository.injectDB(client);
    app.listen(port, () => {
      console.log(process.env.NODE_ENV);
      console.log(uri);
      console.log(`listening on port ${port}`);
    });
  });

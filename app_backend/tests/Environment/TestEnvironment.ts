// const MongoClient = require('mongodb').MongoClient;
import { MongoClient } from 'mongodb';
import { uri, connectionOptions } from '../../src/Utils/dbConnection';
import Authentication from '../../src/Repository/Authentication';
import ArticleRepository from '../../src/Repository/ArticleRepository';
import UserRepository from '../../src/Repository/UserRepository';
const NodeEnvironment = require('jest-environment-node');
module.exports = class MongoEnvironment extends NodeEnvironment {
  async setup () {
    console.log('Preparing tests');
    this.global.connection = await MongoClient.connect(uri, connectionOptions);
    this.global.articlesCollection = await this.global.connection.db('tests').collection('articles');
    this.global.usersCollection = await this.global.connection.db('tests').collection('users');
    this.global.articlesTypesCollection = await this.global.connection.db('tests').collection('articleTypes');
    await Authentication.injectDB(this.global.connection);
    await ArticleRepository.injectDB(this.global.connection);
    await UserRepository.injectDB(this.global.connection);
    const authRepo = new Authentication();
    const firstUser = await this.global.usersCollection.findOne({});
    const adminUser = await this.global.usersCollection.findOne({ roles: ['ROLE_ADMIN'] });
    this.global.firstUserLogIn = await authRepo.login(firstUser!.email, firstUser!.firstName);
    this.global.adminLogIn = await authRepo.login(adminUser!.email, adminUser!.firstName);
    await super.setup();
  }

  async teardown () {
    await this.global.connection.close();
    await super.teardown();
  }

  getVmContext () {
    return super.getVmContext();
  }
};

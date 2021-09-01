import app from '../../src/app';
// @ts-ignore
import request from 'supertest';
import { Collection, MongoClient } from 'mongodb';
import { connectionOptions, uri } from '../../src/Utils/dbConnection';
import UserRepository from '../../src/Repository/UserRepository';
// import Authentication from '../../src/Repository/Authentication';
import TestHelpersClass from '../utils/TestHelpersClass';
import { initialUsersSet } from '../utils/usersExampleData';
let connection: void | MongoClient;
let usersCollection: Collection;
beforeAll(async () => {
  // connection
  connection = await MongoClient.connect(uri, connectionOptions);

  // injection db
  await UserRepository.injectDB(connection);
  // await Authentication.injectDB(connection);
  // collections
  usersCollection = await connection.db('tests').collection('users');

  // checking users collection amd seed data if necessary
  await TestHelpersClass.checkAndPrepareUsersCollection(usersCollection, initialUsersSet);

  // // logIn users with different roles
  // firstUserLogIn = await TestHelpersClass.getFirstUserAndLogin(usersCollection);
  // adminLogin = await TestHelpersClass.getFirstAdminAndLogin(usersCollection);
  // superAdminLogin = await TestHelpersClass.getFirstSuperAdminAndLogin(usersCollection);
  //
  // // documents count
  // totalDocumentsInCollection = await TestHelpersClass.getNumberOfDocumentsInCollection(usersCollection);
  // totalEnabledDocumentsInCollection = await TestHelpersClass.getNumberOfEnabledDocumentsInCollection(usersCollection);
  //
  // // objects to compare
  // firstDocument = await TestHelpersClass.getFirstDocument(usersCollection);
  // secondDocument = await TestHelpersClass.getSomeDocument(usersCollection, 1);
}, 10000);
// const app = require('../../src/app');

describe('GET /user/', () => {
  it('responds with json', async () => {
    await request(app)
      .get('/users?perPage=14&page=1')
      .set('Accept', 'application/json')
      .set('Application-Language', 'pl')
      .expect('Content-Type', /json/)
      .expect(200);
    // expect(result.status).toEqual(200);
    // console.log(JSON.parse(result.text));
    // expect(result.text.);
  }, 150000000);
});

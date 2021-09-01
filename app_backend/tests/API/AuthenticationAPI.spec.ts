import { Collection, MongoClient } from 'mongodb';
import { connectionOptions, uri } from '../../src/Utils/dbConnection';
import Authentication from '../../src/Repository/Authentication';
import TestHelpersClass from '../utils/TestHelpersClass';
import { initialUsersSet, userForTests } from '../utils/usersExampleData';
// @ts-ignore
import request from 'supertest';
import app from '../../src/app';

let connection: void | MongoClient;
let usersCollection: Collection;
beforeAll(async () => {
  connection = await MongoClient.connect(uri, connectionOptions);
  await Authentication.injectDB(connection);
  usersCollection = await connection.db('tests').collection('users');
  await TestHelpersClass.checkAndPrepareUsersCollection(usersCollection, initialUsersSet);
}, 5000);
afterAll(async () => {
  console.log('Cleaning after authentication tests');
  await usersCollection.deleteMany({
    $or: [
      { firstName: { $regex: /Edwin/i } },
      { lastName: { $regex: /test/i } },
      { email: { $regex: /test/i } }
    ]
  });
  const firstUser = await usersCollection.findOne({});
  await usersCollection.updateOne({ _id: firstUser!._id }, { $set: { isEnabled: true } });
  if (connection instanceof MongoClient) {
    await connection.close();
  }
});

describe('SignUp', () => {
  describe('Validation missing field errors', () => {
    it('Should 422 error without firstName field', async () => {
      // @ts-ignore
      delete userForTests.body.firstName;
      try {
        const result = await request(app)
          .post('/user/signUp')
          .send({ ...userForTests });
        expect(result.status).toEqual(404);
      } catch (err) {
        // console.log(err);
        expect(err).toBeNull();
      }
    });
    it('Should ', async () => {

    });
  });
});

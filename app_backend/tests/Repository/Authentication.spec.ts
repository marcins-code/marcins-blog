import { Collection, MongoClient, ObjectId } from 'mongodb';
import { connectionOptions, uri } from '../../src/Utils/dbConnection';
import { initialUsersSet, userForTests, wrongFirstNames, wrongLastNames, wrongEmails } from '../utils/usersExampleData';
import Authentication from '../../src/Repository/Authentication';
import { Request } from 'express';
import bcrypt from 'bcrypt';
import Encryption from '../../src/Security/Encryption';
import TestHelpersClass from '../utils/TestHelpersClass';

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
    it('Should be error without firstName field', async () => {
      // @ts-ignore
      delete userForTests.body.firstName;
      const auth = new Authentication();
      try {
        const singUp = await auth.signUp(userForTests as Request);
        expect(singUp).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual('firstName is required');
      }
    });
    it('Should be error without lastName field ', async () => {
      userForTests.body.firstName = 'Edwin';
      // @ts-ignore
      delete userForTests.body.lastName;
      const auth = new Authentication();
      try {
        const singUp = await auth.signUp(userForTests as Request);
        expect(singUp).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual('lastName is required');
      }
    });
    it('Should be error without email field ', async () => {
      userForTests.body.lastName = 'Ogórek';
      // @ts-ignore
      delete userForTests.body.email;
      const auth = new Authentication();
      try {
        const singUp = await auth.signUp(userForTests as Request);
        expect(singUp).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual('email is required');
      }
    });
    it('Should be error without password field ', async () => {
      userForTests.body.email = 'eogorek@test.pl';
      // @ts-ignore
      delete userForTests.body.password;
      const auth = new Authentication();
      try {
        const singUp = await auth.signUp(userForTests as Request);
        expect(singUp).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual('password is required');
      }
    });
  });
  describe('Validation incorrect fields format errors', () => {
    describe('Validation firstName', () => {
      it('Should be error with too short firstName', async () => {
        userForTests.body.password = 'Test1234$';
        userForTests.body.firstName = 'A';
        const auth = new Authentication();
        try {
          const signUp = await auth.signUp(userForTests as Request);
          expect(signUp).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(422);
          expect(err.message).toEqual('firstName too short. firstName must be 2-50 characters');
        }
      });
      it('Should be error with too long firstName', async () => {
        userForTests.body.firstName = 'Edward-JeanLudwikJacekPlacekAntoniAlojzyMarcinGrzegorz';
        const auth = new Authentication();
        try {
          const signUp = await auth.signUp(userForTests as Request);
          expect(signUp).toThrowError();
          console.log(signUp);
        } catch (err) {
          expect(err.code).toEqual(422);
          expect(err.message).toEqual('firstName too long. firstName must be 2-50 characters');
        }
      });
      it('Should be error with incorrect format of firstName', async () => {
        userForTests.body.firstName = 'Edwin';
        const auth = new Authentication();
        for (const wrongFirstName of wrongFirstNames) {
          userForTests.body.firstName = wrongFirstName;
          try {
            const signUp = await auth.signUp(userForTests as Request);
            expect(signUp).toThrowError();
            console.log(signUp);
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual("Invalid firstName format. Valid format eq. 'Ludwik or Jean-Phillipe'");
          }
        }
      });
    });
    describe('Validation lastName', () => {
      it('Should be error with too short lastName', async () => {
        userForTests.body.firstName = 'Edwin';
        userForTests.body.lastName = 'A';
        const auth = new Authentication();
        try {
          const signUp = await auth.signUp(userForTests as Request);
          expect(signUp).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(422);
          expect(err.message).toEqual('lastName too short. lastName must be 2-50 characters');
        }
      });
      it('Should be error with too long lastName', async () => {
        userForTests.body.lastName = 'Brzęczyszczykiewicz-GałęzowskiLudwiniakPełczyńskiZagajewski';
        const auth = new Authentication();
        try {
          const signUp = await auth.signUp(userForTests as Request);
          expect(signUp).toThrowError();
          console.log(signUp);
        } catch (err) {
          expect(err.code).toEqual(422);
          expect(err.message).toEqual('lastName too long. lastName must be 2-50 characters');
        }
      });
      it('Should be error with incorrect format of lastName', async () => {
        userForTests.body.firstName = 'Edwin';
        const auth = new Authentication();
        for (const wrongLastName of wrongLastNames) {
          userForTests.body.lastName = wrongLastName;
          try {
            const signUp = await auth.signUp(userForTests as Request);
            expect(signUp).toThrowError();
            console.log(signUp);
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual("Invalid lastName format. Valid format eq. 'Kowalski or Kowalska-Diuk'");
          }
        }
      });
    });
    describe('Validation email', () => {
      it('Should be error with too long email', async () => {
        userForTests.body.lastName = 'Ogórek';
        userForTests.body.email = 'BrzęczyszczykiewiczGałęzowskiLudwiniakPełczyńskiZagajewskiBrzęczyszczykiewiczGałęzowskiLudwiniakPełczyńskiZagajewskiBrzęczyszczykiewiczGałęzowskiLudwiniakPełczyńskiZagajewskiBrzęczyszczykiewiczGałęzowskiLudwiniakPełczyńskiZagajewskiLudwiniakPełczyńskiZagajewsksiLudwiniakPełczyńskiZagajewski@costam.com';
        const auth = new Authentication();
        try {
          const signUp = await auth.signUp(userForTests as Request);
          expect(signUp).toThrowError();
          console.log(signUp);
        } catch (err) {
          expect(err.code).toEqual(422);
          expect(err.message).toEqual('email too long. email must be max 255 characters');
        }
      });
      it('Should be error with incorrect format of email', async () => {
        const auth = new Authentication();
        for (const wrongEmail of wrongEmails) {
          userForTests.body.email = wrongEmail;
          try {
            const signUp = await auth.signUp(userForTests as Request);
            expect(signUp).toThrowError();
            console.log(signUp);
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual('Invalid email format');
          }
        }
      });
    });
  });
  describe('Validation email uniqueness', () => {
    it('Should not possible to sign up with existing email', async () => {
      const existingUser = await usersCollection.findOne({});
      userForTests.body.email = existingUser!.email;
      const auth = new Authentication();
      try {
        const signUp = await auth.signUp(userForTests as Request);
        expect(signUp).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual('Such email address already exists');
      }
    });
  });
  describe('Validation mongodb response and inserted document data', () => {
    it('Should be proper response with valid data', async () => {
      userForTests.body.email = 'eogorek@test.pl';
      const auth = new Authentication();
      try {
        const signUp = await auth.signUp(userForTests as Request);
        expect(signUp.acknowledged).toEqual(true);
        expect(signUp.insertedId).toBeInstanceOf(ObjectId);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    let lastUserPassword: string;
    it('Should be proper data in inserted document', async () => {
      const lastUser = await usersCollection.findOne({}, { skip: 50 });
      lastUserPassword = lastUser!.password;
      expect(lastUser).toMatchObject(
        expect.objectContaining({
          _id: expect.any(ObjectId),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          firstName: userForTests.body.firstName,
          lastName: userForTests.body.lastName,
          email: userForTests.body.email,
          avatar: userForTests.body.avatar,
          aboutMe: userForTests.body.aboutMe,
          isEnabled: userForTests.body.isEnabled,
          roles: userForTests.body.roles,
          password: expect.any(String)
        })
      );
    });
    it('Should be correct encrypted password in inserted document ', async () => {
      const isValidPassword = await bcrypt.compare(userForTests.body.password, lastUserPassword);
      expect(isValidPassword).toBeTruthy();
    });
  });
});
describe('Login', () => {
  describe('Validation incorrect credentials', () => {
    const auth = new Authentication();
    it('Should be error with invalid email format', async () => {
      try {
        const logIn = await auth.login('someeamil@s', userForTests.body.password);
        expect(logIn).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual('Invalid email format');
      }
    });
    it('Should be error with incorrect email', async () => {
      try {
        const logIn = await auth.login('someeamil@some.pl', userForTests.body.password);
        expect(logIn).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual('Incorrect email');
      }
    });

    it('Should be error with incorrect password', async () => {
      try {
        const logIn = await auth.login(userForTests.body.email, 'somePassword');
        expect(logIn).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual('Incorrect password');
      }
    });
  });
  describe('Login user and validation token and document change', () => {
    let jwtToken: string;
    let lastUserId: string;
    const encryption = new Encryption();
    it('Should be possible to login', async () => {
      const lastUser = await usersCollection.findOne({}, { skip: 50 });
      lastUserId = lastUser!._id.toString();
      const auth = new Authentication();
      try {
        const logIn = await auth.login(userForTests.body.email, userForTests.body.password);
        jwtToken = logIn.jwtToken;
        expect(logIn).toMatchObject(
          expect.objectContaining({
            jwtToken: expect.any(String),
            firstName: userForTests.body.firstName,
            lastName: userForTests.body.lastName,
            _id: lastUser!._id.toString()
          })
        );
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be proper data encrypted in token', async () => {
      const decodedToken = encryption.verifyJwtToken(jwtToken);
      expect(decodedToken!._id).toEqual(lastUserId);
      expect(decodedToken!.roles).toEqual(userForTests.body.roles);
    });
    it('Should be new field \'lastLogin\' in document with proper token ', async () => {
      const lastUser = await usersCollection.findOne({}, { skip: 50 });
      expect(lastUser!.lastLogin.lastJwtToken).toEqual(jwtToken);
      expect(lastUser!.lastLogin.dateTime).toBeInstanceOf(Date);
    });
    it('Should be error when token expired', async () => {
      const auth = new Authentication();
      const logIn = await auth.login(userForTests.body.email, userForTests.body.password, '1ms');
      try {
        const decodedToken = encryption.verifyJwtToken(logIn.jwtToken);
        expect(decodedToken).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual('jwt expired');
      }
    });
  });
});

import { Collection, MongoClient, ObjectId } from 'mongodb';
import { Request } from 'express';
import { connectionOptions, uri } from '../../src/Utils/dbConnection';
import {
  initialUsersSet, invalidIdFormats, userForTests, userForTestsToUpdate, wrongEmails
  // invalidIdFormats,
  // someMongoId,
  // userForTests
  // userForTestsToUpdate
} from '../utils/usersExampleData';
import UserRepository from '../../src/Repository/UserRepository';
import Authentication from '../../src/Repository/Authentication';
import { errorsMessages } from '../../src/Validator/ErrorMessages';
import TestHelpersClass from '../utils/TestHelpersClass';
import { loginTypes } from '../../src/Interfaces/CustomTypes';
import * as faker from 'faker';
import { validLanguages } from '../../src/Interfaces/Enums';

// TODO remove ts-ignore
let connection: void | MongoClient;
let usersCollection: Collection;

// LogInn users for tests
// @ts-ignore
let firstUserLogIn: loginTypes;
let adminLogin: loginTypes;
let superAdminLogin: loginTypes;

// documents count
let totalDocumentsInCollection:number;
// @ts-ignore
let totalEnabledDocumentsInCollection:number;

let firstDocument:any;
let secondDocument: any;

beforeAll(async () => {
  // connection
  connection = await MongoClient.connect(uri, connectionOptions);
  // injection db
  await UserRepository.injectDB(connection);
  await Authentication.injectDB(connection);

  // collections
  usersCollection = await connection.db('tests').collection('users');

  // checking users collection amd seed data if necessary
  await TestHelpersClass.checkAndPrepareUsersCollection(usersCollection, initialUsersSet);

  // logIn users with different roles
  firstUserLogIn = await TestHelpersClass.getFirstUserAndLogin(usersCollection);
  adminLogin = await TestHelpersClass.getFirstAdminAndLogin(usersCollection);
  superAdminLogin = await TestHelpersClass.getFirstSuperAdminAndLogin(usersCollection);

  // documents count
  totalDocumentsInCollection = await TestHelpersClass.getNumberOfDocumentsInCollection(usersCollection);
  totalEnabledDocumentsInCollection = await TestHelpersClass.getNumberOfEnabledDocumentsInCollection(usersCollection);

  // objects to compare
  firstDocument = await TestHelpersClass.getFirstDocument(usersCollection);
  secondDocument = await TestHelpersClass.getSomeDocument(usersCollection, 1);
}, 15000);

describe('Error handling threw by repository instance\'', () => {
  it('Should be error with invalid LANGUAGE', async () => {
    const incorrectLangs = ['de', 'fr', 'be'];
    for (const incorrectLang of incorrectLangs) {
      try {
        const repository = new UserRepository(incorrectLang);
        expect(repository).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual(errorsMessages.invalidLang);
      }
    }
  });
  it('Should be error with invalid token', async () => {
    try {
      const repository = new UserRepository('pl', TestHelpersClass.makeInvalidToken());
      expect(repository).toThrowError();
    } catch (err) {
      expect(err.message).toEqual(errorsMessages.invalidToken);
      expect(err.code).toEqual(401);
    }
  });
  it('Should be error with invalid id format encoded in jwtToken', async () => {
    const wrongToken = TestHelpersClass.makeJwtTokenWithNotCorrectIdFormat();
    try {
      const repository = new UserRepository('pl', wrongToken);
      expect(repository).toThrowError();
    } catch (err) {
      expect(err.message).toEqual(errorsMessages.invalidToken);
      expect(err.code).toEqual(401);
    }
  });
});

describe('Creating new document', () => {
  describe('Error handling', () => {
    it('Should error when attempt to create user', async () => {
      const repository = new UserRepository('pl');
      try {
        const newUser = await repository.createDocument();
        expect(newUser).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.createUserError);
      }
    });
  });
});

describe('Updating user document', () => {
  describe('Error handling', () => {
    describe('Credentials and id errors', () => {
      it('Should be error without jwtToken', async () => {
        const repository = new UserRepository('pl');
        try {
          const updateUser = await repository.updateDocument(TestHelpersClass.makeInvalidToken(), userForTestsToUpdate as Request);
          expect(updateUser).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(401);
          expect(err.message).toEqual(errorsMessages.missingAuthorization);
        }
      });
      it('Should be error with invalid id format', async () => {
        const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
        for (const invalidIdFormat of invalidIdFormats) {
          try {
            const updateStatus = await repository.updateDocument(invalidIdFormat, userForTestsToUpdate as Request);
            expect(updateStatus).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.invalidIdFormat);
          }
        }
      });
      it('Should be error if password is given', async () => {
        const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
        const userForTestsToUpdateWithPassword = {
          body: {
            ...userForTestsToUpdate.body,
            password: 'Test123$$'
          }
        };
        try {
          const updateUser = await repository.updateDocument(
            firstDocument._id.toString(),
          userForTestsToUpdateWithPassword as Request
          );
          expect(updateUser).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(401);
          expect(err.message).toEqual(errorsMessages.passwordNotAllowed);
        }
      });
      it('Should be error if given id not exist in collection', async () => {
        const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
        try {
          const updateUser = await repository.updateDocument(
            TestHelpersClass.makeNotExistingId().toHexString(),
          userForTestsToUpdate as Request
          );
          expect(updateUser).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(422);
          expect(err.message).toEqual(errorsMessages.invalidId);
        }
      });
      it('Should be error if email already exists in collection', async () => {
        userForTestsToUpdate.body.email = secondDocument!.email;
        const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
        try {
          const updateUser = await repository.updateDocument(
            firstDocument._id.toString(),
          userForTestsToUpdate as Request
          );
          expect(updateUser).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(422);
          expect(err.message).toEqual(errorsMessages.emailExists);
        }
      });
      it('Should be error if encoded in jwtToken id does not exists in user collection', async () => {
        const repository = new UserRepository('pl', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
        try {
          const newArType = await repository.updateDocument(firstDocument._id.toString(), userForTests as Request);
          expect(newArType).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(401);
          expect(err.message).toEqual(errorsMessages.invalidToken);
        }
      });
    });
    describe('Given fields validation', () => {
      describe('firstName field', () => {
        it('Should be error without firstName field', async () => {
        // @ts-ignore
          delete userForTestsToUpdate.body.firstName;
          userForTestsToUpdate.body.email = faker.internet.email();
          const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateUser = await repository.updateDocument(
              firstDocument._id.toString(),
            userForTestsToUpdate as Request
            );
            expect(updateUser).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.firstNameIsRequired);
          }
        });
        it('Should be error when  firstName is too short', async () => {
        // @ts-ignore
          userForTestsToUpdate.body.firstName = 'D';
          const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateUser = await repository.updateDocument(
              firstDocument._id.toString(),
            userForTestsToUpdate as Request
            );
            expect(updateUser).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.firstNameTooShort);
          }
        });
        it('Should be error when  firstName is too long', async () => {
        // @ts-ignore
          userForTestsToUpdate.body.firstName = 'Edward-JeanLudwikJacekPlacekAntoniAlojzyMarcinGrzegorz';
          const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateUser = await repository.updateDocument(
              firstDocument._id.toString(),
            userForTestsToUpdate as Request
            );
            expect(updateUser).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.firstNameTooLong);
          }
        });
      });
      describe('lastName field', () => {
        it('Should be error without lastName field', async () => {
          // @ts-ignore
          delete userForTestsToUpdate.body.lastName;
          userForTestsToUpdate.body.firstName = faker.name.firstName();
          const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateUser = await repository.updateDocument(
              firstDocument._id.toString(),
              userForTestsToUpdate as Request
            );
            expect(updateUser).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.lastNameIsRequired);
          }
        });
        it('Should be error when  lastName is too short', async () => {
          // @ts-ignore
          userForTestsToUpdate.body.lastName = 'D';
          const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateUser = await repository.updateDocument(
              firstDocument._id.toString(),
              userForTestsToUpdate as Request
            );
            expect(updateUser).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.lastNameTooShort);
          }
        });
        it('Should be error when  lastName is too long', async () => {
          // @ts-ignore
          userForTestsToUpdate.body.lastName = 'Edward-JeanLudwikJacekPlacekAntoniAlojzyMarcinGrzegorz';
          const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateUser = await repository.updateDocument(
              firstDocument._id.toString(),
              userForTestsToUpdate as Request
            );
            expect(updateUser).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.lastNameTooLong);
          }
        });
      });
      describe('email field', () => {
        it('Should be error without field field', async () => {
          // @ts-ignore
          delete userForTestsToUpdate.body.email;
          userForTestsToUpdate.body.lastName = faker.name.lastName();
          const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateUser = await repository.updateDocument(
              firstDocument._id.toString(),
              userForTestsToUpdate as Request
            );
            expect(updateUser).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.emailIsRequired);
          }
        });
        it('Should be error when  email  is too long', async () => {
          // @ts-ignore
          userForTestsToUpdate.body.email = 'BrzęczyszczykiewiczGałęzowskiLudwiniakPełczyńskiZagajewskiBrzęczyszczykiewiczGałęzowskiLudwiniakPełczyńskiZagajewskiBrzęczyszczykiewiczGałęzowskiLudwiniakPełczyńskiZagajewskiBrzęczyszczykiewiczGałęzowskiLudwiniakPełczyńskiZagajewskiLudwiniakPełczyńskiZagajewsksiLudwiniakPełczyńskiZagajewski@costam.com';
          const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateUser = await repository.updateDocument(
              firstDocument._id.toString(),
              userForTestsToUpdate as Request
            );
            expect(updateUser).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.emailTooLong);
          }
        });
        it('Should error with incorrect email format ', async () => {
          const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
          for (const wrongEmail of wrongEmails) {
            userForTestsToUpdate.body.email = wrongEmail;
            try {
              const updateUser = await repository.updateDocument(
                firstDocument._id.toString(),
                userForTestsToUpdate as Request
              );
              expect(updateUser).toThrowError();
            } catch (err) {
              expect(err.code).toEqual(422);
              expect(err.message).toEqual(errorsMessages.invalidEmailFormat);
            }
          }
        });
      });
    });
  });
  describe('Updating without Admin privilege', () => {
    it('Should be not possible to update other user without Admin privilege', async () => {
      const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
      try {
        const updateUser = await repository.updateDocument(secondDocument!._id.toString(),
          userForTestsToUpdate as Request);
        expect(updateUser).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.notAuthorized);
      }
    });
    it('Should be possible update document itself ', async () => {
      userForTestsToUpdate.body.email = 'pomidor@test.pl';
      const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
      try {
        const updateUser = await repository.updateDocument(firstDocument._id.toString(), userForTestsToUpdate as Request);
        expect(updateUser.acknowledged).toEqual(true);
        expect(updateUser.modifiedCount).toEqual(1);
        expect(updateUser.upsertedId).toBeNull();
        expect(updateUser.upsertedCount).toEqual(0);
        expect(updateUser.matchedCount).toEqual(1);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be proper data in updated document', async () => {
      const updatedUser = await TestHelpersClass.getFirstDocument(usersCollection);
      expect(updatedUser!._id).toBeInstanceOf(ObjectId);
      expect(updatedUser!.firstName).toEqual(userForTestsToUpdate.body.firstName);
      expect(updatedUser!.lastName).toEqual(userForTestsToUpdate.body.lastName);
      expect(updatedUser!.email).toEqual(userForTestsToUpdate.body.email);
      expect(updatedUser!.avatar).toEqual(userForTestsToUpdate.body.avatar);
      expect(updatedUser!.isEnabled).toEqual(userForTestsToUpdate.body.isEnabled);
      expect(updatedUser!.roles).toEqual(userForTestsToUpdate.body.roles);
      expect(updatedUser!.aboutMe).toEqual(userForTestsToUpdate.body.aboutMe);
      expect(updatedUser!.createdAt).toBeInstanceOf(Date);
      expect(updatedUser!.updatedAt).toBeInstanceOf(Date);
    });
  });
  describe('Updating with Admin privilege', () => {
    let userForTestsToUpdate: any;
    it('Should be possible to update another user  with Admin privilege', async () => {
      userForTestsToUpdate = {
        body: {
          firstName: firstDocument.firstName,
          lastName: faker.name.lastName(),
          email: faker.internet.email(),
          avatar: faker.internet.avatar(),
          roles: ['ROLE_USER'],
          isEnabled: true,
          aboutMe: {
            pl: 'Coś tam po polsku i już',
            en: 'Something in english and more'
          },
          createdAt: faker.date.between('2020-11-01', '2021-09-15'),
          updatedAt: faker.date.between('2020-11-01', '2021-09-15')
        }
      };

      // const adminLogIn = await authRepo.login(adminUser!.email, adminUser!.firstName);
      const repository = new UserRepository('pl', adminLogin.jwtToken);
      // @ts-ignore
      delete userForTests.body.password;
      userForTests.body.email = 'eogorek2@test.pl';
      try {
        const updatedByAdmin = await repository.updateDocument(firstDocument._id.toString(), userForTestsToUpdate as Request);
        expect(updatedByAdmin.acknowledged).toEqual(true);
        expect(updatedByAdmin.modifiedCount).toEqual(1);
        expect(updatedByAdmin.upsertedId).toBeNull();
        expect(updatedByAdmin.upsertedCount).toEqual(0);
        expect(updatedByAdmin.matchedCount).toEqual(1);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be changed user document', async () => {
      const changedUser = await usersCollection.findOne({ _id: firstDocument._id });
      expect(changedUser!.firstName).toEqual(userForTestsToUpdate.body.firstName);
      expect(changedUser!.lastName).toEqual(userForTestsToUpdate.body.lastName);
      expect(changedUser!.isEnabled).toEqual(userForTestsToUpdate.body.isEnabled);
      expect(changedUser!.avatar).toEqual(userForTestsToUpdate.body.avatar);
      expect(changedUser!.aboutMe).toEqual(userForTestsToUpdate.body.aboutMe);
      expect(changedUser!.email).toEqual(userForTestsToUpdate.body.email);
      expect(changedUser!.roles).toEqual(userForTestsToUpdate.body.roles);
      expect(changedUser!.roles).toEqual(userForTestsToUpdate.body.roles);
      expect(changedUser!.createdAt).toBeInstanceOf(Date);
      expect(changedUser!.updatedAt).toBeInstanceOf(Date);
    });
  });
});

describe('Enabling/Disabling document', () => {
  describe('Errors handling', () => {
    it('Should be error without jwtToken', async () => {
      const repository = new UserRepository('pl');
      try {
        const updateStatus = await repository.updateStatus(firstDocument._id.toString(), false);
        expect(updateStatus).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.missingAuthorization);
      }
    });
    it('Should be error with invalid id format', async () => {
      const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
      for (const invalidIdFormat of invalidIdFormats) {
        try {
          const updateStatus = await repository.updateStatus(invalidIdFormat, false);
          expect(updateStatus).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(422);
          expect(err.message).toEqual(errorsMessages.invalidIdFormat);
        }
      }
    });
    it('Should be error when jwtToken contains encrypted id which not exists in users collection', async () => {
      const repository = new UserRepository('en', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
      try {
        const getUser = await repository.updateStatus(firstDocument._id.toString(), true);
        expect(getUser).toThrowError();
      } catch (err) {
        expect(err.message).toEqual(errorsMessages.invalidToken);
        expect(err.code).toEqual(401);
      }
    });
    it('Should be error if given id not exist in collection', async () => {
      const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
      try {
        const changeStatus = await repository.updateStatus(TestHelpersClass.makeNotExistingId().toHexString(), true);
        expect(changeStatus).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual(errorsMessages.invalidId);
      }
    });
  });
  describe('Changing status without Admin privilege', () => {
    it('Should be possible to change status for the same user as logged', async () => {
      const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
      try {
        const changeStatus = await repository.updateStatus(firstDocument._id.toString(), !firstDocument.isEnabled);
        expect(changeStatus.acknowledged).toEqual(true);
        expect(changeStatus.modifiedCount).toEqual(1);
        expect(changeStatus.upsertedId).toBeNull();
        expect(changeStatus.upsertedCount).toEqual(0);
        expect(changeStatus.matchedCount).toEqual(1);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be changed status', async () => {
      const changedUser = await usersCollection.findOne({ _id: firstDocument._id });
      expect(changedUser!.isEnabled).toEqual(!firstDocument.isEnabled);
    });
    it('Should be not possible to change another user status', async () => {
      const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
      const someUser = await TestHelpersClass.getSomeDocument(usersCollection, 3);
      try {
        const changeStatus = await repository.updateStatus(someUser!._id.toString(), true);
        expect(changeStatus).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.notAuthorized);
      }
    });
  });
  describe('Changing status with Admin privilege', () => {
    it('Should be possible to change another user status with Admin privilege', async () => {
      const repository = new UserRepository('pl', adminLogin.jwtToken);
      try {
        const changedByAdmin = await repository.updateStatus(firstDocument!._id.toString(), true);
        expect(changedByAdmin.acknowledged).toEqual(true);
        expect(changedByAdmin.modifiedCount).toEqual(1);
        expect(changedByAdmin.upsertedId).toBeNull();
        expect(changedByAdmin.upsertedCount).toEqual(0);
        expect(changedByAdmin.matchedCount).toEqual(1);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be changed status', async () => {
      const changedUser = await TestHelpersClass.getFirstDocument(usersCollection);
      expect(changedUser!.isEnabled).toEqual(firstDocument.isEnabled);
    });
  });
});

describe('Deleting users', () => {
  describe('Handling errors errors', () => {
    it('Should be error without jwtToken', async () => {
      const repository = new UserRepository('pl');
      try {
        const deleteDocument = await repository.deleteDocument(firstDocument._id.toString());
        expect(deleteDocument).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.missingAuthorization);
      }
    });
    it('Should be error with invalid id format', async () => {
      const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
      for (const invalidIdFormat of invalidIdFormats) {
        try {
          const deleteDocument = await repository.deleteDocument(invalidIdFormat);
          expect(deleteDocument).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(422);
          expect(err.message).toEqual(errorsMessages.invalidIdFormat);
        }
      }
    });
    it('Should be error if given id not exist in collection', async () => {
      const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
      try {
        const changeStatus = await repository.deleteDocument(TestHelpersClass.makeNotExistingId().toHexString());
        expect(changeStatus).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual(errorsMessages.invalidId);
      }
    });
    it('Should be not possible to delete without SUPERADMIN privilege', async () => {
      const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
      try {
        const deleteUser = await repository.deleteDocument(firstDocument!._id.toString());
        expect(deleteUser).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.notSuperAdmin);
      }
    });
    it('Should be error when jwtToken contains encrypted id which not exists in users collection', async () => {
      const repository = new UserRepository('en', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
      try {
        const getUser = await repository.deleteDocument(firstDocument._id.toString());
        expect(getUser).toThrowError();
      } catch (err) {
        expect(err.message).toEqual(errorsMessages.invalidToken);
        expect(err.code).toEqual(401);
      }
    });
  });
  describe('Deleting with SUPERADMIN privilege', () => {
    beforeAll(async () => {
      await usersCollection.insertOne(userForTestsToUpdate);
    });
    it('Should be possible to delete user with SUPERADMIN', async () => {
      const repository = new UserRepository('pl', superAdminLogin.jwtToken);
      const lastUser = await usersCollection.findOne({}, { skip: totalDocumentsInCollection });
      try {
        const deleteUser = await repository.deleteDocument(lastUser!._id.toString());
        expect(deleteUser.acknowledged).toEqual(true);
        expect(deleteUser.deletedCount).toEqual(1);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be one document less in collection', async () => {
      const currentTotalDocuments = await usersCollection.countDocuments();
      expect(currentTotalDocuments).toEqual(totalDocumentsInCollection);
    });
  });
});

describe('Querying single user with', () => {
  describe('Error handling', () => {
    it('Should be error with incorrect id format', async () => {
      const repository = new UserRepository('pl');
      for (const invalidIdFormat of invalidIdFormats) {
        try {
          const getDoc = await repository.getDocumentById(invalidIdFormat);
          expect(getDoc).toThrowError();
        } catch (err) {
          expect(err.message).toEqual(errorsMessages.invalidIdFormat);
          expect(err.code).toEqual(422);
        }
      }
    });
    it('Should be error when id does not exists in db', async () => {
      const repository = new UserRepository('en');
      try {
        const getDoc = await repository.getDocumentById(TestHelpersClass.makeNotExistingId().toHexString());
        expect(getDoc).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(404);
        expect(err.message).toEqual(errorsMessages.userNotFound);
      }
    });
    it('Should be error when jwtToken contains encrypted id which not exists in users collection', async () => {
      const repository = new UserRepository('en', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
      try {
        const getDoc = await repository.getDocumentById(firstDocument!._id.toString());
        expect(getDoc).toThrowError();
      } catch (err) {
        expect(err.message).toEqual(errorsMessages.invalidToken);
        expect(err.code).toEqual(401);
      }
    });
    it('Should be not possible to query disabled document without authentication', async () => {
      const thirdDisabledUser = await TestHelpersClass.getSomeDisabledDocument(usersCollection, 2);
      const repository = new UserRepository('en');
      try {
        const getDoc = await repository.getDocumentById(thirdDisabledUser!._id.toString());
        expect(getDoc).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(404);
        expect(err.message).toEqual(errorsMessages.userNotFound);
      }
    });
  });
  describe('Validation returned object without jwtToken', () => {
    it('Should be proper object with polish language', async () => {
      const repository = new UserRepository('pl');
      try {
        const getDoc = await repository.getDocumentById(secondDocument._id.toString());
        expect(getDoc._id).toBeInstanceOf(ObjectId);
        expect(getDoc.firstName).toEqual(secondDocument.firstName);
        expect(getDoc.lastName).toEqual(secondDocument.lastName);
        expect(getDoc.email).toEqual(secondDocument.email);
        expect(getDoc.avatar).toEqual(secondDocument.avatar);
        expect(getDoc.aboutMe).toEqual(secondDocument.aboutMe.pl);
        expect(getDoc.isEnabled).toBeUndefined();
        expect(getDoc.roles).toBeUndefined();
        expect(getDoc.createdAt).toBeInstanceOf(Date);
        expect(getDoc.updatedAt).toBeInstanceOf(Date);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be proper object with english language', async () => {
      const repository = new UserRepository('en');
      try {
        const getDoc = await repository.getDocumentById(secondDocument._id.toString());
        expect(getDoc._id).toBeInstanceOf(ObjectId);
        expect(getDoc.firstName).toEqual(secondDocument.firstName);
        expect(getDoc.lastName).toEqual(secondDocument.lastName);
        expect(getDoc.email).toEqual(secondDocument.email);
        expect(getDoc.avatar).toEqual(secondDocument.avatar);
        expect(getDoc.aboutMe).toEqual(secondDocument.aboutMe.en);
        expect(getDoc.isEnabled).toBeUndefined();
        expect(getDoc.roles).toBeUndefined();
        expect(getDoc.createdAt).toBeInstanceOf(Date);
        expect(getDoc.updatedAt).toBeInstanceOf(Date);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
  });
  describe('Validation returned object with jwtToken', () => {
    it('Should be proper object despite language', async () => {
      for (const validLanguage of Object.keys(validLanguages)) {
        const repository = new UserRepository(validLanguage, firstUserLogIn.jwtToken);
        try {
          const getDoc = await repository.getDocumentById(secondDocument._id.toString());
          expect(getDoc._id).toBeInstanceOf(ObjectId);
          expect(getDoc.firstName).toEqual(secondDocument.firstName);
          expect(getDoc.lastName).toEqual(secondDocument.lastName);
          expect(getDoc.email).toEqual(secondDocument.email);
          expect(getDoc.avatar).toEqual(secondDocument.avatar);
          expect(getDoc.aboutMe).toEqual(secondDocument.aboutMe);
          expect(getDoc.isEnabled).toEqual(secondDocument.isEnabled);
          expect(getDoc.roles).toEqual(secondDocument.roles);
          expect(getDoc.createdAt).toBeInstanceOf(Date);
          expect(getDoc.updatedAt).toBeInstanceOf(Date);
        } catch (err) {
          expect(err).toBeNull();
        }
      }
    });
  });
});

describe('Querying paginated list of users with \'getPaginatedDocuments\' method', () => {
  describe('Error handling', () => {
    it('Should error 422 when incorrect page parameter is given', async () => {
      const repository = new UserRepository('en');
      try {
        const getUsers = await repository.getPaginatedDocuments(4.5, 4);
        expect(getUsers).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual(errorsMessages.noIntegerPage);
      }
    });
    it('Should error 422 when incorrect perPage parameter is given', async () => {
      const repository = new UserRepository('pl');
      try {
        const getUsers = await repository.getPaginatedDocuments(4, 4.3);
        expect(getUsers).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual(errorsMessages.noIntegerPerPage);
      }
    });
    it('Should error 404 when page is bigger then "totalPages" ', async () => {
      const repository = new UserRepository('pl');
      try {
        const getUsers = await repository.getPaginatedDocuments(10004, 4);
        expect(getUsers).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(404);
        expect(err.message).toEqual(errorsMessages.itemsNotFound);
      }
    });
    it('Should be error when jwtToken contains encrypted id which not exists in users collection', async () => {
      const repository = new UserRepository('en', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
      try {
        const getUser = await repository.getPaginatedDocuments(1, 5);
        expect(getUser).toThrowError();
      } catch (err) {
        expect(err.message).toEqual(errorsMessages.invalidToken);
        expect(err.code).toEqual(401);
      }
    });
  });
  describe('Validating response', () => {
    let secondEnabledUser: any;
    describe('Without jwtToken', () => {
      it('Should be returned proper object on not last page', async () => {
        const page = 2;
        const perPage = 5;
        const repository = new UserRepository('pl');
        try {
          const getUsers = await repository.getPaginatedDocuments(page, perPage);
          expect(getUsers!.data.length).toEqual(perPage);
          expect(getUsers!.docsOnPage).toEqual(perPage);
          expect(getUsers!.totalDocs).toEqual(totalEnabledDocumentsInCollection);
          expect(getUsers!.totalPages).toEqual(Math.ceil(totalEnabledDocumentsInCollection / perPage));
          expect(getUsers!.currentPage).toEqual(page);
        } catch (err) {
          expect(err).toBeNull();
        }
      });
      it('Should be returned proper object on last page', async () => {
        const page = 3;
        const perPage = 10;
        const repository = new UserRepository('pl');
        const docsOnLastPage = totalEnabledDocumentsInCollection - (perPage * (page - 1));
        try {
          const getUsers = await repository.getPaginatedDocuments(page, perPage);
          expect(getUsers!.data.length).toEqual(docsOnLastPage);
          expect(getUsers!.docsOnPage).toEqual(docsOnLastPage);
          expect(getUsers!.totalDocs).toEqual(totalEnabledDocumentsInCollection);
          expect(getUsers!.totalPages).toEqual(Math.ceil(totalEnabledDocumentsInCollection / perPage));
          expect(getUsers!.currentPage).toEqual(page);
        } catch (err) {
          expect(err).toBeNull();
        }
      });
      it('Should be proper object inside data with polish lang', async () => {
        secondEnabledUser = await TestHelpersClass.getSomeEnabledDocument(usersCollection, 1);
        const page = 1;
        const perPage = 10;
        const repository = new UserRepository('pl');
        try {
          const getUsers = await repository.getPaginatedDocuments(page, perPage);
          expect(getUsers!.data[1]._id).toEqual(secondEnabledUser!._id);
          expect(getUsers!.data[1].firstName).toEqual(secondEnabledUser!.firstName);
          expect(getUsers!.data[1].lastName).toEqual(secondEnabledUser!.lastName);
          expect(getUsers!.data[1].email).toEqual(secondEnabledUser!.email);
          expect(getUsers!.data[1].avatar).toEqual(secondEnabledUser!.avatar);
          expect(getUsers!.data[1].aboutMe).toEqual(secondEnabledUser!.aboutMe.pl);
          expect(getUsers!.data[1].createdAt).toBeInstanceOf(Date);
          expect(getUsers!.data[1].updatedAt).toBeInstanceOf(Date);
        } catch (err) {
          expect(err).toBeNull();
        }
      });
      it('Should be proper object inside data with english lang', async () => {
        const page = 1;
        const perPage = 10;
        const repository = new UserRepository('en');
        try {
          const getUsers = await repository.getPaginatedDocuments(page, perPage);
          expect(getUsers!.data[1]._id).toEqual(secondEnabledUser!._id);
          expect(getUsers!.data[1].firstName).toEqual(secondEnabledUser!.firstName);
          expect(getUsers!.data[1].lastName).toEqual(secondEnabledUser!.lastName);
          expect(getUsers!.data[1].email).toEqual(secondEnabledUser!.email);
          expect(getUsers!.data[1].avatar).toEqual(secondEnabledUser!.avatar);
          expect(getUsers!.data[1].aboutMe).toEqual(secondEnabledUser!.aboutMe.en);
          expect(getUsers!.data[1].createdAt).toBeInstanceOf(Date);
          expect(getUsers!.data[1].updatedAt).toBeInstanceOf(Date);
        } catch (err) {
          expect(err).toBeNull();
        }
      });
    });

    describe('Validation response with jwtToken', () => {
      it('Should be returned proper object on not last page', async () => {
        const page = 2;
        const perPage = 5;
        const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
        try {
          const getUsers = await repository.getPaginatedDocuments(page, perPage);
          expect(getUsers!.data.length).toEqual(perPage);
          expect(getUsers!.docsOnPage).toEqual(perPage);
          expect(getUsers!.totalDocs).toEqual(totalDocumentsInCollection);
          expect(getUsers!.totalPages).toEqual(Math.ceil(totalDocumentsInCollection / perPage));
          expect(getUsers!.currentPage).toEqual(page);
        } catch (err) {
          expect(err).toBeNull();
        }
      });
      it('Should be returned proper object on last page', async () => {
        const page = 6;
        const perPage = 9;
        const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
        const totalPages = Math.ceil(totalDocumentsInCollection / perPage);
        const docsOnLastPage = totalDocumentsInCollection - (perPage * (totalPages - 1));
        try {
          const getUsers = await repository.getPaginatedDocuments(page, perPage);
          expect(getUsers!.data.length).toEqual(docsOnLastPage);
          expect(getUsers!.docsOnPage).toEqual(docsOnLastPage);
          expect(getUsers!.totalDocs).toEqual(totalDocumentsInCollection);
          expect(getUsers!.totalPages).toEqual(totalPages);
          expect(getUsers!.currentPage).toEqual(page);
        } catch (err) {
          expect(err).toBeNull();
        }
      });
      it('Should be proper object with polish lang', async () => {
        const repository = new UserRepository('pl', firstUserLogIn.jwtToken);
        try {
          const getUsers = await repository.getPaginatedDocuments(1, 12);
          expect(getUsers!.data[1]._id).toEqual(secondEnabledUser!._id);
          expect(getUsers!.data[1].firstName).toEqual(secondEnabledUser!.firstName);
          expect(getUsers!.data[1].lastName).toEqual(secondEnabledUser!.lastName);
          expect(getUsers!.data[1].email).toEqual(secondEnabledUser!.email);
          expect(getUsers!.data[1].avatar).toEqual(secondEnabledUser!.avatar);
          expect(getUsers!.data[1].aboutMe).toEqual(secondEnabledUser!.aboutMe.pl);
          expect(getUsers!.data[1].isEnabled).toEqual(secondEnabledUser!.isEnabled);
          expect(getUsers!.data[1].roles).toEqual(secondEnabledUser!.roles);
          expect(getUsers!.data[1].createdAt).toBeInstanceOf(Date);
          expect(getUsers!.data[1].updatedAt).toBeInstanceOf(Date);
        } catch (err) {
          expect(err).toBeNull();
        }
      });
      it('Should be proper object with english lang', async () => {
        const repository = new UserRepository('en', firstUserLogIn.jwtToken);
        try {
          const getUsers = await repository.getPaginatedDocuments(1, 12);
          expect(getUsers!.data[1]._id).toEqual(secondEnabledUser!._id);
          expect(getUsers!.data[1].firstName).toEqual(secondEnabledUser!.firstName);
          expect(getUsers!.data[1].lastName).toEqual(secondEnabledUser!.lastName);
          expect(getUsers!.data[1].email).toEqual(secondEnabledUser!.email);
          expect(getUsers!.data[1].avatar).toEqual(secondEnabledUser!.avatar);
          expect(getUsers!.data[1].aboutMe).toEqual(secondEnabledUser!.aboutMe.en);
          expect(getUsers!.data[1].isEnabled).toEqual(secondEnabledUser!.isEnabled);
          expect(getUsers!.data[1].roles).toEqual(secondEnabledUser!.roles);
          expect(getUsers!.data[1].createdAt).toBeInstanceOf(Date);
          expect(getUsers!.data[1].updatedAt).toBeInstanceOf(Date);
        } catch (err) {
          expect(err).toBeNull();
        }
      });
    });
  });
});

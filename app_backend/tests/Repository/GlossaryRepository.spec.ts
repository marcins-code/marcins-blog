// TODO remove ts-ignore
import { Collection, MongoClient, ObjectId } from 'mongodb';
import { loginTypes } from '../../src/Interfaces/CustomTypes';
import { connectionOptions, dbName, uri } from '../../src/Utils/dbConnection';
import UserRepository from '../../src/Repository/UserRepository';
import TestHelpersClass from '../utils/TestHelpersClass';
import { initialUsersSet, invalidIdFormats } from '../utils/usersExampleData';
import GlossaryRepository from '../../src/Repository/GlossaryRepository';
import Authentication from '../../src/Repository/Authentication';
import { errorsMessages } from '../../src/Validator/ErrorMessages';
import { Request } from 'express';
import * as faker from 'faker';
import { validLanguages } from '../../src/Interfaces/Enums';

let connection: MongoClient;
let usersCollection: Collection;
let glossaryCollection: Collection;

// LogInn users for tests for
let firstUserLogIn: loginTypes;
let adminLogin: loginTypes;
let superAdminLogin: loginTypes;

// documents count
let totalDocumentsInCollection: number;
let totalEnabledDocumentsInCollection: number;

let glossaryForTests: any;
let firstDocument: any;
beforeAll(async () => {
  // connection
  connection = await MongoClient.connect(uri, connectionOptions);

  // injection db
  await Authentication.injectDB(connection);
  await UserRepository.injectDB(connection);
  await GlossaryRepository.injectDB(connection);

  // collections
  usersCollection = await connection.db(dbName).collection('users');
  glossaryCollection = await connection.db(dbName).collection('glossary');

  // checking users collection amd seed data if necessary
  await TestHelpersClass.checkAndPrepareUsersCollection(usersCollection, initialUsersSet);
  await TestHelpersClass.checkAndPrepareGlossaryCollection(glossaryCollection, usersCollection);

  // logIn users with different roles
  firstUserLogIn = await TestHelpersClass.getFirstUserAndLogin(usersCollection);
  adminLogin = await TestHelpersClass.getFirstAdminAndLogin(usersCollection);
  superAdminLogin = await TestHelpersClass.getFirstSuperAdminAndLogin(usersCollection);

  // documents count
  totalDocumentsInCollection = await TestHelpersClass.getNumberOfDocumentsInCollection(glossaryCollection);
  totalEnabledDocumentsInCollection = await TestHelpersClass.getNumberOfEnabledDocumentsInCollection(glossaryCollection);

  // objects to insert or update
  const makeGlossaryForTests = await TestHelpersClass.makeGlossaryForTest(usersCollection);
  glossaryForTests = { body: { ...makeGlossaryForTests } };

  // Obj for test
  firstDocument = await TestHelpersClass.getFirstDocument(glossaryCollection);
});

describe('Error handling threw by repository instance\'', () => {
  it('Should be error with invalid LANGUAGE', async () => {
    const incorrectLangs = ['de', 'fr', 'be'];
    for (const incorrectLang of incorrectLangs) {
      try {
        const repository = new GlossaryRepository(incorrectLang);
        expect(repository).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual(errorsMessages.invalidLang);
      }
    }
  });
  it('Should be error with invalid token', async () => {
    try {
      const repository = new GlossaryRepository('pl', TestHelpersClass.makeInvalidToken());
      expect(repository).toThrowError();
    } catch (err) {
      expect(err.message).toEqual(errorsMessages.invalidToken);
      expect(err.code).toEqual(401);
    }
  });
  it('Should be error with invalid id format encoded in jwtToken', async () => {
    const wrongToken = TestHelpersClass.makeJwtTokenWithNotCorrectIdFormat();
    try {
      const repository = new GlossaryRepository('pl', wrongToken);
      expect(repository).toThrowError();
    } catch (err) {
      expect(err.message).toEqual(errorsMessages.invalidToken);
      expect(err.code).toEqual(401);
    }
  });
});

describe('Creating new document', () => {
  describe('Error handling', () => {
    describe('Authorization errors', () => {
      it('Should be error without jwtToken', async () => {
        const repository = new GlossaryRepository('pl');
        try {
          const newGlossary = await repository.createDocument(glossaryForTests as Request);
          expect(newGlossary).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(401);
          expect(err.message).toEqual(errorsMessages.missingAuthorization);
        }
      });
      it('Should be error if id encoded in jwtToken not exists in users collection', async () => {
        const repository = new GlossaryRepository('pl', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
        try {
          const newGlossary = await repository.createDocument(glossaryForTests as Request);
          expect(newGlossary).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(401);
          expect(err.message).toEqual(errorsMessages.invalidToken);
        }
      });
    });
    describe('Given fields validation', () => {
      describe('Abbreviation field -> should be required when phrase field is empty', () => {
        it('Should be error when abbreviation field is empty and  phrase field is empty', async () => {
          delete glossaryForTests.body.phrase;
          delete glossaryForTests.body.abbreviation;
          const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newGlossary = await repository.createDocument(glossaryForTests as Request);
            expect(newGlossary).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.abrOrPhraseIsRequired);
          }
        });
        it('Should error when abbreviation field is too short', async () => {
          glossaryForTests.body.abbreviation = 'D';
          const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newGlossary = await repository.createDocument(glossaryForTests as Request);
            expect(newGlossary).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.abbTooShort);
          }
        });
        it('Should error when abbreviation field is too long', async () => {
          glossaryForTests.body.abbreviation = 'jakiś tam sobie skrót';
          const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newGlossary = await repository.createDocument(glossaryForTests as Request);
            expect(newGlossary).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.abbTooLong);
          }
        });
      });
      describe('Explication field -> should be required when abbreviation field is not empty ', () => {
        it('Should be error when abbreviation field is not empty and explication field is empty ', async () => {
          glossaryForTests.body.abbreviation = 'HTTP';
          delete glossaryForTests.body.explication;
          const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newGlossary = await repository.createDocument(glossaryForTests as Request);
            expect(newGlossary).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.explicationIsRequired);
          }
        });
        it('Should be error when  explication too short ', async () => {
          glossaryForTests.body.explication = 'O';
          const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newGlossary = await repository.createDocument(glossaryForTests as Request);
            expect(newGlossary).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.explicationTooShort);
          }
        });
        it('Should be error when  explication too long ', async () => {
          glossaryForTests.body.explication = faker.lorem.words(40);
          const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newGlossary = await repository.createDocument(glossaryForTests as Request);
            expect(newGlossary).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.explicationTooLong);
          }
        });
      });
      describe('Phrase field -> should be required when abbreviation field is empty', () => {
        it('Should error when phrase field is too short', async () => {
          delete glossaryForTests.body.abbreviation;
          glossaryForTests.body.phrase = 'D';
          const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newGlossary = await repository.createDocument(glossaryForTests as Request);
            expect(newGlossary).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.phraseTooShort);
          }
        });
        it('Should error when phrase field is too long', async () => {
          delete glossaryForTests.body.abbreviation;
          glossaryForTests.body.phrase = faker.lorem.words(20);
          const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newGlossary = await repository.createDocument(glossaryForTests as Request);
            expect(newGlossary).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.phraseTooLong);
          }
        });
      });
    });
  });
  describe('Validation response and inserted document', () => {
    it('Should be proper response', async () => {
      const newGlossaryForTests = await TestHelpersClass.makeGlossaryForTest(usersCollection);
      glossaryForTests = { body: { ...newGlossaryForTests } };
      const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
      try {
        const newGlossary = await repository.createDocument(glossaryForTests as Request);
        expect(newGlossary.acknowledged).toEqual(true);
        expect(newGlossary.insertedId).toBeInstanceOf(ObjectId);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be one document more in collection', async () => {
      const docsQtyAfterInsert = await glossaryCollection.countDocuments();
      expect(docsQtyAfterInsert).toEqual(totalDocumentsInCollection + 1);
    });
    it('Should be proper inserted document structure', async () => {
      const lastDoc = await glossaryCollection.findOne({}, { skip: 50 });
      expect(lastDoc!.isEnabled).toEqual(glossaryForTests.body.isEnabled);
      expect(lastDoc!.abbreviation).toEqual(glossaryForTests.body.abbreviation);
      expect(lastDoc!.phrase).toEqual(glossaryForTests.body.phrase);
      expect(lastDoc!.explication).toEqual(glossaryForTests.body.explication);
      expect(lastDoc!.explanation).toEqual(glossaryForTests.body.explanation);
      expect(lastDoc!.creator.toString()).toEqual(firstUserLogIn._id);
      expect(lastDoc!.createdAt).toBeInstanceOf(Date);
      expect(lastDoc!.updatedAt).toBeInstanceOf(Date);
    });
  });
});

describe('Updating  document', () => {
  let lastDocument: any;
  describe('Error handling', () => {
    describe('Credentials and id errors', () => {
      it('Should be error without jwtToken', async () => {
        const repository = new GlossaryRepository('pl');
        try {
          const updateGlossary = await repository.updateDocument(TestHelpersClass.makeInvalidToken(), glossaryForTests as Request);
          expect(updateGlossary).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(401);
          expect(err.message).toEqual(errorsMessages.missingAuthorization);
        }
      });
      it('Should be error with invalid id format', async () => {
        const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
        for (const invalidIdFormat of invalidIdFormats) {
          try {
            const updateGlossary = await repository.updateDocument(invalidIdFormat, glossaryForTests as Request);
            expect(updateGlossary).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.invalidIdFormat);
          }
        }
      });
      it('Should be error if given id not exist in collection', async () => {
        const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
        try {
          const updateGlossary = await repository.updateDocument(TestHelpersClass.makeNotExistingId().toHexString(), glossaryForTests as Request);

          expect(updateGlossary).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(422);
          expect(err.message).toEqual(errorsMessages.invalidId);
        }
      });
      it('Should be error if encoded in jwtToken id does not exists in user collection', async () => {
        const repository = new GlossaryRepository('pl', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
        try {
          const updateGlossary = await repository.updateDocument(TestHelpersClass.makeNotExistingId().toHexString(), glossaryForTests as Request);
          expect(updateGlossary).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(401);
          expect(err.message).toEqual(errorsMessages.invalidToken);
        }
      });
    });

    describe('Given fields validation', () => {
      describe('Abbreviation field -> should be required when phrase field is empty', () => {
        it('Should be error when abbreviation field is empty and  phrase field is empty', async () => {
          delete glossaryForTests.body.phrase;
          delete glossaryForTests.body.abbreviation;
          const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateGlossary = await repository.updateDocument(firstDocument._id.toString(), glossaryForTests as Request);
            expect(updateGlossary).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.abrOrPhraseIsRequired);
          }
        });
        it('Should error when abbreviation field is too short', async () => {
          glossaryForTests.body.abbreviation = 'D';
          const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateGlossary = await repository.updateDocument(firstDocument._id.toString(), glossaryForTests as Request);
            expect(updateGlossary).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.abbTooShort);
          }
        });
        it('Should error when abbreviation field is too long', async () => {
          glossaryForTests.body.abbreviation = 'jakiś tam sobie skrót';
          const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateGlossary = await repository.updateDocument(firstDocument._id.toString(), glossaryForTests as Request);
            expect(updateGlossary).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.abbTooLong);
          }
        });
      });
      describe('Explication field -> should be required when abbreviation field is not empty ', () => {
        it('Should be error when abbreviation field is not empty and explication field is empty ', async () => {
          glossaryForTests.body.abbreviation = 'HTTP';
          delete glossaryForTests.body.explication;
          const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateGlossary = await repository.updateDocument(firstDocument._id.toString(), glossaryForTests as Request);
            expect(updateGlossary).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.explicationIsRequired);
          }
        });
        it('Should be error when  explication too short ', async () => {
          glossaryForTests.body.explication = 'O';
          const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateGlossary = await repository.updateDocument(firstDocument._id.toString(), glossaryForTests as Request);
            expect(updateGlossary).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.explicationTooShort);
          }
        });
        it('Should be error when  explication too long ', async () => {
          glossaryForTests.body.explication = faker.lorem.words(40);
          const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateGlossary = await repository.updateDocument(firstDocument._id.toString(), glossaryForTests as Request);
            expect(updateGlossary).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.explicationTooLong);
          }
        });
      });
      describe('Phrase field -> should be required when abbreviation field is empty', () => {
        it('Should error when phrase field is too short', async () => {
          delete glossaryForTests.body.abbreviation;
          glossaryForTests.body.phrase = 'D';
          const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateGlossary = await repository.updateDocument(firstDocument._id.toString(), glossaryForTests as Request);
            expect(updateGlossary).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.phraseTooShort);
          }
        });
        it('Should error when phrase field is too long', async () => {
          delete glossaryForTests.body.abbreviation;
          glossaryForTests.body.phrase = faker.lorem.words(20);
          const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateGlossary = await repository.updateDocument(firstDocument._id.toString(), glossaryForTests as Request);
            expect(updateGlossary).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.phraseTooLong);
          }
        });
      });
    });
  });
  describe('Updating without Admin privilege', () => {
    it('Should be not possible to update when not creator is logged', async () => {
      const someDoc = await TestHelpersClass.getSomeDocument(glossaryCollection, 10);
      const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
      try {
        const updateArticle = await repository.updateDocument(someDoc!._id.toString(), glossaryForTests as Request);
        expect(updateArticle).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.notAuthorized);
      }
    });
    it('Should be possible to update when login user is creator', async () => {
      lastDocument = await TestHelpersClass.getSomeDocument(glossaryCollection, 50);
      glossaryForTests.body.abbreviation = 'SOLID';
      glossaryForTests.body.phrase = 'Jakaś phrase';
      glossaryForTests.body.explication = 'VOODOO aww egg23';
      const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
      try {
        const updateArticle = await repository.updateDocument(lastDocument!._id.toString(), glossaryForTests as Request);
        expect(updateArticle.acknowledged).toEqual(true);
        expect(updateArticle.modifiedCount).toEqual(1);
        expect(updateArticle.upsertedId).toEqual(null);
        expect(updateArticle.upsertedCount).toEqual(0);
        expect(updateArticle.matchedCount).toEqual(1);
      } catch (err) {
        console.log(err);
        expect(err).toBeNull();
      }
    });
    it('Should be updated document', async () => {
      lastDocument = await TestHelpersClass.getSomeDocument(glossaryCollection, 50);
      expect(lastDocument.abbreviation).toEqual(glossaryForTests.body.abbreviation);
      expect(lastDocument.explication).toEqual(glossaryForTests.body.explication);
      expect(lastDocument.phrase).toEqual(glossaryForTests.body.phrase);
      expect(lastDocument.isEnabled).toEqual(glossaryForTests.body.isEnabled);
      expect(lastDocument.explanation).toEqual(glossaryForTests.body.explanation);
      expect(lastDocument.creator.toString()).toEqual(firstUserLogIn._id);
    });
  });
  describe('Updating with Admin privilege', () => {
    it('Should be possible to update when login user is creator', async () => {
      lastDocument = await TestHelpersClass.getSomeDocument(glossaryCollection, 50);
      glossaryForTests.body.abbreviation = 'API';
      glossaryForTests.body.phrase = 'Jakieś API';
      glossaryForTests.body.explication = 'AAA AA POPUP III II';
      const repository = new GlossaryRepository('pl', adminLogin.jwtToken);
      try {
        const updateArticle = await repository.updateDocument(lastDocument!._id.toString(), glossaryForTests as Request);
        expect(updateArticle.acknowledged).toEqual(true);
        expect(updateArticle.modifiedCount).toEqual(1);
        expect(updateArticle.upsertedId).toEqual(null);
        expect(updateArticle.upsertedCount).toEqual(0);
        expect(updateArticle.matchedCount).toEqual(1);
      } catch (err) {
        console.log(err);
        expect(err).toBeNull();
      }
    });
    it('Should be updated document', async () => {
      lastDocument = await TestHelpersClass.getSomeDocument(glossaryCollection, 50);
      expect(lastDocument.abbreviation).toEqual(glossaryForTests.body.abbreviation);
      expect(lastDocument.explication).toEqual(glossaryForTests.body.explication);
      expect(lastDocument.phrase).toEqual(glossaryForTests.body.phrase);
      expect(lastDocument.isEnabled).toEqual(glossaryForTests.body.isEnabled);
      expect(lastDocument.explanation).toEqual(glossaryForTests.body.explanation);
      expect(lastDocument.creator.toString()).toEqual(firstUserLogIn._id);
    });
  });
});

describe('Enabling/Disabling document', () => {
  describe('Errors handling', () => {
    it('Should be error without jwtToken', async () => {
      const repository = new GlossaryRepository('pl');
      try {
        const changeStatus = await repository.updateStatus(firstDocument._id.toString(), false);
        expect(changeStatus).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.missingAuthorization);
      }
    });
    it('Should be error with invalid id format', async () => {
      const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
      for (const invalidIdFormat of invalidIdFormats) {
        try {
          const changeStatus = await repository.updateStatus(invalidIdFormat, false);
          expect(changeStatus).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(422);
          expect(err.message).toEqual(errorsMessages.invalidIdFormat);
        }
      }
    });
    it('Should be error when jwtToken contains encrypted id which not exists in users collection', async () => {
      const repository = new GlossaryRepository('en', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
      try {
        const changeStatus = await repository.updateStatus(firstDocument._id.toString(), true);
        expect(changeStatus).toThrowError();
      } catch (err) {
        expect(err.message).toEqual(errorsMessages.invalidToken);
        expect(err.code).toEqual(401);
      }
    });
    it('Should be error if given id not exist in collection', async () => {
      const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
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
      const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
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
      const changedUser = await TestHelpersClass.getFirstDocument(glossaryCollection);
      expect(changedUser!.isEnabled).toEqual(!firstDocument.isEnabled);
    });
    it('Should be not possible to change another document status', async () => {
      const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
      const someDoc = await TestHelpersClass.getSomeDocument(glossaryCollection, 20);
      try {
        const changeStatus = await repository.updateStatus(someDoc!._id.toString(), true);
        expect(changeStatus).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.notAuthorized);
      }
    });
  });
  describe('Changing status with Admin privilege', () => {
    it('Should be possible to change another user status with Admin privilege', async () => {
      const repository = new GlossaryRepository('pl', adminLogin.jwtToken);
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
      const changedUser = await TestHelpersClass.getFirstDocument(glossaryCollection);
      expect(changedUser!.isEnabled).toEqual(firstDocument.isEnabled);
    });
  });
});

describe('Deleting document', () => {
  describe('Handling errors errors', () => {
    it('Should be error without jwtToken', async () => {
      const repository = new GlossaryRepository('pl');
      try {
        const deleteDocument = await repository.deleteDocument(firstDocument._id.toString());
        expect(deleteDocument).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.missingAuthorization);
      }
    });
    it('Should be error with invalid id format', async () => {
      const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
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
      const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
      try {
        const changeStatus = await repository.deleteDocument(TestHelpersClass.makeNotExistingId().toHexString());
        expect(changeStatus).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual(errorsMessages.invalidId);
      }
    });
    it('Should be not possible to delete without SUPERADMIN privilege', async () => {
      const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
      try {
        const deleteUser = await repository.deleteDocument(firstDocument!._id.toString());
        expect(deleteUser).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.notSuperAdmin);
      }
    });
    it('Should be error when jwtToken contains encrypted id which not exists in users collection', async () => {
      const repository = new GlossaryRepository('en', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
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
    it('Should be possible to delete user with SUPERADMIN', async () => {
      const repository = new GlossaryRepository('pl', superAdminLogin.jwtToken);
      const lastDoc = await TestHelpersClass.getSomeDocument(glossaryCollection, totalDocumentsInCollection);
      try {
        const deleteUser = await repository.deleteDocument(lastDoc!._id.toString());
        expect(deleteUser.acknowledged).toEqual(true);
        expect(deleteUser.deletedCount).toEqual(1);
      } catch (err) {
        console.log(err);
        expect(err).toBeNull();
      }
    });
    it('Should be one document less in collection', async () => {
      const currentTotalDocuments = await TestHelpersClass.getNumberOfDocumentsInCollection(glossaryCollection);
      expect(currentTotalDocuments).toEqual(totalDocumentsInCollection);
    });
  });
});

describe('Querying single document', () => {
  describe('Error handling', () => {
    it('Should be error with incorrect id format', async () => {
      const repository = new GlossaryRepository('pl');
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
      const repository = new GlossaryRepository('en');
      try {
        const getDoc = await repository.getDocumentById(TestHelpersClass.makeNotExistingId().toHexString());
        expect(getDoc).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(404);
        expect(err.message).toEqual(errorsMessages.itemNotFound);
      }
    });
    it('Should be error when jwtToken contains encrypted id which not exists in users collection', async () => {
      const repository = new GlossaryRepository('en', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
      try {
        const getDoc = await repository.getDocumentById(firstDocument!._id.toString());
        expect(getDoc).toThrowError();
      } catch (err) {
        expect(err.message).toEqual(errorsMessages.invalidToken);
        expect(err.code).toEqual(401);
      }
    });
    it('Should be not possible to query disabled document without authentication', async () => {
      const thirdDisabledUser = await TestHelpersClass.getSomeDisabledDocument(glossaryCollection, 2);
      const repository = new GlossaryRepository('en');
      try {
        const getDoc = await repository.getDocumentById(thirdDisabledUser!._id.toString());
        expect(getDoc).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(404);
        expect(err.message).toEqual(errorsMessages.itemNotFound);
      }
    });
  });
  describe('Validation returned object without jwtToken', () => {
    it('Should be proper object wit polish language', async () => {
      const repository = new GlossaryRepository('pl');
      const firstDoc = await TestHelpersClass.getFirstDocument(glossaryCollection);
      const firstCreator = await usersCollection.findOne({ _id: firstDoc!.creator });
      try {
        const getDoc = await repository.getDocumentById(firstDocument!._id.toString());
        expect(getDoc!._id).toEqual(firstDoc!._id);
        expect(getDoc!.abbreviation).toEqual(firstDoc!.abbreviation);
        expect(getDoc!.explication).toEqual(firstDoc!.explication);
        expect(getDoc!.phrase).toEqual(firstDoc!.phrase);
        expect(getDoc!.explanation).toEqual(firstDoc!.explanation.pl);
        expect(getDoc!.creator._id).toEqual(firstCreator!._id);
        expect(getDoc!.creator.firstName).toEqual(firstCreator!.firstName);
        expect(getDoc!.creator.lastName).toEqual(firstCreator!.lastName);
        expect(getDoc!.createdAt).toBeInstanceOf(Date);
        expect(getDoc!.updatedAt).toBeInstanceOf(Date);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be proper object wit polish language', async () => {
      const repository = new GlossaryRepository('en');
      const firstDoc = await TestHelpersClass.getFirstDocument(glossaryCollection);
      const firstCreator = await usersCollection.findOne({ _id: firstDoc!.creator });
      try {
        const getDoc = await repository.getDocumentById(firstDocument!._id.toString());
        expect(getDoc!._id).toEqual(firstDoc!._id);
        expect(getDoc!.abbreviation).toEqual(firstDoc!.abbreviation);
        expect(getDoc!.explication).toEqual(firstDoc!.explication);
        expect(getDoc!.phrase).toEqual(firstDoc!.phrase);
        expect(getDoc!.explanation).toEqual(firstDoc!.explanation.en);
        expect(getDoc!.creator._id).toEqual(firstCreator!._id);
        expect(getDoc!.creator.firstName).toEqual(firstCreator!.firstName);
        expect(getDoc!.creator.lastName).toEqual(firstCreator!.lastName);
        expect(getDoc!.createdAt).toBeInstanceOf(Date);
        expect(getDoc!.updatedAt).toBeInstanceOf(Date);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    describe('Validation returned object with jwtToken', () => {
      it('Should be proper object despite language', async () => {
        const firstDoc = await TestHelpersClass.getFirstDocument(glossaryCollection);
        const firstCreator = await usersCollection.findOne({ _id: firstDoc!.creator });
        for (const validLanguage of Object.keys(validLanguages)) {
          const repository = new GlossaryRepository(validLanguage, firstUserLogIn.jwtToken);
          try {
            const getDoc = await repository.getDocumentById(firstDocument._id.toString());
            expect(getDoc!._id).toEqual(firstDoc!._id);
            expect(getDoc!.abbreviation).toEqual(firstDoc!.abbreviation);
            expect(getDoc!.explication).toEqual(firstDoc!.explication);
            expect(getDoc!.phrase).toEqual(firstDoc!.phrase);
            expect(getDoc!.explanation).toEqual(firstDoc!.explanation);
            expect(getDoc!.creator._id).toEqual(firstCreator!._id);
            expect(getDoc!.creator.firstName).toEqual(firstCreator!.firstName);
            expect(getDoc!.creator.lastName).toEqual(firstCreator!.lastName);
            expect(getDoc!.createdAt).toBeInstanceOf(Date);
            expect(getDoc!.updatedAt).toBeInstanceOf(Date);
          } catch (err) {
            expect(err).toBeNull();
          }
        }
      });
    });
  });
});

describe('Querying paginated documents with \'getPaginatedDocuments\' method ', () => {
  describe('Error handling', () => {
    it('Should be error with page not integer', async () => {
      const repository = new GlossaryRepository('pl');
      try {
        const getDocs = await repository.getPaginatedDocuments(2.3, 3);
        expect(getDocs).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual(errorsMessages.noIntegerPage);
      }
    });
    it('Should be error with perPage not integer', async () => {
      const repository = new GlossaryRepository('pl');
      try {
        const getDocs = await repository.getPaginatedDocuments(3, 3.1);
        expect(getDocs).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual(errorsMessages.noIntegerPerPage);
      }
    });
    it('Should be error when page is bigger than total pages', async () => {
      const repository = new GlossaryRepository('pl');
      try {
        const getDocs = await repository.getPaginatedDocuments(300, 3);
        expect(getDocs).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(404);
        expect(err.message).toEqual(errorsMessages.itemsNotFound);
      }
    });
    it('Should be error when id encoded in jwtToken is not in users collection', async () => {
      const repository = new GlossaryRepository('pl', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
      try {
        const getDocs = await repository.getPaginatedDocuments(300, 3);
        expect(getDocs).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.invalidToken);
      }
    });
  });
  describe('Validation without jwtToken', () => {
    it('Should be only enable article types in list', async () => {
      const repository = new GlossaryRepository('en');
      const getDocs = await repository.getPaginatedDocuments(1, 130);
      expect(getDocs!.totalDocs).toEqual(totalEnabledDocumentsInCollection);
      expect(getDocs!.data.length).toEqual(totalEnabledDocumentsInCollection);
    });
    it('Should be returned proper object on not last page', async () => {
      // const totalEnabledDocs = await TestHelpersClass.getNumberOfEnabledDocumentsInCollection(articleTypesCollection);
      const page = 2;
      const perPage = 2;
      const repository = new GlossaryRepository('pl');
      try {
        const getDocs = await repository.getPaginatedDocuments(page, perPage);
        expect(getDocs!.data.length).toEqual(perPage);
        expect(getDocs!.docsOnPage).toEqual(perPage);
        expect(getDocs!.totalDocs).toEqual(totalEnabledDocumentsInCollection);
        expect(getDocs!.totalPages).toEqual(Math.ceil(totalEnabledDocumentsInCollection / perPage));
        expect(getDocs!.currentPage).toEqual(page);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be returned proper object on last page', async () => {
      const totalEnabledDocs = await TestHelpersClass.getNumberOfEnabledDocumentsInCollection(glossaryCollection);
      const page = 5;
      const perPage = 9;
      const repository = new GlossaryRepository('pl');
      const docsOnLastPage = totalEnabledDocs - (perPage * (page - 1));
      try {
        const getDocs = await repository.getPaginatedDocuments(page, perPage);
        expect(getDocs!.data.length).toEqual(docsOnLastPage);
        expect(getDocs!.docsOnPage).toEqual(docsOnLastPage);
        expect(getDocs!.totalDocs).toEqual(totalEnabledDocs);
        expect(getDocs!.totalPages).toEqual(Math.ceil(totalEnabledDocs / perPage));
        expect(getDocs!.currentPage).toEqual(page);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be returned proper objects in data array', async () => {
      for (const validLanguage of Object.keys(validLanguages)) {
        const page = 1;
        const perPage = 1;
        const repository = new GlossaryRepository(validLanguage);
        const firstDocCreator = await usersCollection.findOne({ _id: firstDocument!.creator });
        try {
          const getDocs = await repository.getPaginatedDocuments(page, perPage);
          expect(getDocs!.data[0].abbreviation).toEqual(firstDocument!.abbreviation);
          expect(getDocs!.data[0].explication).toEqual(firstDocument!.explication);
          expect(getDocs!.data[0].phrase).toEqual(firstDocument!.phrase);
          expect(getDocs!.data[0].explanation).toEqual(firstDocument!.explanation[validLanguage].substr(0, 250));
          expect(getDocs!.data[0].createdAt).toEqual(firstDocument!.createdAt);
          expect(getDocs!.data[0].updatedAt).toEqual(firstDocument!.updatedAt);
          expect(getDocs!.data[0].creator._id).toEqual(firstDocCreator!._id);
          expect(getDocs!.data[0].creator.firstName).toEqual(firstDocCreator!.firstName);
          expect(getDocs!.data[0].creator.lastName).toEqual(firstDocCreator!.lastName);
        } catch (err) {
          expect(err).toBeNull();
        }
      }
    });
  });
  describe('Validation with jwtToken', () => {
    it('Should be only enable article types in list', async () => {
      const repository = new GlossaryRepository('en', firstUserLogIn.jwtToken);
      const getDocs = await repository.getPaginatedDocuments(1, 130);
      expect(getDocs!.totalDocs).toEqual(totalDocumentsInCollection);
      expect(getDocs!.data.length).toEqual(totalDocumentsInCollection);
    });
    it('Should be returned proper object on not last page', async () => {
      const page = 2;
      const perPage = 2;
      const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
      try {
        const getDocs = await repository.getPaginatedDocuments(page, perPage);
        expect(getDocs!.data.length).toEqual(perPage);
        expect(getDocs!.docsOnPage).toEqual(perPage);
        expect(getDocs!.totalDocs).toEqual(totalDocumentsInCollection);
        expect(getDocs!.totalPages).toEqual(Math.ceil(totalDocumentsInCollection / perPage));
        expect(getDocs!.currentPage).toEqual(page);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be returned proper object on last page', async () => {
      const page = 6;
      const perPage = 9;
      const repository = new GlossaryRepository('pl', firstUserLogIn.jwtToken);
      const docsOnLastPage = totalDocumentsInCollection - (perPage * (page - 1));
      try {
        const getDocs = await repository.getPaginatedDocuments(page, perPage);
        expect(getDocs!.data.length).toEqual(docsOnLastPage);
        expect(getDocs!.docsOnPage).toEqual(docsOnLastPage);
        expect(getDocs!.totalDocs).toEqual(totalDocumentsInCollection);
        expect(getDocs!.totalPages).toEqual(Math.ceil(totalDocumentsInCollection / perPage));
        expect(getDocs!.currentPage).toEqual(page);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be returned proper objects in data array', async () => {
      for (const validLanguage of Object.keys(validLanguages)) {
        const page = 1;
        const perPage = 1;
        const repository = new GlossaryRepository(validLanguage, firstUserLogIn.jwtToken);
        const firstDocCreator = await usersCollection.findOne({ _id: firstDocument!.creator });
        try {
          const getDocs = await repository.getPaginatedDocuments(page, perPage);
          expect(getDocs!.data[0].abbreviation).toEqual(firstDocument!.abbreviation);
          expect(getDocs!.data[0].explication).toEqual(firstDocument!.explication);
          expect(getDocs!.data[0].phrase).toEqual(firstDocument!.phrase);
          expect(getDocs!.data[0].isEnabled).toEqual(firstDocument!.isEnabled);
          expect(getDocs!.data[0].explanation).toEqual(firstDocument!.explanation[validLanguage].substr(0, 250));
          expect(getDocs!.data[0].createdAt).toEqual(firstDocument!.createdAt);
          expect(getDocs!.data[0].updatedAt).toEqual(firstDocument!.updatedAt);
          expect(getDocs!.data[0].creator._id).toEqual(firstDocCreator!._id);
          expect(getDocs!.data[0].creator.firstName).toEqual(firstDocCreator!.firstName);
          expect(getDocs!.data[0].creator.lastName).toEqual(firstDocCreator!.lastName);
        } catch (err) {
          expect(err).toBeNull();
        }
      }
    });
  });
});

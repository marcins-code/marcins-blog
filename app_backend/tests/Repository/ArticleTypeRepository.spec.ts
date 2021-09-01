import { Collection, MongoClient, ObjectId } from 'mongodb';
import { Request } from 'express';
import { connectionOptions, uri } from '../../src/Utils/dbConnection';
import ArticleTypeRepository from '../../src/Repository/ArticleTypeRepository';
import UserRepository from '../../src/Repository/UserRepository';
import { errorsMessages } from '../../src/Validator/ErrorMessages';
import { initialUsersSet, invalidIdFormats } from '../utils/usersExampleData';
import TestHelpersClass from '../utils/TestHelpersClass';
import Authentication from '../../src/Repository/Authentication';
import { loginTypes } from '../../src/Interfaces/CustomTypes';
import * as faker from 'faker';
import { validLanguages } from '../../src/Interfaces/Enums';

// TODO remove ts-ignore

let connection: MongoClient;
let usersCollection: Collection;
let articleTypesCollection: Collection;

// LogInn users for tests for
let firstUserLogIn: loginTypes;
let adminLogin: any;
let superAdminLogin: any;

// documents count
let totalDocumentsInCollection: number;
// @ts-ignore
let totalEnabledDocumentsInCollection: number;

let articleTypeForTests: any;
let articleTypeForTestsToUpdate: any;
let firstDocument: any;
let lastDocument: any;

beforeAll(async () => {
  // connection
  connection = await MongoClient.connect(uri, connectionOptions);

  // injection db
  await Authentication.injectDB(connection);
  await UserRepository.injectDB(connection);
  await ArticleTypeRepository.injectDB(connection);

  // collections
  usersCollection = await connection.db('tests').collection('users');
  articleTypesCollection = await connection.db('tests').collection('articleTypes');

  // checking users collection amd seed data if necessary
  await TestHelpersClass.checkAndPrepareUsersCollection(usersCollection, initialUsersSet);
  await TestHelpersClass.checkAndPrepareArticleTypesCollection(articleTypesCollection, usersCollection);

  // logIn users with different roles
  firstUserLogIn = await TestHelpersClass.getFirstUserAndLogin(usersCollection);
  adminLogin = await TestHelpersClass.getFirstAdminAndLogin(usersCollection);
  superAdminLogin = await TestHelpersClass.getFirstSuperAdminAndLogin(usersCollection);

  // documents count
  totalDocumentsInCollection = await TestHelpersClass.getNumberOfDocumentsInCollection(articleTypesCollection);
  totalEnabledDocumentsInCollection = await TestHelpersClass.getNumberOfEnabledDocumentsInCollection(articleTypesCollection);

  // existing objects
  firstDocument = await TestHelpersClass.getFirstDocument(articleTypesCollection);
  lastDocument = await TestHelpersClass.getSomeDocument(articleTypesCollection, 10);

  // objects to insert or update
  const makeArticleTypeForTests = await TestHelpersClass.makeArticleTypeForTest(usersCollection);
  const makeArticleTypeForTestsToUpdate = await TestHelpersClass.makeArticleTypeForTest(usersCollection);
  articleTypeForTests = { body: { ...makeArticleTypeForTests } };
  articleTypeForTestsToUpdate = { body: { ...makeArticleTypeForTestsToUpdate } };
});

describe('Error handling threw by repository instance\'', () => {
  it('Should be error with invalid LANGUAGE', async () => {
    const incorrectLangs = ['de', 'fr', 'be'];
    for (const incorrectLang of incorrectLangs) {
      try {
        const repository = new ArticleTypeRepository(incorrectLang);
        expect(repository).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual(errorsMessages.invalidLang);
      }
    }
  });
  it('Should be error with invalid token', async () => {
    try {
      const repository = new ArticleTypeRepository('pl', TestHelpersClass.makeInvalidToken());
      expect(repository).toThrowError();
    } catch (err) {
      expect(err.message).toEqual(errorsMessages.invalidToken);
      expect(err.code).toEqual(401);
    }
  });
  it('Should be error with invalid id format encoded in jwtToken', async () => {
    const wrongToken = TestHelpersClass.makeJwtTokenWithNotCorrectIdFormat();
    try {
      const repository = new ArticleTypeRepository('pl', wrongToken);
      expect(repository).toThrowError();
    } catch (err) {
      expect(err.message).toEqual(errorsMessages.invalidToken);
      expect(err.code).toEqual(401);
    }
  });
});

describe('Creating new document', () => {
  describe('Error handling', () => {
    describe('Authentication errors', () => {
      it('Should be error without jwtToken', async () => {
        const repository = new ArticleTypeRepository('pl');
        try {
          const newArType = await repository.createDocument(articleTypeForTests as Request);
          expect(newArType).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(401);
          expect(err.message).toEqual(errorsMessages.missingAuthorization);
        }
      });
      it('Should be error if id encoded in jwtToken not exists in users collection', async () => {
        const repository = new ArticleTypeRepository('pl', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
        try {
          const newArType = await repository.createDocument(articleTypeForTests as Request);
          expect(newArType).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(401);
          expect(err.message).toEqual(errorsMessages.invalidToken);
        }
      });
    });
    describe('Given fields validation', () => {
      describe('Name field', () => {
        it('Should be error when name is missing', async () => {
          delete articleTypeForTests.body.name;
          const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newArType = await repository.createDocument(articleTypeForTests as Request);
            expect(newArType).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTypeNameRequired);
          }
        });
        it('Should be error when name is too short', async () => {
          articleTypeForTests.body.name = 'D';
          const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newArType = await repository.createDocument(articleTypeForTests as Request);
            expect(newArType).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTypeNameTooShort);
          }
        });
        it('Should be error when name is too long', async () => {
          articleTypeForTests.body.name = faker.lorem.sentence(10);
          const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newArType = await repository.createDocument(articleTypeForTests as Request);
            expect(newArType).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTypeNameTooLong);
          }
        });
      });
      describe('Type field', () => {
        it('Should be error when type field is missing', async () => {
          articleTypeForTests.body.name = 'Docker';
          delete articleTypeForTests.body.type;
          const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newArType = await repository.createDocument(articleTypeForTests as Request);
            expect(newArType).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTypeTypeRequired);
          }
        });
        it('Should be error when is not category or serie', async () => {
          articleTypeForTests.body.type = 'jakiśTam';
          const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newAType = await repository.createDocument(articleTypeForTests as Request);
            expect(newAType).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTypeValidTypes);
          }
        });
      });
      describe('Icon field', () => {
        it('Should be error when icon field is missing ', async () => {
          articleTypeForTests.body.type = 'category';
          delete articleTypeForTests.body.icon;
          const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newAType = await repository.createDocument(articleTypeForTests as Request);
            expect(newAType).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTypeIconRequired);
          }
        });
      });
      describe('Name should be unique in type', () => {
        it('Should be error when name already exists in type', async () => {
          articleTypeForTests.body.icon = 'fa coś tam';
          articleTypeForTests.body.name = firstDocument!.name;
          const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newAType = await repository.createDocument(articleTypeForTests as Request);
            expect(newAType).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.suchNameInTypeExists);
          }
        });
      });
    });
  });
  describe('Validation response and inserted document', () => {
    it('Should be proper response', async () => {
      articleTypeForTests.body.name = 'Docker';
      const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
      try {
        const newAType = await repository.createDocument(articleTypeForTests as Request);
        expect(newAType.acknowledged).toEqual(true);
        expect(newAType.insertedId).toBeInstanceOf(ObjectId);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be one document more in collection', async () => {
      const docsQtyAfterInsert = await articleTypesCollection.countDocuments();
      expect(docsQtyAfterInsert).toEqual(totalDocumentsInCollection + 1);
    });
    it('Should be proper inserted document structure', async () => {
      const lastDocs = await articleTypesCollection.findOne({}, { skip: 10 });
      expect(lastDocs!.name).toEqual(articleTypeForTests.body.name);
      expect(lastDocs!.type).toEqual(articleTypeForTests.body.type);
      expect(lastDocs!.icon).toEqual(articleTypeForTests.body.icon);
      expect(lastDocs!.isEnabled).toEqual(articleTypeForTests.body.isEnabled);
      expect(lastDocs!.description).toEqual(articleTypeForTests.body.description);
      expect(lastDocs!.creator.toString()).toEqual(firstUserLogIn._id);
      expect(lastDocs!.createdAt).toBeInstanceOf(Date);
      expect(lastDocs!.updatedAt).toBeInstanceOf(Date);
    });
  });
});

describe('Updating  document', () => {
  describe('Error handling', () => {
    describe('Credentials and id errors', () => {
      it('Should be error without jwtToken', async () => {
        const repository = new ArticleTypeRepository('pl');
        try {
          const updateArType = await repository.updateDocument(TestHelpersClass.makeInvalidToken(), articleTypeForTestsToUpdate as Request);
          expect(updateArType).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(401);
          expect(err.message).toEqual(errorsMessages.missingAuthorization);
        }
      });
      it('Should be error with invalid id format', async () => {
        const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
        for (const invalidIdFormat of invalidIdFormats) {
          try {
            const updateArType = await repository.updateDocument(invalidIdFormat, articleTypeForTestsToUpdate as Request);
            expect(updateArType).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.invalidIdFormat);
          }
        }
      });
      it('Should be error if given id not exist in collection', async () => {
        const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
        try {
          const updateArType = await repository.updateDocument(
            TestHelpersClass.makeNotExistingId().toHexString(),
            articleTypeForTestsToUpdate as Request
          );
          expect(updateArType).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(422);
          expect(err.message).toEqual(errorsMessages.invalidId);
        }
      });
      it('Should be error if encoded in jwtToken id does not exists in user collection', async () => {
        const repository = new ArticleTypeRepository('pl', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
        try {
          const newArType = await repository.updateDocument(firstDocument._id.toString(), articleTypeForTests as Request);
          expect(newArType).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(401);
          expect(err.message).toEqual(errorsMessages.invalidToken);
        }
      });
    });
    describe('Given fields validation', () => {
      describe('Name field update', () => {
        it('Should be error when name is missing', async () => {
          lastDocument = await TestHelpersClass.getSomeDocument(articleTypesCollection, 10);
          delete articleTypeForTestsToUpdate.body.name;
          const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newArType = await repository.updateDocument(lastDocument._id.toString(), articleTypeForTestsToUpdate as Request);
            expect(newArType).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTypeNameRequired);
          }
        });
        it('Should be error when name is too short', async () => {
          articleTypeForTestsToUpdate.body.name = 'D';
          const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newArType = await repository.updateDocument(firstDocument._id.toString(), articleTypeForTestsToUpdate as Request);
            expect(newArType).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTypeNameTooShort);
          }
        });
        it('Should be error when name is too long', async () => {
          articleTypeForTestsToUpdate.body.name = faker.lorem.sentence(10);
          const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newArType = await repository.updateDocument(firstDocument._id.toString(), articleTypeForTestsToUpdate as Request);
            expect(newArType).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTypeNameTooLong);
          }
        });
      });
      describe('Type field update', () => {
        it('Should be error when type field is missing', async () => {
          articleTypeForTestsToUpdate.body.name = 'Docker';
          delete articleTypeForTestsToUpdate.body.type;
          const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newArType = await repository.updateDocument(firstDocument._id.toString(), articleTypeForTestsToUpdate as Request);
            expect(newArType).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTypeTypeRequired);
          }
        });
        it('Should be error when is not category or serie', async () => {
          articleTypeForTestsToUpdate.body.type = 'jakiśTam';
          const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newAType = await repository.updateDocument(firstDocument._id.toString(), articleTypeForTestsToUpdate as Request);
            expect(newAType).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTypeValidTypes);
          }
        });
      });
      describe('Icon field', () => {
        it('Should be error when icon field is missing ', async () => {
          articleTypeForTestsToUpdate.body.type = 'category';
          delete articleTypeForTestsToUpdate.body.icon;
          const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newAType = await repository.updateDocument(firstDocument._id.toString(), articleTypeForTestsToUpdate as Request);
            expect(newAType).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTypeIconRequired);
          }
        });
      });
      describe('Name should be unique in type', () => {
        it('Should be error when name already exists in type', async () => {
          articleTypeForTestsToUpdate.body.icon = 'fa coś tam';
          // articleTypeForTestsToUpdate.body.creator
          articleTypeForTestsToUpdate.body.name = firstDocument!.name;
          const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newArType = await repository.updateDocument(lastDocument._id.toString(), articleTypeForTestsToUpdate as Request);
            expect(newArType).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.suchNameInTypeExists);
          }
        });
      });
    });
  });
  describe('Updating without Admin privilege', () => {
    it('Should be not possible to update when not creator is logged', async () => {
      const someDoc = await TestHelpersClass.getSomeDocument(articleTypesCollection, 5);
      const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
      try {
        const updateArticleT = await repository.updateDocument(someDoc!._id.toString(), articleTypeForTests as Request);
        expect(updateArticleT).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.notAuthorized);
      }
    });
    it('Should be possible to update when login user is creator', async () => {
      articleTypeForTestsToUpdate.body.name = 'symfony2';
      const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
      try {
        const newAType = await repository.updateDocument(lastDocument._id.toString(), articleTypeForTestsToUpdate as Request);
        expect(newAType.acknowledged).toEqual(true);
        expect(newAType.matchedCount).toEqual(1);
        expect(newAType.upsertedCount).toEqual(0);
        expect(newAType.upsertedId).toEqual(null);
        expect(newAType.modifiedCount).toEqual(1);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be updated document', async () => {
      lastDocument = await TestHelpersClass.getSomeDocument(articleTypesCollection, 10);
      expect(lastDocument.name).toEqual(articleTypeForTestsToUpdate.body.name);
      expect(lastDocument.type).toEqual(articleTypeForTestsToUpdate.body.type);
      expect(lastDocument.icon).toEqual(articleTypeForTestsToUpdate.body.icon);
      expect(lastDocument.isEnabled).toEqual(articleTypeForTestsToUpdate.body.isEnabled);
      expect(lastDocument.description).toEqual(articleTypeForTestsToUpdate.body.description);
      expect(lastDocument.creator.toString()).toEqual(firstUserLogIn._id);
    });
  });
  describe('Updating without Admin privilege', () => {
    it('Should be possible to update as admin', async () => {
      lastDocument = await TestHelpersClass.getSomeDocument(articleTypesCollection, 10);
      const repository = new ArticleTypeRepository('pl', adminLogin.jwtToken);
      try {
        const newAType = await repository.updateDocument(lastDocument._id.toString(), articleTypeForTests as Request);
        expect(newAType.acknowledged).toEqual(true);
        expect(newAType.matchedCount).toEqual(1);
        expect(newAType.upsertedCount).toEqual(0);
        expect(newAType.upsertedId).toEqual(null);
        expect(newAType.modifiedCount).toEqual(1);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be updated document', async () => {
      lastDocument = await TestHelpersClass.getSomeDocument(articleTypesCollection, 10);
      expect(lastDocument.name).toEqual(articleTypeForTests.body.name);
      expect(lastDocument.type).toEqual(articleTypeForTests.body.type);
      expect(lastDocument.icon).toEqual(articleTypeForTests.body.icon);
      expect(lastDocument.isEnabled).toEqual(articleTypeForTests.body.isEnabled);
      expect(lastDocument.description).toEqual(articleTypeForTests.body.description);
      expect(lastDocument.creator.toString()).toEqual(firstUserLogIn._id);
    });
  });
});

describe('Enabling/Disabling document', () => {
  describe('Errors handling', () => {
    it('Should be error without jwtToken', async () => {
      const repository = new ArticleTypeRepository('pl');
      try {
        const changeStatus = await repository.updateStatus(firstDocument._id.toString(), false);
        expect(changeStatus).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.missingAuthorization);
      }
    });
    it('Should be error with invalid id format', async () => {
      const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
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
      const repository = new ArticleTypeRepository('en', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
      try {
        const changeStatus = await repository.updateStatus(firstDocument._id.toString(), true);
        expect(changeStatus).toThrowError();
      } catch (err) {
        expect(err.message).toEqual(errorsMessages.invalidToken);
        expect(err.code).toEqual(401);
      }
    });
    it('Should be error if given id not exist in collection', async () => {
      const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
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
      const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
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
      const changedUser = await TestHelpersClass.getFirstDocument(articleTypesCollection);
      expect(changedUser!.isEnabled).toEqual(!firstDocument.isEnabled);
    });
    it('Should be not possible to change another document status', async () => {
      const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
      const someDoc = await TestHelpersClass.getSomeDocument(articleTypesCollection, 7);
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
      const repository = new ArticleTypeRepository('pl', adminLogin.jwtToken);
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
      const changedUser = await TestHelpersClass.getFirstDocument(articleTypesCollection);
      expect(changedUser!.isEnabled).toEqual(firstDocument.isEnabled);
    });
  });
});

describe('Deleting document', () => {
  describe('Handling errors errors', () => {
    it('Should be error without jwtToken', async () => {
      const repository = new ArticleTypeRepository('pl');
      try {
        const deleteDocument = await repository.deleteDocument(firstDocument._id.toString());
        expect(deleteDocument).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.missingAuthorization);
      }
    });
    it('Should be error with invalid id format', async () => {
      const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
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
      const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
      try {
        const changeStatus = await repository.deleteDocument(TestHelpersClass.makeNotExistingId().toHexString());
        expect(changeStatus).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual(errorsMessages.invalidId);
      }
    });
    it('Should be not possible to delete without SUPERADMIN privilege', async () => {
      const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
      try {
        const deleteUser = await repository.deleteDocument(firstDocument!._id.toString());
        expect(deleteUser).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.notSuperAdmin);
      }
    });
    it('Should be error when jwtToken contains encrypted id which not exists in users collection', async () => {
      const repository = new ArticleTypeRepository('en', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
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
      const repository = new ArticleTypeRepository('pl', superAdminLogin.jwtToken);
      const lastDoc = await TestHelpersClass.getSomeDocument(articleTypesCollection, totalDocumentsInCollection);
      try {
        const deleteUser = await repository.deleteDocument(lastDoc!._id.toString());
        expect(deleteUser.acknowledged).toEqual(true);
        expect(deleteUser.deletedCount).toEqual(1);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be one document less in collection', async () => {
      const currentTotalDocuments = await TestHelpersClass.getNumberOfDocumentsInCollection(articleTypesCollection);
      expect(currentTotalDocuments).toEqual(totalDocumentsInCollection);
    });
  });
});

describe('Querying single document', () => {
  describe('Error handling', () => {
    it('Should be error with incorrect id format', async () => {
      const repository = new ArticleTypeRepository('pl');
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
      const repository = new ArticleTypeRepository('en');
      try {
        const getDoc = await repository.getDocumentById(TestHelpersClass.makeNotExistingId().toHexString());
        expect(getDoc).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(404);
        expect(err.message).toEqual(errorsMessages.articleTypeNotFound);
      }
    });
    it('Should be error when jwtToken contains encrypted id which not exists in users collection', async () => {
      const repository = new ArticleTypeRepository('en', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
      try {
        const getDoc = await repository.getDocumentById(firstDocument!._id.toString());
        expect(getDoc).toThrowError();
      } catch (err) {
        expect(err.message).toEqual(errorsMessages.invalidToken);
        expect(err.code).toEqual(401);
      }
    });
    it('Should be not possible to query disabled document without authentication', async () => {
      const thirdDisabledUser = await TestHelpersClass.getSomeDisabledDocument(articleTypesCollection, 2);
      const repository = new ArticleTypeRepository('en');
      try {
        const getDoc = await repository.getDocumentById(thirdDisabledUser!._id.toString());
        expect(getDoc).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(404);
        expect(err.message).toEqual(errorsMessages.articleTypeNotFound);
      }
    });
  });
  describe('Validation returned object without jwtToken', () => {
    it('Should be proper object wit polish language', async () => {
      const repository = new ArticleTypeRepository('pl');
      const firstDoc = await TestHelpersClass.getFirstDocument(articleTypesCollection);
      const firstCreator = await usersCollection.findOne({ _id: firstDoc!.creator });
      try {
        const getDoc = await repository.getDocumentById(firstDocument!._id.toString());
        expect(getDoc!._id).toEqual(firstDoc!._id);
        expect(getDoc!.name).toEqual(firstDoc!.name);
        expect(getDoc!.type).toEqual(firstDoc!.type);
        expect(getDoc!.icon).toEqual(firstDoc!.icon);
        expect(getDoc!.description).toEqual(firstDoc!.description.pl);
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
      const repository = new ArticleTypeRepository('en');
      const firstDoc = await TestHelpersClass.getFirstDocument(articleTypesCollection);
      const firstCreator = await usersCollection.findOne({ _id: firstDoc!.creator });
      try {
        const getDoc = await repository.getDocumentById(firstDocument!._id.toString());
        expect(getDoc!._id).toEqual(firstDoc!._id);
        expect(getDoc!.name).toEqual(firstDoc!.name);
        expect(getDoc!.type).toEqual(firstDoc!.type);
        expect(getDoc!.icon).toEqual(firstDoc!.icon);
        expect(getDoc!.description).toEqual(firstDoc!.description.en);
        expect(getDoc!.creator._id).toEqual(firstCreator!._id);
        expect(getDoc!.creator.firstName).toEqual(firstCreator!.firstName);
        expect(getDoc!.creator.lastName).toEqual(firstCreator!.lastName);
        expect(getDoc!.createdAt).toBeInstanceOf(Date);
        expect(getDoc!.updatedAt).toBeInstanceOf(Date);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
  });
  describe('Validation returned object with jwtToken', () => {
    it('Should be proper object despite language', async () => {
      const firstDoc = await TestHelpersClass.getFirstDocument(articleTypesCollection);
      const firstCreator = await usersCollection.findOne({ _id: firstDoc!.creator });
      for (const validLanguage of Object.keys(validLanguages)) {
        const repository = new ArticleTypeRepository(validLanguage, firstUserLogIn.jwtToken);
        try {
          const getDoc = await repository.getDocumentById(firstDocument._id.toString());
          expect(getDoc!._id).toEqual(firstDoc!._id);
          expect(getDoc!.name).toEqual(firstDoc!.name);
          expect(getDoc!.type).toEqual(firstDoc!.type);
          expect(getDoc!.icon).toEqual(firstDoc!.icon);
          expect(getDoc!.description).toEqual(firstDoc!.description);
          expect(getDoc!.creator._id).toEqual(firstDoc!.creator);
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

describe('Querying paginated documents with \'getPaginatedDocuments\' method ', () => {
  describe('Error handling', () => {
    it('Should be error with page not integer', async () => {
      const repository = new ArticleTypeRepository('pl');
      try {
        const getDocs = await repository.getPaginatedDocuments(2.3, 3);
        expect(getDocs).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual(errorsMessages.noIntegerPage);
      }
    });
    it('Should be error with perPage not integer', async () => {
      const repository = new ArticleTypeRepository('pl');
      try {
        const getDocs = await repository.getPaginatedDocuments(3, 3.1);
        expect(getDocs).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual(errorsMessages.noIntegerPerPage);
      }
    });
    it('Should be error when page is bigger than total pages', async () => {
      const repository = new ArticleTypeRepository('pl');
      try {
        const getDocs = await repository.getPaginatedDocuments(300, 3);
        expect(getDocs).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(404);
        expect(err.message).toEqual(errorsMessages.itemsNotFound);
      }
    });
    it('Should be error when id encoded in jwtToken is not in users collection', async () => {
      const repository = new ArticleTypeRepository('pl', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
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
      const repository = new ArticleTypeRepository('en');
      // const totalEnabledDocs = await TestHelpersClass.getNumberOfEnabledDocumentsInCollection(articleTypesCollection);
      const getDocs = await repository.getPaginatedDocuments(1, 30);
      expect(getDocs!.totalDocs).toEqual(totalEnabledDocumentsInCollection);
      expect(getDocs!.data.length).toEqual(totalEnabledDocumentsInCollection);
    });
    it('Should be returned proper object on not last page', async () => {
      // const totalEnabledDocs = await TestHelpersClass.getNumberOfEnabledDocumentsInCollection(articleTypesCollection);
      const page = 2;
      const perPage = 2;
      const repository = new ArticleTypeRepository('pl');
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
      const totalEnabledDocs = await TestHelpersClass.getNumberOfEnabledDocumentsInCollection(articleTypesCollection);
      const page = 3;
      const perPage = 2;
      const repository = new ArticleTypeRepository('pl');
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
        const repository = new ArticleTypeRepository(validLanguage);
        try {
          const getDocs = await repository.getPaginatedDocuments(page, perPage);
          expect(getDocs!.data[0].name).toEqual(firstDocument!.name);
          expect(getDocs!.data[0].type).toEqual(firstDocument!.type);
          expect(getDocs!.data[0].icon).toEqual(firstDocument!.icon);
          expect(getDocs!.data[0].description).toEqual(firstDocument!.description[validLanguage]);
          expect(getDocs!.data[0].createdAt).toEqual(firstDocument!.createdAt);
          expect(getDocs!.data[0].updatedAt).toEqual(firstDocument!.updatedAt);
          expect(typeof getDocs!.data[0].creator.firstName).toEqual('string');
          expect(typeof getDocs!.data[0].creator.lastName).toEqual('string');
        } catch (err) {
          expect(err).toBeNull();
        }
      }
    });
  });

  describe('Validation with jwtToken', () => {
    it('Should be all article types in list', async () => {
      const repository = new ArticleTypeRepository('en', firstUserLogIn.jwtToken);
      const getDocs = await repository.getPaginatedDocuments(1, 130);
      expect(getDocs!.totalDocs).toEqual(totalDocumentsInCollection);
      expect(getDocs!.data.length).toEqual(totalDocumentsInCollection);
    });
    it('Should be returned proper objects in data array', async () => {
      const page = 1;
      const perPage = 1;
      for (const validLanguage of Object.keys(validLanguages)) {
        const repository = new ArticleTypeRepository(validLanguage, firstUserLogIn.jwtToken);
        try {
          const getDocs = await repository.getPaginatedDocuments(page, perPage);
          expect(getDocs!.data[0].name).toEqual(firstDocument!.name);
          expect(getDocs!.data[0].type).toEqual(firstDocument!.type);
          expect(getDocs!.data[0].icon).toEqual(firstDocument!.icon);
          expect(getDocs!.data[0].isEnabled).toEqual(firstDocument!.isEnabled);
          expect(getDocs!.data[0].description).toEqual(firstDocument!.description[validLanguage]);
          expect(getDocs!.data[0].createdAt).toEqual(firstDocument!.createdAt);
          expect(getDocs!.data[0].updatedAt).toEqual(firstDocument!.updatedAt);
          expect(typeof getDocs!.data[0].creator.firstName).toEqual('string');
          expect(typeof getDocs!.data[0].creator.lastName).toEqual('string');
        } catch (err) {
          expect(err).toBeNull();
        }
      }
    });
  });
});

import UserRepository from '../../src/Repository/UserRepository';
import Authentication from '../../src/Repository/Authentication';
import { errorsMessages } from '../../src/Validator/ErrorMessages';
import { initialUsersSet, invalidIdFormats } from '../utils/usersExampleData';
import TestHelpersClass from '../utils/TestHelpersClass';
import ArticleRepository from '../../src/Repository/ArticleRepository';
import { Collection, MongoClient, ObjectId } from 'mongodb';
import { connectionOptions, dbName, uri } from '../../src/Utils/dbConnection';
import ArticleTypeRepository from '../../src/Repository/ArticleTypeRepository';
import { loginTypes } from '../../src/Interfaces/CustomTypes';
import { Request } from 'express';
import * as faker from 'faker';
// TODO remove ts-ignore

// @ts-ignore
let connection: MongoClient;
let usersCollection: Collection;
// @ts-ignore
let articlesCollection: Collection;
// @ts-ignore
let articleTypesCollection: Collection;

// LogInn users for tests for
// @ts-ignore
let firstUserLogIn: loginTypes;
// @ts-ignore
let adminLogin: loginTypes;
// @ts-ignore
let superAdminLogin: loginTypes;

// documents count
// @ts-ignore
let totalDocumentsInCollection: number;
// @ts-ignore
let totalEnabledDocumentsInCollection:number;

let articleForTests: any;
let articleForTestsToUpdate:any;
let firstDocument: any;
beforeAll(async () => {
  // connection
  connection = await MongoClient.connect(uri, connectionOptions);

  // injection db
  await Authentication.injectDB(connection);
  await ArticleRepository.injectDB(connection);
  await UserRepository.injectDB(connection);
  await ArticleTypeRepository.injectDB(connection);

  // collections
  articlesCollection = await connection.db(dbName).collection('articles');
  usersCollection = await connection.db(dbName).collection('users');
  articleTypesCollection = await connection.db(dbName).collection('articleTypes');

  // checking users collection amd seed data if necessary
  await TestHelpersClass.checkAndPrepareUsersCollection(usersCollection, initialUsersSet);
  await TestHelpersClass.checkAndPrepareArticleTypesCollection(articleTypesCollection, usersCollection);
  await TestHelpersClass.checkAndPrepareArticlesCollection(articlesCollection, usersCollection, articleTypesCollection);

  // logIn users with different roles
  firstUserLogIn = await TestHelpersClass.getFirstUserAndLogin(usersCollection);
  adminLogin = await TestHelpersClass.getFirstAdminAndLogin(usersCollection);
  superAdminLogin = await TestHelpersClass.getFirstSuperAdminAndLogin(usersCollection);

  // documents count
  totalDocumentsInCollection = await TestHelpersClass.getNumberOfDocumentsInCollection(articlesCollection);
  totalEnabledDocumentsInCollection = await TestHelpersClass.getNumberOfEnabledDocumentsInCollection(articlesCollection);

  // objects to insert or update
  const makeArticleForTests = await TestHelpersClass.makeArticleForTest(usersCollection, articleTypesCollection);
  articleForTests = { body: { ...makeArticleForTests } };
  const makeArticleForTestsToUpdate = await TestHelpersClass.makeArticleForTest(usersCollection, articleTypesCollection);
  articleForTestsToUpdate = { body: { ...makeArticleForTestsToUpdate } };

  // objects to compare
  firstDocument = await TestHelpersClass.getFirstDocument(articlesCollection);
});

describe('Error handling threw by repository instance', () => {
  it('Should be error with invalid LANGUAGE', async () => {
    const incorrectLangs = ['de', 'fr', 'be'];
    for (const incorrectLang of incorrectLangs) {
      try {
        const repository = new ArticleRepository(incorrectLang);
        expect(repository).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual(errorsMessages.invalidLang);
      }
    }
  });
  it('Should be error with invalid token', async () => {
    try {
      const repository = new ArticleRepository('pl', TestHelpersClass.makeInvalidToken());
      expect(repository).toThrowError();
    } catch (err) {
      expect(err.message).toEqual(errorsMessages.invalidToken);
      expect(err.code).toEqual(401);
    }
  });
  it('Should be error with invalid id format encoded in jwtToken', async () => {
    const wrongToken = TestHelpersClass.makeJwtTokenWithNotCorrectIdFormat();
    try {
      const repository = new ArticleRepository('pl', wrongToken);
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
        const repository = new ArticleRepository('pl');
        try {
          const newArticle = await repository.createDocument(articleForTests as Request);
          expect(newArticle).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(401);
          expect(err.message).toEqual(errorsMessages.missingAuthorization);
        }
      });
      it('Should be error if id encoded in jwtToken not exists in users collection', async () => {
        const repository = new ArticleRepository('pl', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
        try {
          const newArticle = await repository.createDocument(articleForTests as Request);
          expect(newArticle).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(401);
          expect(err.message).toEqual(errorsMessages.invalidToken);
        }
      });
    });
    describe('Given fields validation', () => {
      describe('Polish title', () => {
        it('Should error when polish title is missing', async () => {
          delete articleForTests.body.titlePl;
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newArticle = await repository.createDocument(articleForTests as Request);
            expect(newArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.polishTitleIsRequired);
          }
        });
        it('Should error when polish title is to short', async () => {
          articleForTests.body.titlePl = 'coś';
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newArticle = await repository.createDocument(articleForTests as Request);
            expect(newArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTitleTooShort);
          }
        });
        it('Should error when polish title is to long', async () => {
          articleForTests.body.titlePl = faker.lorem.words(200);
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newArticle = await repository.createDocument(articleForTests as Request);
            expect(newArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTitleTooLong);
          }
        });
      });
      describe('English title', () => {
        it('Should error when english title is too short', async () => {
          articleForTests.body.titlePl = faker.lorem.words(10);
          articleForTests.body.titleEn = 'some';
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newArticle = await repository.createDocument(articleForTests as Request);
            expect(newArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTitleTooShort);
          }
        });
        it('Should error when english title is too long', async () => {
          articleForTests.body.titleEn = faker.lorem.words(200);
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newArticle = await repository.createDocument(articleForTests as Request);
            expect(newArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTitleTooLong);
          }
        });
      });
      describe('Type field', () => {
        it('Should error whe type field is missing', async () => {
          articleForTests.body.titleEn = faker.lorem.words(6);
          delete articleForTests.body.articleType;
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newArticle = await repository.createDocument(articleForTests as Request);
            expect(newArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTypeIsRequired);
          }
        });
        it('Should be error when type is not category or serie', async () => {
          articleForTests.body.articleType = 'jakiśTam';
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newAType = await repository.createDocument(articleForTests as Request);
            expect(newAType).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTypeValidTypes);
          }
        });
      });
      describe('seriePart field', () => {
        it('Should be error when article type is serie and seriePart is missing', async () => {
          articleForTests.body.articleType = 'serie';
          delete articleForTests.body.seriePart;
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newArticle = await repository.createDocument(articleForTests as Request);
            expect(newArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.seriePartRequired);
          }
        });
        it('Should be error when seriePart is string', async () => {
          articleForTests.body.seriePart = 'someString';
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newArticle = await repository.createDocument(articleForTests as Request);
            expect(newArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.seriePartMustBeInt);
          }
        });
        it('Should be error when seriePart is number but not integer', async () => {
          articleForTests.body.seriePart = 'someString';
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newArticle = await repository.createDocument(articleForTests as Request);
            expect(newArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.seriePartMustBeInt);
          }
        });
      });
      describe('Polish title should be unique in article type', () => {
        it('Should be error when polish title exists in type', async () => {
          articleForTests.body.seriePart = 5;
          articleForTests.body.titlePl = firstDocument!.titlePl;
          articleForTests.body.articleTypeId = firstDocument!.articleTypeId.toString();
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const newArticle = await repository.createDocument(articleForTests as Request);
            expect(newArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTitleExists);
          }
        });
      });
    });
  });
  describe('Validation response and inserted document', () => {
    it('Should be proper response', async () => {
      articleForTests.body.titlePl = faker.lorem.words(10);
      const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
      try {
        const newArticle = await repository.createDocument(articleForTests as Request);
        expect(newArticle.acknowledged).toEqual(true);
        expect(newArticle.insertedId).toBeInstanceOf(ObjectId);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be one document more in collection', async () => {
      const docsQtyAfterInsert = await articlesCollection.countDocuments();
      expect(docsQtyAfterInsert).toEqual(totalDocumentsInCollection + 1);
    });
    it('Should be proper inserted document structure', async () => {
      const lastDoc = await articlesCollection.findOne({}, { skip: 30 });
      expect(lastDoc!.titlePl).toEqual(articleForTests.body.titlePl);
      expect(lastDoc!.titleEn).toEqual(articleForTests.body.titleEn);
      expect(lastDoc!.articleType).toEqual(articleForTests.body.articleType);
      expect(lastDoc!.articleTypeId.toString()).toEqual(articleForTests.body.articleTypeId);
      expect(lastDoc!.seriePart).toEqual(articleForTests.body.seriePart);
      expect(lastDoc!.content).toEqual(articleForTests.body.content);
      expect(lastDoc!.creator.toString()).toEqual(firstUserLogIn._id);
      expect(lastDoc!.createdAt).toBeInstanceOf(Date);
      expect(lastDoc!.updatedAt).toBeInstanceOf(Date);
    });
  });
});
describe('Updating  document', () => {
  let lastDocument:any;
  describe('Error handling', () => {
    describe('Credentials and id errors', () => {
      it('Should be error without jwtToken', async () => {
        const repository = new ArticleRepository('pl');
        try {
          const updateArticle = await repository.updateDocument(TestHelpersClass.makeInvalidToken(), articleForTests as Request);
          expect(updateArticle).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(401);
          expect(err.message).toEqual(errorsMessages.missingAuthorization);
        }
      });
      it('Should be error with invalid id format', async () => {
        const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
        for (const invalidIdFormat of invalidIdFormats) {
          try {
            const updateArticle = await repository.updateDocument(invalidIdFormat, articleForTests as Request);
            expect(updateArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.invalidIdFormat);
          }
        }
      });
      it('Should be error if given id not exist in collection', async () => {
        const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
        try {
          const updateArticle = await repository.updateDocument(
            TestHelpersClass.makeNotExistingId().toHexString(),
            articleForTests as Request
          );
          expect(updateArticle).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(422);
          expect(err.message).toEqual(errorsMessages.invalidId);
        }
      });
      it('Should be error if encoded in jwtToken id does not exists in user collection', async () => {
        const repository = new ArticleRepository('pl', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
        try {
          const updateArticle = await repository.updateDocument(firstDocument._id.toString(), articleForTests as Request);
          expect(updateArticle).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(401);
          expect(err.message).toEqual(errorsMessages.invalidToken);
        }
      });
    });
    describe('Given fields validation', () => {
      describe('Polish title', () => {
        it('Should error when polish title is missing', async () => {
          lastDocument = await TestHelpersClass.getSomeDocument(articlesCollection, 30);
          delete articleForTests.body.titlePl;
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateArticle = await repository.updateDocument(lastDocument!._id.toString(), articleForTests as Request);
            expect(updateArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.polishTitleIsRequired);
          }
        });
        it('Should error when polish title is to short', async () => {
          articleForTests.body.titlePl = 'coś';
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateArticle = await repository.updateDocument(lastDocument!._id.toString(), articleForTests as Request);
            expect(updateArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTitleTooShort);
          }
        });
        it('Should error when polish title is to long', async () => {
          articleForTests.body.titlePl = faker.lorem.words(200);
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateArticle = await repository.updateDocument(lastDocument!._id.toString(), articleForTests as Request);
            expect(updateArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTitleTooLong);
          }
        });
      });
      describe('English title', () => {
        it('Should error when english title is too short', async () => {
          articleForTests.body.titlePl = faker.lorem.words(10);
          articleForTests.body.titleEn = 'some';
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateArticle = await repository.updateDocument(lastDocument!._id.toString(), articleForTests as Request);
            expect(updateArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTitleTooShort);
          }
        });
        it('Should error when english title is too long', async () => {
          articleForTests.body.titleEn = faker.lorem.words(200);
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateArticle = await repository.updateDocument(lastDocument!._id.toString(), articleForTests as Request);
            expect(updateArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTitleTooLong);
          }
        });
      });
      describe('Type field', () => {
        it('Should error whe type field is missing', async () => {
          articleForTests.body.titleEn = faker.lorem.words(6);
          delete articleForTests.body.articleType;
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateArticle = await repository.updateDocument(lastDocument!._id.toString(), articleForTests as Request);
            expect(updateArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTypeIsRequired);
          }
        });
        it('Should be error when type is not category or serie', async () => {
          articleForTests.body.articleType = 'jakiśTam';
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateArticle = await repository.updateDocument(lastDocument!._id.toString(), articleForTests as Request);
            expect(updateArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTypeValidTypes);
          }
        });
      });
      describe('seriePart field', () => {
        it('Should be error when article type is serie and seriePart is missing', async () => {
          articleForTests.body.articleType = 'serie';
          delete articleForTests.body.seriePart;
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateArticle = await repository.updateDocument(lastDocument!._id.toString(), articleForTests as Request);
            expect(updateArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.seriePartRequired);
          }
        });
        it('Should be error when seriePart is string', async () => {
          articleForTests.body.seriePart = 'someString';
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateArticle = await repository.updateDocument(lastDocument!._id.toString(), articleForTests as Request);
            expect(updateArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.seriePartMustBeInt);
          }
        });
        it('Should be error when seriePart is number but not integer', async () => {
          articleForTests.body.seriePart = 'someString';
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateArticle = await repository.updateDocument(lastDocument!._id.toString(), articleForTests as Request);
            expect(updateArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.seriePartMustBeInt);
          }
        });
      });
      describe('Polish title should be unique in article type', () => {
        it('Should be error when polish title exists in type', async () => {
          articleForTests.body.seriePart = 5;
          articleForTests.body.titlePl = firstDocument!.titlePl;
          articleForTests.body.articleTypeId = firstDocument!.articleTypeId.toString();
          const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
          try {
            const updateArticle = await repository.updateDocument(lastDocument!._id.toString(), articleForTests as Request);
            expect(updateArticle).toThrowError();
          } catch (err) {
            expect(err.code).toEqual(422);
            expect(err.message).toEqual(errorsMessages.articleTitleExists);
          }
        });
      });
    });
  });
  describe('Updating without Admin privilege', () => {
    it('Should be not possible to update when not creator is logged', async () => {
      const someDoc = await TestHelpersClass.getSomeDocument(articlesCollection, 20);
      const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
      try {
        const updateArticle = await repository.updateDocument(someDoc!._id.toString(), articleForTests as Request);
        expect(updateArticle).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.notAuthorized);
      }
    });
    it('Should be possible to update when login user is creator', async () => {
      articleForTests.body.titlePl = 'Jakiś polski tytuł i tyle';
      lastDocument = await TestHelpersClass.getSomeDocument(articlesCollection, 30);
      const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
      try {
        const updateArticle = await repository.updateDocument(lastDocument!._id.toString(), articleForTestsToUpdate as Request);
        expect(updateArticle.acknowledged).toEqual(true);
        expect(updateArticle.modifiedCount).toEqual(1);
        expect(updateArticle.upsertedId).toEqual(null);
        expect(updateArticle.upsertedCount).toEqual(0);
        expect(updateArticle.matchedCount).toEqual(1);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be updated document', async () => {
      lastDocument = await TestHelpersClass.getSomeDocument(articlesCollection, 30);
      expect(lastDocument.titlePl).toEqual(articleForTestsToUpdate.body.titlePl);
      expect(lastDocument.titleEn).toEqual(articleForTestsToUpdate.body.titleEn);
      expect(lastDocument.content).toEqual(articleForTestsToUpdate.body.content);
      expect(lastDocument.isEnabled).toEqual(articleForTestsToUpdate.body.isEnabled);
      expect(lastDocument.articleType).toEqual(articleForTestsToUpdate.body.articleType);
      expect(lastDocument.seriePart).toEqual(articleForTestsToUpdate.body.seriePart);
      expect(lastDocument.creator.toString()).toEqual(firstUserLogIn._id);
    });
  });

  describe('Updating without Admin privilege', () => {
    let lastDocument:any;
    it('Should be possible to update as admin', async () => {
      lastDocument = await TestHelpersClass.getSomeDocument(articlesCollection, 30);
      const repository = new ArticleRepository('pl', adminLogin.jwtToken);
      try {
        const updateArticle = await repository.updateDocument(lastDocument!._id.toString(), articleForTests as Request);
        expect(updateArticle.acknowledged).toEqual(true);
        expect(updateArticle.modifiedCount).toEqual(1);
        expect(updateArticle.upsertedId).toEqual(null);
        expect(updateArticle.upsertedCount).toEqual(0);
        expect(updateArticle.matchedCount).toEqual(1);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be updated document', async () => {
      lastDocument = await TestHelpersClass.getSomeDocument(articlesCollection, 30);
      expect(lastDocument.titlePl).toEqual(articleForTests.body.titlePl);
      expect(lastDocument.titleEn).toEqual(articleForTests.body.titleEn);
      expect(lastDocument.content).toEqual(articleForTests.body.content);
      expect(lastDocument.isEnabled).toEqual(articleForTests.body.isEnabled);
      expect(lastDocument.articleType).toEqual(articleForTests.body.articleType);
      expect(lastDocument.seriePart).toEqual(articleForTests.body.seriePart);
      expect(lastDocument.creator.toString()).toEqual(firstUserLogIn._id);
    });
  });
});
describe('Enabling/Disabling document', () => {
  describe('Errors handling', () => {
    it('Should be error without jwtToken', async () => {
      const repository = new ArticleRepository('pl');
      try {
        const changeStatus = await repository.updateStatus(firstDocument._id.toString(), false);
        expect(changeStatus).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.missingAuthorization);
      }
    });
    it('Should be error with invalid id format', async () => {
      const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
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
      const repository = new ArticleRepository('en', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
      try {
        const changeStatus = await repository.updateStatus(firstDocument._id.toString(), true);
        expect(changeStatus).toThrowError();
      } catch (err) {
        expect(err.message).toEqual(errorsMessages.invalidToken);
        expect(err.code).toEqual(401);
      }
    });
    it('Should be error if given id not exist in collection', async () => {
      const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
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
      const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
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
      const changedUser = await TestHelpersClass.getFirstDocument(articlesCollection);
      expect(changedUser!.isEnabled).toEqual(!firstDocument.isEnabled);
    });
    it('Should be not possible to change another document status', async () => {
      const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
      const someDoc = await TestHelpersClass.getSomeDocument(articlesCollection, 13);
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
      const repository = new ArticleRepository('pl', adminLogin.jwtToken);
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
      const changedUser = await TestHelpersClass.getFirstDocument(articlesCollection);
      expect(changedUser!.isEnabled).toEqual(firstDocument.isEnabled);
    });
  });
});
describe('Deleting document', () => {
  describe('Handling errors errors', () => {
    it('Should be error without jwtToken', async () => {
      const repository = new ArticleRepository('pl');
      try {
        const deleteDocument = await repository.deleteDocument(firstDocument._id.toString());
        expect(deleteDocument).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.missingAuthorization);
      }
    });
    it('Should be error with invalid id format', async () => {
      const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
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
      const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
      try {
        const changeStatus = await repository.deleteDocument(TestHelpersClass.makeNotExistingId().toHexString());
        expect(changeStatus).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual(errorsMessages.invalidId);
      }
    });
    it('Should be not possible to delete without SUPERADMIN privilege', async () => {
      const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
      try {
        const deleteUser = await repository.deleteDocument(firstDocument!._id.toString());
        expect(deleteUser).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.notSuperAdmin);
      }
    });
    it('Should be error when jwtToken contains encrypted id which not exists in users collection', async () => {
      const repository = new ArticleRepository('en', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
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
      const repository = new ArticleRepository('pl', superAdminLogin.jwtToken);
      const lastDoc = await TestHelpersClass.getSomeDocument(articlesCollection, totalDocumentsInCollection);
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
      const currentTotalDocuments = await TestHelpersClass.getNumberOfDocumentsInCollection(articlesCollection);
      expect(currentTotalDocuments).toEqual(totalDocumentsInCollection);
    });
  });
});

describe('Querying single document with', () => {
  describe('Error handling', () => {
    it('Should be error with incorrect id format', async () => {
      const repository = new ArticleRepository('pl');
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
      const repository = new ArticleRepository('en');
      try {
        const getDoc = await repository.getDocumentById(TestHelpersClass.makeNotExistingId().toHexString());
        expect(getDoc).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(404);
        expect(err.message).toEqual(errorsMessages.itemNotFound);
      }
    });
    it('Should be error when jwtToken contains encrypted id which not exists in users collection', async () => {
      const repository = new ArticleRepository('en', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
      try {
        const getDoc = await repository.getDocumentById(firstDocument!._id.toString());
        expect(getDoc).toThrowError();
      } catch (err) {
        expect(err.message).toEqual(errorsMessages.invalidToken);
        expect(err.code).toEqual(401);
      }
    });
    it('Should be not possible to query disabled document without authentication', async () => {
      const thirdDisabledUser = await TestHelpersClass.getSomeDisabledDocument(articlesCollection, 2);
      const repository = new ArticleRepository('en');
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
      const firstDocumentArticleType = await articleTypesCollection.findOne({ _id: firstDocument.articleTypeId });
      const firstDocumentCreator = await usersCollection.findOne({ _id: firstDocument.creator });
      const repository = new ArticleRepository('pl');
      const getDoc = await repository.getDocumentById(firstDocument._id.toString());
      expect(getDoc.title).toEqual(firstDocument.titlePl);
      expect(getDoc.seriePart).toEqual(firstDocument.seriePart);
      expect(getDoc.content).toEqual(firstDocument.content.pl);
      expect(getDoc.articleType._id).toEqual(firstDocumentArticleType!._id);
      expect(getDoc.articleType.name).toEqual(firstDocumentArticleType!.name);
      expect(getDoc.articleType.type).toEqual(firstDocumentArticleType!.type);
      expect(getDoc.articleType.description).toEqual(firstDocumentArticleType!.description.pl);
      expect(getDoc.creator._id).toEqual(firstDocumentCreator!._id);
      expect(getDoc.creator.firstName).toEqual(firstDocumentCreator!.firstName);
      expect(getDoc.creator.lastName).toEqual(firstDocumentCreator!.lastName);
    });

    it('Should be proper object wit english language', async () => {
      const firstDocumentArticleType = await articleTypesCollection.findOne({ _id: firstDocument.articleTypeId });
      const firstDocumentCreator = await usersCollection.findOne({ _id: firstDocument.creator });
      const repository = new ArticleRepository('en');
      const getDoc = await repository.getDocumentById(firstDocument._id.toString());
      expect(getDoc.title).toEqual(firstDocument.titleEn);
      expect(getDoc.seriePart).toEqual(firstDocument.seriePart);
      expect(getDoc.content).toEqual(firstDocument.content.en);
      expect(getDoc.articleType._id).toEqual(firstDocumentArticleType!._id);
      expect(getDoc.articleType.name).toEqual(firstDocumentArticleType!.name);
      expect(getDoc.articleType.type).toEqual(firstDocumentArticleType!.type);
      expect(getDoc.articleType.description).toEqual(firstDocumentArticleType!.description.en);
      expect(getDoc.creator._id).toEqual(firstDocumentCreator!._id);
      expect(getDoc.creator.firstName).toEqual(firstDocumentCreator!.firstName);
      expect(getDoc.creator.lastName).toEqual(firstDocumentCreator!.lastName);
    });
  });
  describe('Validation returned object with jwtToken', () => {
    it('Should be proper object wit polish language', async () => {
      const firstDocumentArticleType = await articleTypesCollection.findOne({ _id: firstDocument.articleTypeId });
      const firstDocumentCreator = await usersCollection.findOne({ _id: firstDocument.creator });
      const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
      const getDoc = await repository.getDocumentById(firstDocument._id.toString());
      expect(getDoc._id).toEqual(firstDocument._id);
      expect(getDoc.titlePl).toEqual(firstDocument.titlePl);
      expect(getDoc.titleEn).toEqual(firstDocument.titleEn);
      expect(getDoc.seriePart).toEqual(firstDocument.seriePart);
      expect(getDoc.isEnabled).toEqual(firstDocument.isEnabled);
      expect(getDoc.content).toEqual(firstDocument.content);
      expect(getDoc.articleType._id).toEqual(firstDocumentArticleType!._id);
      expect(getDoc.articleType.name).toEqual(firstDocumentArticleType!.name);
      expect(getDoc.articleType.type).toEqual(firstDocumentArticleType!.type);
      expect(getDoc.articleType.description).toEqual(firstDocumentArticleType!.description.pl);
      expect(getDoc.creator._id).toEqual(firstDocumentCreator!._id);
      expect(getDoc.creator.firstName).toEqual(firstDocumentCreator!.firstName);
      expect(getDoc.creator.lastName).toEqual(firstDocumentCreator!.lastName);
    });
    it('Should be proper object wit english language', async () => {
      const firstDocumentArticleType = await articleTypesCollection.findOne({ _id: firstDocument.articleTypeId });
      const firstDocumentCreator = await usersCollection.findOne({ _id: firstDocument.creator });
      const repository = new ArticleRepository('en', firstUserLogIn.jwtToken);
      const getDoc = await repository.getDocumentById(firstDocument._id.toString());
      expect(getDoc._id).toEqual(firstDocument._id);
      expect(getDoc.titlePl).toEqual(firstDocument.titlePl);
      expect(getDoc.titleEn).toEqual(firstDocument.titleEn);
      expect(getDoc.seriePart).toEqual(firstDocument.seriePart);
      expect(getDoc.isEnabled).toEqual(firstDocument.isEnabled);
      expect(getDoc.content).toEqual(firstDocument.content);
      expect(getDoc.articleType._id).toEqual(firstDocumentArticleType!._id);
      expect(getDoc.articleType.name).toEqual(firstDocumentArticleType!.name);
      expect(getDoc.articleType.type).toEqual(firstDocumentArticleType!.type);
      expect(getDoc.articleType.description).toEqual(firstDocumentArticleType!.description.en);
      expect(getDoc.creator._id).toEqual(firstDocumentCreator!._id);
      expect(getDoc.creator.firstName).toEqual(firstDocumentCreator!.firstName);
      expect(getDoc.creator.lastName).toEqual(firstDocumentCreator!.lastName);
    });
  });
});

describe('Querying paginated documents with \'getPaginatedDocuments\' method ', () => {
  describe('Error handling', () => {
    it('Should be error with page not integer', async () => {
      const repository = new ArticleRepository('pl');
      try {
        const getDocs = await repository.getPaginatedDocuments(2.3, 3);
        expect(getDocs).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual(errorsMessages.noIntegerPage);
      }
    });
    it('Should be error with perPage not integer', async () => {
      const repository = new ArticleRepository('pl');
      try {
        const getDocs = await repository.getPaginatedDocuments(3, 3.1);
        expect(getDocs).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual(errorsMessages.noIntegerPerPage);
      }
    });
    it('Should be error when page is bigger than total pages', async () => {
      const repository = new ArticleRepository('pl');
      try {
        const getDocs = await repository.getPaginatedDocuments(300, 3);
        expect(getDocs).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(404);
        expect(err.message).toEqual(errorsMessages.itemsNotFound);
      }
    });
    it('Should be error when id encoded in jwtToken is not in users collection', async () => {
      const repository = new ArticleRepository('pl', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
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
      const repository = new ArticleRepository('en');
      // const totalEnabledDocs = await TestHelpersClass.getNumberOfEnabledDocumentsInCollection(articleTypesCollection);
      const getDocs = await repository.getPaginatedDocuments(1, 30);
      expect(getDocs!.totalDocs).toEqual(totalEnabledDocumentsInCollection);
      expect(getDocs!.data.length).toEqual(totalEnabledDocumentsInCollection);
    });
    it('Should be returned proper object on not last page', async () => {
      // const totalEnabledDocs = await TestHelpersClass.getNumberOfEnabledDocumentsInCollection(articleTypesCollection);
      const page = 2;
      const perPage = 2;
      const repository = new ArticleRepository('pl');
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
      const page = 5;
      const perPage = 6;
      const repository = new ArticleRepository('pl');
      const docsOnLastPage = totalEnabledDocumentsInCollection - (perPage * (page - 1));
      try {
        const getDocs = await repository.getPaginatedDocuments(page, perPage);
        expect(getDocs!.data.length).toEqual(docsOnLastPage);
        expect(getDocs!.docsOnPage).toEqual(docsOnLastPage);
        expect(getDocs!.totalDocs).toEqual(totalEnabledDocumentsInCollection);
        expect(getDocs!.totalPages).toEqual(Math.ceil(totalEnabledDocumentsInCollection / perPage));
        expect(getDocs!.currentPage).toEqual(page);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be returned proper objects in data array', async () => {
      const firsDocCreator = await usersCollection.findOne({ _id: firstDocument!.creator });
      const firsDocAType = await articleTypesCollection.findOne({ _id: firstDocument!.articleTypeId });
      const page = 1;
      const perPage = 5;
      const repository = new ArticleRepository('pl');
      try {
        const getDocs = await repository.getPaginatedDocuments(page, perPage);
        expect(getDocs!.data[0].seriePart).toEqual(firstDocument!.seriePart);
        expect(getDocs!.data[0].title).toEqual(firstDocument!.titlePl);
        expect(getDocs!.data[0].content).toEqual(firstDocument!.content.pl.substr(0, 250));
        expect(getDocs!.data[0].creator._id).toEqual(firsDocCreator!._id);
        expect(getDocs!.data[0].creator.firstName).toEqual(firsDocCreator!.firstName);
        expect(getDocs!.data[0].creator.lastName).toEqual(firsDocCreator!.lastName);
        expect(getDocs!.data[0].articleType._id).toEqual(firsDocAType!._id);
        expect(getDocs!.data[0].articleType.name).toEqual(firsDocAType!.name);
        expect(getDocs!.data[0].articleType.type).toEqual(firsDocAType!.type);
        expect(getDocs!.data[0].articleType.icon).toEqual(firsDocAType!.icon);
        expect(getDocs!.data[0].articleType.description).toEqual(firsDocAType!.description.pl);
        expect(getDocs!.data[0].createdAt).toEqual(firstDocument!.createdAt);
        expect(getDocs!.data[0].updatedAt).toEqual(firstDocument!.updatedAt);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
  });

  describe('Validation with jwtToken', () => {
    it('Should be all article types in list', async () => {
      const repository = new ArticleRepository('en', firstUserLogIn.jwtToken);
      const getDocs = await repository.getPaginatedDocuments(1, 130);
      expect(getDocs!.totalDocs).toEqual(totalDocumentsInCollection);
      expect(getDocs!.data.length).toEqual(totalDocumentsInCollection);
    });
    it('Should be returned proper objects in data array', async () => {
      const page = 1;
      const perPage = 1;
      const firsDocCreator = await usersCollection.findOne({ _id: firstDocument!.creator });
      const firsDocAType = await articleTypesCollection.findOne({ _id: firstDocument!.articleTypeId });
      const repository = new ArticleRepository('pl', firstUserLogIn.jwtToken);
      try {
        const getDocs = await repository.getPaginatedDocuments(page, perPage);
        expect(getDocs!.data[0].seriePart).toEqual(firstDocument!.seriePart);
        expect(getDocs!.data[0].title).toEqual(firstDocument!.titlePl);
        expect(getDocs!.data[0].content).toEqual(firstDocument!.content.pl.substr(0, 250));
        expect(getDocs!.data[0].creator._id).toEqual(firsDocCreator!._id);
        expect(getDocs!.data[0].isEnabled).toEqual(firsDocCreator!.isEnabled);
        expect(getDocs!.data[0].creator.firstName).toEqual(firsDocCreator!.firstName);
        expect(getDocs!.data[0].creator.lastName).toEqual(firsDocCreator!.lastName);
        expect(getDocs!.data[0].articleType._id).toEqual(firsDocAType!._id);
        expect(getDocs!.data[0].articleType.name).toEqual(firsDocAType!.name);
        expect(getDocs!.data[0].articleType.type).toEqual(firsDocAType!.type);
        expect(getDocs!.data[0].articleType.icon).toEqual(firsDocAType!.icon);
        expect(getDocs!.data[0].articleType.description).toEqual(firsDocAType!.description.pl);
        expect(getDocs!.data[0].createdAt).toEqual(firstDocument!.createdAt);
        expect(getDocs!.data[0].updatedAt).toEqual(firstDocument!.updatedAt);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
  });
});

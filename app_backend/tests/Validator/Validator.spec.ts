import ArticleTypeEntity from '../../src/Entity/ArticleTypeEntity';
import { invalidIdFormats, userForTests, wrongEmails } from '../utils/usersExampleData';
import Validator from '../../src/Validator/Validator';
import { errorsMessages } from '../../src/Validator/ErrorMessages';
// import { ObjectId } from 'mongodb';
import { Collection, MongoClient, ObjectId } from 'mongodb';
import { uri } from '../../src/Utils/dbConnection';
import { ErrorTypes, validLanguages } from '../../src/Interfaces/Enums';
import Authentication from '../../src/Repository/Authentication';
import * as faker from 'faker';
import TestHelpersClass from '../utils/TestHelpersClass';

let connection: void | MongoClient;
// @ts-ignore
let usersCollection: Collection;

let articleTypeForTests: any;
beforeAll(async () => {
  // @ts-ignore
  connection = await MongoClient.connect(uri, {
    wtimeoutMS: 2500,
    useNewUrlParser: true
  });
  await Authentication.injectDB(connection);
  usersCollection = await connection.db('tests').collection('users');

  // objects to insert or update
  // objects to insert or update
  const makeArticleTypeForTests = await TestHelpersClass.makeArticleTypeForTest(usersCollection);
  articleTypeForTests = { body: { ...makeArticleTypeForTests } };
});

const someObjectId = new ObjectId();
describe('Check validator methods', () => {
  describe('Entity validation with \'validateEntity\' ', () => {
    it('Should be error with not valid entity', async () => {
      const newArticleType = new ArticleTypeEntity();
      newArticleType.name = articleTypeForTests.body.name;
      newArticleType.type = articleTypeForTests.body.type;
      newArticleType.icon = articleTypeForTests.body.icon;
      // newArticleType.creator = new ObjectId(this._jwtToken._id);
      newArticleType.description = articleTypeForTests.body.description;
      newArticleType.isEnabled = articleTypeForTests.body.isEnabled;
      const validator = new Validator();
      try {
        const isValid = await validator.validateEntity(newArticleType);
        expect(isValid).toThrowError();
        console.log(isValid);
      } catch (err) {
        // console.log();
        expect(err.code).toEqual(422);
        expect(err.message).toEqual(errorsMessages.creatorIsRequired);
      }
    });
    it('Should be true with valid fields', async () => {
      const newArticleType = new ArticleTypeEntity();
      newArticleType.name = articleTypeForTests.body.name;
      newArticleType.type = articleTypeForTests.body.type;
      newArticleType.icon = articleTypeForTests.body.icon;
      newArticleType.creator = someObjectId;
      newArticleType.description = articleTypeForTests.body.description;
      newArticleType.isEnabled = articleTypeForTests.body.isEnabled;
      const validator = new Validator();
      try {
        const isValid = await validator.validateEntity(newArticleType);
        expect(isValid).toBeUndefined();
      } catch (err) {
        expect(err).toBeNull();
      }
    });
  });
  describe('Validation email format with \'validateEmail\'', () => {
    it('Should be error with incorrect email format', async () => {
      const validator = new Validator();
      for (const wrongEmail of wrongEmails) {
        try {
          const isEmailValid = validator.validateEmail(wrongEmail);
          expect(isEmailValid).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(422);
          expect(err.message).toEqual(errorsMessages.invalidEmailFormat);
        }
      }
    });
    it('Should no error with valid email format', async () => {
      const validator = new Validator();
      try {
        const isEmailValid = validator.validateEmail(userForTests.body.email);
        expect(isEmailValid).toBeUndefined();
      } catch (err) {
        expect(err).toBeNull();
      }
    });
  });
  describe('Validation \'isInteger\'', () => {
    it('Should be error with string', async () => {
      const validator = new Validator();
      const message = 'invalid input';

      try {
        // @ts-ignore
        const isInt = validator.isInteger('someString', message);
        expect(isInt).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual(message);
      }
    });
    it('Should be error with not integer number', async () => {
      const validator = new Validator();
      const message = 'invalid input';

      try {
        const isInt = validator.isInteger(4.5, message);
        expect(isInt).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(422);
        expect(err.message).toEqual(message);
      }
    });
  });
  describe('Validation \'validateLanguage\'', () => {
    it('Should be error with incorrect lang', async () => {
      const incorrectLangs = ['de', 'fr', 'be'];
      const validator = new Validator();
      for (const incorrectLang of incorrectLangs) {
        try {
          const isValidLang = validator.validateLanguage(incorrectLang);
          expect(isValidLang).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(422);
          expect(err.message).toEqual(errorsMessages.invalidLang);
        }
      }
    });
    it('Should no error with correct languages', async () => {
      const correctLangs = Object.keys(validLanguages);
      const validator = new Validator();
      for (const correctLang of correctLangs) {
        try {
          const isValidLang = validator.validateLanguage(correctLang);
          expect(typeof isValidLang).toEqual('string');
        } catch (err) {
          expect(err).toBeUndefined();
        }
      }
    });
  });
  describe('Validation \'validateIdAsObjectId\'', () => {
    it('Should be no error', async () => {
      const validator = new Validator();
      try {
        const isValidId = validator.validateIdAsObjectId(
          someObjectId.toHexString(),
          errorsMessages.invalidIdFormat,
          ErrorTypes.INVALIDINPUT
        );
        expect(isValidId).toBeUndefined();
      } catch (err) {
        expect(err).toBeNull();
      }
    });
    it('Should be error 404 with NotFoundException', async () => {
      const validator = new Validator();
      for (const invalidIdFormat of invalidIdFormats) {
        try {
          const isValidId = validator.validateIdAsObjectId(
            invalidIdFormat,
            errorsMessages.invalidIdFormat,
            ErrorTypes.NOTFOUND
          );
          expect(isValidId).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(404);
          expect(err.message).toEqual(errorsMessages.invalidIdFormat);
        }
      }
    });
    it('Should be error 401 with UnauthorizedException', async () => {
      const validator = new Validator();
      for (const invalidIdFormat of invalidIdFormats) {
        try {
          const isValidId = validator.validateIdAsObjectId(
            invalidIdFormat,
            errorsMessages.invalidIdFormat,
            ErrorTypes.UNAUTHORIZED
          );
          expect(isValidId).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(401);
          expect(err.message).toEqual(errorsMessages.invalidIdFormat);
        }
      }
    });
    it('Should be error 422 with InvalidInputException', async () => {
      const validator = new Validator();
      for (const invalidIdFormat of invalidIdFormats) {
        try {
          const isValidId = validator.validateIdAsObjectId(
            invalidIdFormat,
            errorsMessages.invalidIdFormat,
            ErrorTypes.INVALIDINPUT
          );
          expect(isValidId).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(422);
          expect(err.message).toEqual(errorsMessages.invalidIdFormat);
        }
      }
    });
    it('Should be error 400 with BadRequestException', async () => {
      const validator = new Validator();
      for (const invalidIdFormat of invalidIdFormats) {
        try {
          const isValidId = validator.validateIdAsObjectId(
            invalidIdFormat,
            errorsMessages.invalidIdFormat,
            ErrorTypes.BADREQUEST
          );
          expect(isValidId).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(400);
          expect(err.message).toEqual(errorsMessages.invalidIdFormat);
        }
      }
    });
    it('Should be simple Error ', async () => {
      const validator = new Validator();
      for (const invalidIdFormat of invalidIdFormats) {
        try {
          const isValidId = validator.validateIdAsObjectId(
            invalidIdFormat,
            errorsMessages.invalidIdFormat,
            ErrorTypes.REGULARERROR
          );
          expect(isValidId).toThrowError();
        } catch (err) {
          expect(err).toBeInstanceOf(Error);
          expect(err.message).toEqual(errorsMessages.invalidIdFormat);
        }
      }
    });
  });
  describe('Validation of \'validateJwtToken\'', () => {
    it('Should error without  jwtToken ', async () => {
      const validator = new Validator();
      try {
        // @ts-ignore
        const isValidToken = validator.validateJwtToken();
        expect(isValidToken).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.missingAuthorization);
      }
    });
    it('Should error with invalid jwtToken string', async () => {
      const token = 'wefwef;kwbefj2;ouqouewghbvquwovbo/wsBJsahbliyas';
      const validator = new Validator();
      try {
        const isValidToken = validator.validateJwtToken(token);
        expect(isValidToken).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.invalidToken);
      }
    });
    it('Should be error with expired token', async () => {
      const firstUser = await usersCollection.findOne({});
      const authRepo = new Authentication();
      const expiredLogin = await authRepo.login(firstUser!.email, firstUser!.firstName, '1ms');
      const validator = new Validator();
      try {
        const isValidToken = validator.validateJwtToken(expiredLogin.jwtToken);
        expect(isValidToken).toThrowError();
      } catch (err) {
        expect(err.code).toEqual(401);
        expect(err.message).toEqual(errorsMessages.invalidToken);
      }
    });
    it('Should be no error with proper token', async () => {
      const firstUser = await usersCollection.findOne({});
      const authRepo = new Authentication();
      const expiredLogin = await authRepo.login(firstUser!.email, firstUser!.firstName);
      const validator = new Validator();
      try {
        const isValidToken = validator.validateJwtToken(expiredLogin.jwtToken);
        expect(isValidToken._id).toEqual(firstUser!._id.toString());
        expect(isValidToken.roles).toEqual(firstUser!.roles);
      } catch (err) {
        expect(err).toBeNull();
      }
    });
  });
  describe('Validation of \'validateIdExistsInCollection\'', () => {
    describe('Users collection', () => {
      it('Should be error 404 with NotFoundException', async () => {
        const validator = new Validator();
        try {
          const isIdInCollection = await validator.validateIdExistsInCollection(
            usersCollection,
            someObjectId.toHexString(),
            errorsMessages.invalidId,
            ErrorTypes.NOTFOUND
          );
          expect(isIdInCollection).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(404);
          expect(err.message).toEqual(errorsMessages.invalidId);
        }
      });
      it('Should be error 401 with UnauthorizedException', async () => {
        const validator = new Validator();
        try {
          const isIdInCollection = await validator.validateIdExistsInCollection(
            usersCollection,
            someObjectId.toHexString(),
            errorsMessages.invalidId,
            ErrorTypes.UNAUTHORIZED
          );
          expect(isIdInCollection).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(401);
          expect(err.message).toEqual(errorsMessages.invalidId);
        }
      });
      it('Should be error 422 with InvalidInputException', async () => {
        const validator = new Validator();
        try {
          const isIdInCollection = await validator.validateIdExistsInCollection(
            usersCollection,
            someObjectId.toHexString(),
            errorsMessages.invalidId,
            ErrorTypes.INVALIDINPUT
          );
          expect(isIdInCollection).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(422);
          expect(err.message).toEqual(errorsMessages.invalidId);
        }
      });
      it('Should be error 400 with BadRequestException', async () => {
        const validator = new Validator();
        try {
          const isIdInCollection = await validator.validateIdExistsInCollection(
            usersCollection,
            someObjectId.toHexString(),
            errorsMessages.invalidId,
            ErrorTypes.BADREQUEST
          );
          expect(isIdInCollection).toThrowError();
        } catch (err) {
          expect(err.code).toEqual(400);
          expect(err.message).toEqual(errorsMessages.invalidId);
        }
      });
      it('Should be regular error', async () => {
        const validator = new Validator();
        try {
          const isIdInCollection = await validator.validateIdExistsInCollection(
            usersCollection,
            someObjectId.toHexString(),
            errorsMessages.invalidId,
            ErrorTypes.REGULARERROR
          );
          expect(isIdInCollection).toThrowError();
        } catch (err) {
          expect(err.message).toEqual(errorsMessages.invalidId);
        }
      });
      it('Should be no error with existing id', async () => {
        const someUser = await usersCollection.findOne({},
          { skip: faker.datatype.number({ min: 1, max: 50 }) });
        const validator = new Validator();
        try {
          const isIdInCollection = await validator.validateIdExistsInCollection(
            usersCollection,
            someUser!._id.toString(),
            errorsMessages.invalidId,
            ErrorTypes.BADREQUEST
          );
          expect(isIdInCollection).toBeUndefined();
        } catch (err) {
          expect(err).toBeNull();
        }
      });
    });
  });
});

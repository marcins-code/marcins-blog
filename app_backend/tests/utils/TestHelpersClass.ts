import { Collection, ObjectId } from 'mongodb';
import Encryption from '../../src/Security/Encryption';
import Authentication from '../../src/Repository/Authentication';
import { initialArticleTypesSet } from './articleTypesExampleData';
import { initialArticlesSet } from './articleExampleData';
import { initialGlossaryTypesSet } from './glossaryExampleData';
import ArticleTypeEntity from '../../src/Entity/ArticleTypeEntity';
import ArticleEntity from '../../src/Entity/ArticleEntity';
import faker from 'faker';
import GlossaryEntity from '../../src/Entity/GlossaryEntity';

class TestHelpersClass {
  static auth: Authentication = new Authentication();
  static encryption: Encryption = new Encryption();

  static async getNumberOfDocumentsInCollection (collection: Collection) {
    return await collection.countDocuments();
  }

  static async getNumberOfEnabledDocumentsInCollection (collection: Collection) {
    return await collection.countDocuments({ isEnabled: true });
  }

  static async getNumberOfDisabledDocumentsInCollection (collection: Collection) {
    return await collection.countDocuments({ isEnabled: false });
  }

  static async getFirstDocument (collection: Collection) {
    return await collection.findOne({});
  }

  static async getSomeDocument (collection:Collection, skip:number) {
    return await collection.findOne({}, { skip: skip });
  }

  static async getSomeEnabledDocument (collection:Collection, skip:number) {
    return await collection.findOne({ isEnabled: true }, { skip: skip });
  }

  static async getSomeDisabledDocument (collection:Collection, skip:number) {
    return await collection.findOne({ isEnabled: false }, { skip: skip });
  }

  static makeInvalidToken () {
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJjb8WbdGFtIiwicm9sZXMiOlsiUk9MRV9VU0VSIl0sImlhdCI6MTYyOTc3ODA1NSwiZXhwIjoxNjI5NzgxNjU1fQ.p0X80GrRriYZ_azhPS2l7Zd3qbRRPNnT8jfO5oqZ';
  }

  static makeNotExistingId () {
    return new ObjectId();
  }

  static makeJwtTokenWithNotCorrectIdFormat () {
    return this.encryption.signJwtToken({ _id: 'cośtam', roles: ['ROLE_USER'] }, '1h');
  }

  static makeJwtTokenWithIdNotExistsInUsersCollection () {
    return this.encryption.signJwtToken({ _id: TestHelpersClass.makeNotExistingId(), roles: ['ROLE_USER'] }, '1h');
  }

  public static async checkAndPrepareUsersCollection (usersCollection: Collection, initSeedingUser: Function):Promise<void> {
    const totalUser = await usersCollection.countDocuments();
    const totalAdmins = await usersCollection.countDocuments({ roles: ['ROLE_ADMIN'] });
    const totalSuperAdmins = await usersCollection.countDocuments({ roles: ['ROLE_SUPERADMIN'] });
    if (totalUser !== 50 || totalAdmins !== 2 || totalSuperAdmins !== 2) {
      console.log('Preparing users collection');
      await usersCollection.deleteMany({});
      await initSeedingUser(usersCollection);
    }
  }

  public static async checkAndPrepareArticleTypesCollection (articleTypesCollection: Collection, usersCollection: Collection) {
    const totalArticleTypesDocs = await articleTypesCollection.countDocuments();
    if (totalArticleTypesDocs !== 10) {
      console.log('Preparing article types collection');
      await articleTypesCollection.deleteMany({});
      await initialArticleTypesSet(articleTypesCollection, usersCollection);
    }
  }

  public static async checkAndPrepareArticlesCollection (articlesCollection: Collection, usersCollection: Collection, articleTypesCollection: Collection) {
    const totalArticlesDocs = await articlesCollection.countDocuments();
    if (totalArticlesDocs !== 30) {
      console.log('Preparing articles collection');
      await articlesCollection.deleteMany({});
      await initialArticlesSet(articlesCollection, usersCollection, articleTypesCollection);
    }
  }

  public static async checkAndPrepareGlossaryCollection (glossaryCollection: Collection, usersCollection: Collection) {
    const totalArticleTypesDocs = await glossaryCollection.countDocuments();
    if (totalArticleTypesDocs !== 50) {
      console.log('Preparing glossary collection');
      await glossaryCollection.deleteMany({});
      await initialGlossaryTypesSet(glossaryCollection, usersCollection);
    }
  }

  static async getFirstUserAndLogin (UsersCollection: Collection) {
    const firstUser = await TestHelpersClass.getFirstDocument(UsersCollection);
    return await this.auth.login(firstUser!.email, firstUser!.firstName);
  }

  static async getFirstAdminAndLogin (UsersCollection: Collection) {
    const adminUser = await UsersCollection.findOne({ roles: ['ROLE_ADMIN'] });
    return await this.auth.login(adminUser!.email, adminUser!.firstName);
  }

  static async getFirstSuperAdminAndLogin (UsersCollection: Collection) {
    const superAdminUser = await UsersCollection.findOne({ roles: ['ROLE_SUPERADMIN'] });
    return await this.auth.login(superAdminUser!.email, superAdminUser!.firstName);
  }

  public static async makeArticleTypeForTest (usersCollection: Collection) {
    const creator = await TestHelpersClass.getFirstDocument(usersCollection);
    const articleTypeForTest: ArticleTypeEntity = {
      creator: creator!._id,
      description: {
        en: 'jakiś opis',
        pl: 'Some description'
      },
      icon: 'fa some',
      isEnabled: false,
      type: 'serie',
      name: 'Docker'
    };
    return articleTypeForTest;
  }

  public static async makeArticleForTest (usersCollection: Collection, articleTypesCollection: Collection) {
    const creator = await TestHelpersClass.getFirstDocument(usersCollection);
    const articleType = await TestHelpersClass.getFirstDocument(articleTypesCollection);
    const articleTypeForTest: ArticleEntity = {
      titlePl: faker.lorem.words(faker.datatype.number({ min: 5, max: 10 })),
      titleEn: faker.lorem.words(faker.datatype.number({ min: 5, max: 10 })),
      articleType: articleType!.type,
      articleTypeId: articleType!._id.toString(),
      seriePart: faker.datatype.number({ min: 1, max: 10 }),
      isEnabled: true,
      creator: creator!._id,
      content: {
        pl: faker.lorem.paragraphs(faker.datatype.number({ min: 2, max: 40 })),
        en: faker.lorem.paragraphs(faker.datatype.number({ min: 2, max: 40 }))
      },
      createdAt: faker.date.between('2020-11-01', '2021-09-15'),
      updatedAt: faker.date.between('2020-11-01', '2021-09-15')
    };
    return articleTypeForTest;
  }

  public static async makeGlossaryForTest (usersCollection: Collection) {
    const creator = await TestHelpersClass.getFirstDocument(usersCollection);
    const articleTypeForTest: GlossaryEntity = {
      abbreviation: 'HTTP',
      explanation: {
        en: 'Co to jest HTTP',
        pl: 'WTF if HTTP'
      },
      explication: 'HYPERTEXT',
      phrase: '<div><h2>Pabulum delimit, ponderous modules sui ratio utter.</h2></div>',
      creator: creator!._id,
      isEnabled: false
    };
    return articleTypeForTest;
  }
}

export default TestHelpersClass;

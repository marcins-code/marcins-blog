import { Collection, Document } from 'mongodb';
import TestHelpersClass from './TestHelpersClass';
import faker from 'faker';
import ArticleEntity from '../../src/Entity/ArticleEntity';

export const initialArticlesSet = async (articlesCollection: Collection, usersCollection: Collection, articleTypesCollection: Collection) => {
  let article: ArticleEntity;
  let articleType: Document | undefined;
  let user;
  for (let i = 1; i <= 5; i++) {
    user = await TestHelpersClass.getFirstDocument(usersCollection);
    articleType = await TestHelpersClass.getSomeDocument(articleTypesCollection, faker.datatype.number({ min: 0, max: 9 }));
    article = {
      titlePl: faker.lorem.words(faker.datatype.number({ min: 5, max: 10 })),
      titleEn: faker.lorem.words(faker.datatype.number({ min: 5, max: 10 })),
      articleType: articleType!.type,
      articleTypeId: articleType!._id,
      seriePart: faker.datatype.number({ min: 1, max: 10 }),
      isEnabled: true,
      creator: user!._id,
      content: {
        pl: faker.lorem.paragraphs(faker.datatype.number({ min: 2, max: 40 })),
        en: faker.lorem.paragraphs(faker.datatype.number({ min: 2, max: 40 }))
      },
      createdAt: faker.date.between('2020-11-01', '2021-09-15'),
      updatedAt: faker.date.between('2020-11-01', '2021-09-15')
    };
    await articlesCollection.insertOne(article);
  }
  for (let i = 1; i <= 20; i++) {
    user = await TestHelpersClass.getSomeDocument(usersCollection, faker.datatype.number({ min: 2, max: 49 }));
    articleType = await TestHelpersClass.getSomeDocument(articleTypesCollection, faker.datatype.number({ min: 0, max: 9 }));
    article = {
      titlePl: faker.lorem.words(faker.datatype.number({ min: 5, max: 10 })),
      titleEn: faker.lorem.words(faker.datatype.number({ min: 5, max: 10 })),
      articleType: articleType!.type,
      articleTypeId: articleType!._id,
      seriePart: faker.datatype.number({ min: 1, max: 10 }),
      isEnabled: true,
      creator: user!._id,
      content: {
        pl: faker.lorem.paragraphs(faker.datatype.number({ min: 2, max: 40 })),
        en: faker.lorem.paragraphs(faker.datatype.number({ min: 2, max: 40 }))
      },
      createdAt: faker.date.between('2020-11-01', '2021-09-15'),
      updatedAt: faker.date.between('2020-11-01', '2021-09-15')
    };
    await articlesCollection.insertOne(article);
  }

  for (let i = 1; i <= 5; i++) {
    user = await TestHelpersClass.getSomeDocument(usersCollection, faker.datatype.number({ min: 2, max: 49 }));
    articleType = await TestHelpersClass.getSomeDocument(articleTypesCollection, faker.datatype.number({ min: 0, max: 9 }));
    article = {
      titlePl: faker.lorem.words(faker.datatype.number({ min: 5, max: 10 })),
      titleEn: faker.lorem.words(faker.datatype.number({ min: 5, max: 10 })),
      articleType: articleType!.type,
      articleTypeId: articleType!._id,
      seriePart: faker.datatype.number({ min: 1, max: 10 }),
      isEnabled: false,
      creator: user!._id,
      content: {
        pl: faker.lorem.paragraphs(faker.datatype.number({ min: 2, max: 40 })),
        en: faker.lorem.paragraphs(faker.datatype.number({ min: 2, max: 40 }))
      },
      createdAt: faker.date.between('2020-11-01', '2021-09-15'),
      updatedAt: faker.date.between('2020-11-01', '2021-09-15')
    };
    await articlesCollection.insertOne(article);
  }
};

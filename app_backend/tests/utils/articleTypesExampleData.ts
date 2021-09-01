import { Collection } from 'mongodb';
import faker from 'faker';
import TestHelpersClass from './TestHelpersClass';

export const initialArticleTypesSet = async (articleTypesCollection: Collection, usersCollection: Collection) => {
  let articleType;
  let user;
  for (let i = 1; i <= 3; i++) {
    user = await TestHelpersClass.getFirstDocument(usersCollection);
    articleType = {
      name: faker.lorem.words(2),
      type: 'category',
      icon: faker.lorem.word(),
      isEnabled: true,
      description: { pl: 'Opis kategorii', en: 'Category description' },
      creator: user!._id,
      createdAt: faker.date.between('2020-11-01', '2021-09-15'),
      updatedAt: faker.date.between('2020-11-01', '2021-09-15')
    };
    await articleTypesCollection.insertOne(articleType);
  }
  for (let i = 1; i <= 2; i++) {
    user = await TestHelpersClass.getFirstDocument(usersCollection);
    articleType = {
      name: faker.lorem.words(2),
      type: 'category',
      icon: faker.lorem.word(),
      isEnabled: false,
      description: { pl: 'Opis kategorii', en: 'Category description' },
      creator: user!._id,
      createdAt: faker.date.between('2020-11-01', '2021-09-15'),
      updatedAt: faker.date.between('2020-11-01', '2021-09-15')
    };
    await articleTypesCollection.insertOne(articleType);
  }
  for (let i = 1; i <= 3; i++) {
    user = await TestHelpersClass.getSomeDocument(usersCollection, faker.datatype.number({ min: 2, max: 49 }));
    articleType = {
      name: faker.lorem.words(2),
      type: 'serie',
      icon: faker.lorem.word(),
      isEnabled: true,
      description: { pl: 'Opis serii', en: 'Serie description' },
      creator: user!._id,
      createdAt: faker.date.between('2020-11-01', '2021-09-15'),
      updatedAt: faker.date.between('2020-11-01', '2021-09-15')
    };
    await articleTypesCollection.insertOne(articleType);
  }
  for (let i = 1; i <= 2; i++) {
    user = await TestHelpersClass.getSomeDocument(usersCollection, faker.datatype.number({ min: 2, max: 49 }));
    articleType = {
      name: faker.lorem.words(2),
      type: 'serie',
      icon: faker.lorem.word(),
      isEnabled: false,
      description: { pl: 'Opis serii', en: 'Serie description' },
      creator: user!._id,
      createdAt: faker.date.between('2020-11-01', '2021-09-15'),
      updatedAt: faker.date.between('2020-11-01', '2021-09-15')
    };
    await articleTypesCollection.insertOne(articleType);
  }
};

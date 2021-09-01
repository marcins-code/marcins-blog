import { Collection } from 'mongodb';
import TestHelpersClass from './TestHelpersClass';
import faker from 'faker';
import GlossaryEntity from '../../src/Entity/GlossaryEntity';

export const initialGlossaryTypesSet = async (glossaryCollection: Collection, usersCollection: Collection) => {
  let glossary: GlossaryEntity;
  let user;
  for (let i = 1; i <= 5; i++) {
    user = await TestHelpersClass.getFirstDocument(usersCollection);
    glossary = {
      abbreviation: faker.lorem.word(faker.datatype.number({ min: 2, max: 7 })),
      explication: faker.lorem.words(faker.datatype.number({ min: 3, max: 10 })),
      phrase: faker.lorem.sentence(faker.datatype.number({ min: 3, max: 10 })),
      isEnabled: true,
      explanation: { pl: faker.lorem.paragraphs(faker.datatype.number({ min: 3, max: 10 })), en: faker.lorem.paragraphs(faker.datatype.number({ min: 3, max: 10 })) },
      creator: user!._id,
      createdAt: faker.date.between('2020-11-01', '2021-09-15'),
      updatedAt: faker.date.between('2020-11-01', '2021-09-15')
    };
    await glossaryCollection.insertOne(glossary);
  }
  for (let i = 1; i <= 5; i++) {
    user = await TestHelpersClass.getSomeDocument(usersCollection, faker.datatype.number({ min: 2, max: 49 }));
    glossary = {
      abbreviation: faker.lorem.word(faker.datatype.number({ min: 2, max: 7 })),
      explication: faker.lorem.words(faker.datatype.number({ min: 3, max: 10 })),
      phrase: faker.lorem.sentence(faker.datatype.number({ min: 3, max: 10 })),
      isEnabled: false,
      explanation: { pl: faker.lorem.paragraphs(faker.datatype.number({ min: 3, max: 10 })), en: faker.lorem.paragraphs(faker.datatype.number({ min: 3, max: 10 })) },
      creator: user!._id,
      createdAt: faker.date.between('2020-11-01', '2021-09-15'),
      updatedAt: faker.date.between('2020-11-01', '2021-09-15')
    };
    await glossaryCollection.insertOne(glossary);
  }
  for (let i = 1; i <= 40; i++) {
    user = await TestHelpersClass.getSomeDocument(usersCollection, faker.datatype.number({ min: 2, max: 49 }));
    glossary = {
      abbreviation: faker.lorem.word(faker.datatype.number({ min: 2, max: 7 })),
      explication: faker.lorem.words(faker.datatype.number({ min: 3, max: 10 })),
      phrase: faker.lorem.sentence(faker.datatype.number({ min: 3, max: 10 })),
      isEnabled: true,
      explanation: { pl: faker.lorem.paragraphs(faker.datatype.number({ min: 3, max: 10 })), en: faker.lorem.paragraphs(faker.datatype.number({ min: 3, max: 10 })) },
      creator: user!._id,
      createdAt: faker.date.between('2020-11-01', '2021-09-15'),
      updatedAt: faker.date.between('2020-11-01', '2021-09-15')
    };
    await glossaryCollection.insertOne(glossary);
  }
};

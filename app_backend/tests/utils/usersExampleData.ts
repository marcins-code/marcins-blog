import { Collection } from 'mongodb';
import faker from 'faker';
import bcrypt from 'bcrypt';
import UserEntity from '../../src/Entity/UserEntity';
faker.locale = 'pl';
const saltRounds = 10;

export const userForTests = {
  body: {
    firstName: 'Edwin',
    lastName: 'Ogórek',
    email: 'eogorek@test.pl',
    password: 'Test1234$',
    aboutMe: {
      pl: 'Jakiś tekst',
      en: 'Some text'
    },
    avatar: 'https://cdn.fakercloud.com/avatars/anatolinicolae_128.jpg',
    isEnabled: true,
    roles: ['ROLE_USER']
  }
};

export const userForTestsToUpdate = {
  body: {
    firstName: 'Alojzy-Eustachy',
    lastName: 'Pomidor',
    email: 'pomidor@test.pl',
    aboutMe: {
      pl: 'Tekst po polski',
      en: 'English text'
    },
    avatar: 'https://cdn.fakercloud.com/avatars/michaelcolenso_128.jpg',
    isEnabled: false,
    roles: ['ROLE_USER']
  }
};

export const initialUsersSet = async (UserCollection: Collection) => {
  let user: UserEntity;
  for (let i = 1; i <= 23; i++) {
    user = {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      email: faker.internet.email(),
      avatar: faker.internet.avatar(),
      roles: ['ROLE_USER'],
      password: '',
      isEnabled: true,
      aboutMe: {
        pl: 'Coś tam po polsku',
        en: 'Something in english'
      },
      createdAt: faker.date.between('2020-11-01', '2021-09-15'),
      updatedAt: faker.date.between('2020-11-01', '2021-09-15')

    };
    user.password = await bcrypt.hash(user.firstName, saltRounds);
    await UserCollection.insertOne(user);
  }
  for (let i = 1; i <= 23; i++) {
    // eslint-disable-next-line no-unused-vars

    user = {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      email: faker.internet.email(),
      avatar: faker.internet.avatar(),
      roles: ['ROLE_USER'],
      password: '',
      isEnabled: false,
      aboutMe: {
        pl: 'Coś tam po polsku',
        en: 'Something in english'
      },
      createdAt: faker.date.between('2020-11-01', '2021-09-15'),
      updatedAt: faker.date.between('2020-11-01', '2021-09-15')

    };
    user.password = await bcrypt.hash(user.firstName, saltRounds);
    await UserCollection.insertOne(user);
  }
  for (let i = 1; i <= 2; i++) {
    user = {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      email: faker.internet.email(),
      avatar: faker.internet.avatar(),
      roles: ['ROLE_ADMIN'],
      password: '',
      isEnabled: true,
      aboutMe: {
        pl: 'Coś tam po polsku',
        en: 'Something in english'
      },
      createdAt: faker.date.between('2020-11-01', '2021-09-15'),
      updatedAt: faker.date.between('2020-11-01', '2021-09-15')

    };
    user.password = await bcrypt.hash(user.firstName, saltRounds);
    await UserCollection.insertOne(user);
  }
  for (let i = 1; i <= 2; i++) {
    user = {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      email: faker.internet.email(),
      avatar: faker.internet.avatar(),
      roles: ['ROLE_SUPERADMIN'],
      password: '',
      isEnabled: true,
      aboutMe: {
        pl: 'Coś tam po polsku',
        en: 'Something in english'
      },
      createdAt: faker.date.between('2020-11-01', '2021-09-15'),
      updatedAt: faker.date.between('2020-11-01', '2021-09-15')

    };
    user.password = await bcrypt.hash(user.firstName, saltRounds);
    await UserCollection.insertOne(user);
  }
};

export const wrongFirstNames = [
  'Marcinek333',
  'Marci%$#',
  'Marcin~Krzysztof',
  'Marcin Krzysztof',
  'Dam33ian%4*^'
];
export const wrongLastNames = [
  'Nowak ',
  'No334ak',
  'Kowalski;Nowak',
  'Kowalski#Nowak',
  'Kowalski~Nowak'
];
export const wrongEmails = [
  'nowak.kowalki.pl ',
  'nowak.onet',
  'nowak$$$@onet.pl',
  'kowalski#@o2com',
  'cost_tam.pl'
];
export const invalidIdFormats = [
  'any', '242412124, owf2oo', '0044ewr'
];

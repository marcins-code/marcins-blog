import { Collection, Document, MongoClient } from 'mongodb';
import { dbName } from '../Utils/dbConnection';
import { Request } from 'express';
import UserEntity from '../Entity/UserEntity';
import { validateIsUniqueInCollectionParams } from '../Interfaces/Enums';
import { errorsMessages } from '../Validator/ErrorMessages';
import Encryption from '../Security/Encryption';
import Validator from '../Validator/Validator';
import { insertDocumentTypes, loginTypes } from '../Interfaces/CustomTypes';
import UnauthorizedException from '../Exceptions/UnauthorizedException';

let usersCollection: Collection;

class Authentication {
  private _encryption: Encryption;
  private _validator: Validator;
  constructor () {
    this._encryption = new Encryption();
    this._validator = new Validator();
  }

  static async injectDB (conn: MongoClient | void) {
    if (usersCollection) {
      return;
    }
    try {
      if (conn instanceof MongoClient) {
        usersCollection = await conn.db(dbName).collection('users');
      }
    } catch (e: any) {
      console.error(`Unable to establish collection handles in userDAO: ${e}`);
    }
  }

  public async signUp (request: Request): Promise<insertDocumentTypes> {
    const newUser = new UserEntity();
    newUser.firstName = request.body.firstName;
    newUser.lastName = request.body.lastName;
    newUser.email = request.body.email;
    newUser.password = request.body.password;
    newUser.avatar = request.body.avatar;
    newUser.roles = request.body.roles;
    newUser.aboutMe = request.body.aboutMe;
    newUser.isEnabled = request.body.isEnabled;
    await this._validator.validateEntity(newUser);
    newUser.password = await this._encryption.hashPassword(newUser.password);
    await this._validator.validateIsUniqueInCollection(
      usersCollection,
      { email: request.body.email },
      validateIsUniqueInCollectionParams.INSERT,
      errorsMessages.emailExists
    );
    return await usersCollection.insertOne({ ...newUser });
  }

  private static async _getUserByEmail (
    email: string
  ): Promise<Document | undefined> {
    return await usersCollection.findOne(
      { email: email },
      {
        projection: {
          password: 1,
          id: 1,
          roles: 1,
          firstName: 1,
          lastName: 1
        }
      }
    );
  }

  public async login (
    email: string,
    plainPassword: string,
    tokenExpiration: string = '1h'
  ): Promise<loginTypes> {
    this._validator.validateEmail(email);

    const user: Document | undefined = await Authentication._getUserByEmail(
      email
    );
    if (!user) {
      throw new UnauthorizedException(errorsMessages.incorrectEmail);
    }

    const { password, _id, roles, firstName, lastName } = user;
    await this._encryption.comparePassword(plainPassword, password);
    const jwtToken = this._encryption.signJwtToken(
      {
        _id,
        roles
      },
      tokenExpiration
    );
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          lastLogin: { lastJwtToken: jwtToken, dateTime: new Date(Date.now()) }
        }
      }
    );
    return {
      jwtToken,
      firstName,
      lastName,
      _id: _id.toString()
    };
  }
}

export default Authentication;

import { ErrorTypes, validateIsUniqueInCollectionParams } from '../Interfaces/Enums';
import { Collection, Document, MongoClient, ObjectId } from 'mongodb';
import { dbName } from '../Utils/dbConnection';
import RepositoryAbstractClass from './RepositoryAbstractClass';
import UserEntity from '../Entity/UserEntity';
import { Request } from 'express';
import UnauthorizedException from '../Exceptions/UnauthorizedException';
import NotFoundException from '../Exceptions/NotFoundException';
import { errorsMessages } from '../Validator/ErrorMessages';
import { deleteDocumentTypes, PaginatedDocumentsTypes, updateDocumentTypes } from '../Interfaces/CustomTypes';
import InternalServerErrorException from '../Exceptions/InternalServerErrorException';

let usersCollection: Collection;

class UserRepository extends RepositoryAbstractClass {
  constructor (lang: string | undefined, jwtToken: string | undefined = undefined) {
    super(lang, jwtToken);
  }

  static async injectDB (conn: MongoClient | void) {
    if (usersCollection) {
      return;
    }
    try {
      if (conn instanceof MongoClient) {
        usersCollection = await conn.db(dbName).collection('users');
      }
    } catch (err: any) {
      throw new InternalServerErrorException(errorsMessages.notConnectionToDb);
    }
  }

  createDocument (): Promise<any> {
    throw new UnauthorizedException(errorsMessages.createUserError);
  }

  public async getDocumentById (id: string): Promise<Document> {
    this._validator.validateIdAsObjectId(
      id,
      errorsMessages.invalidIdFormat,
      ErrorTypes.INVALIDINPUT
    );
    if (this._jwtToken) {
      await this._validator.validateIdExistsInCollection(
        usersCollection,
        this._decodedJwtToken._id,
        errorsMessages.invalidToken,
        ErrorTypes.UNAUTHORIZED
      );
    }
    const objId = new ObjectId(id);
    let queriedUser: Document;
    if (!this._jwtToken) {
      queriedUser = await usersCollection
        .aggregate([
          {
            $match: {
              _id: objId,
              isEnabled: true
            }
          },
          {
            $project: {
              firstName: 1,
              lastName: 1,
              email: 1,
              avatar: 1,
              createdAt: 1,
              updatedAt: 1,
              aboutMe: `$aboutMe.${this._lang}`
            }
          }
        ])
        .toArray();
    } else {
      await this._validator.validateIdExistsInCollection(
        usersCollection,
        this._decodedJwtToken._id,
        errorsMessages.invalidToken,
        ErrorTypes.UNAUTHORIZED
      );
      queriedUser = await usersCollection
        .aggregate([
          {
            $match: { _id: objId }
          },
          {
            $project: {
              firstName: 1,
              lastName: 1,
              email: 1,
              avatar: 1,
              createdAt: 1,
              updatedAt: 1,
              aboutMe: 1,
              isEnabled: 1,
              roles: 1
            }
          }
        ])
        .toArray();
    }
    if (queriedUser && !queriedUser.length) {
      throw new NotFoundException(errorsMessages.userNotFound);
    } else {
      return await queriedUser.shift();
    }
  }

  public async getPaginatedDocuments (
    page: number,
    perPage: number
  ): Promise<PaginatedDocumentsTypes | Document | undefined> {
    // validation pagination params
    this._validator.isInteger(page, errorsMessages.noIntegerPage);
    this._validator.isInteger(perPage, errorsMessages.noIntegerPerPage);
    // if jwt  - validating encoded id in jwtToken
    if (this._jwtToken) {
      await this._validator.validateIdExistsInCollection(
        usersCollection,
        this._decodedJwtToken._id,
        errorsMessages.invalidToken,
        ErrorTypes.UNAUTHORIZED
      );
    }
    let dataProjection;
    dataProjection = {
      firstName: 1,
      lastName: 1,
      email: 1,
      avatar: 1,
      aboutMe: `$aboutMe.${this._lang}`,
      createdAt: 1,
      updatedAt: 1
    };

    dataProjection = this._jwtToken
      ? {
          ...dataProjection,
          roles: 1,
          isEnabled: 1
        }
      : dataProjection;
    const DataPipeline = [
      { $skip: (page - 1) * perPage },
      { $limit: perPage },
      { $project: dataProjection }
    ];
    let pipeline: any;
    pipeline = [
      { $match: { isEnabled: true } },
      {
        $facet: {
          data: DataPipeline,
          totalItems: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 }
              }
            }
          ]
        }
      },
      {
        $project: {
          data: 1,
          docsOnPage: { $size: '$data' },
          totalDocs: { $arrayElemAt: ['$totalItems.count', 0] },
          totalPages: {
            $ceil: {
              $divide: [{ $arrayElemAt: ['$totalItems.count', 0] }, perPage]
            }
          }
        }
      },
      { $addFields: { currentPage: page } }
    ];

    pipeline = this._jwtToken ? pipeline.slice(1) : pipeline;

    const paginatedResult = await usersCollection.aggregate(pipeline).toArray();

    const { totalPages } = paginatedResult[0];
    if (page > totalPages) {
      throw new NotFoundException(errorsMessages.itemsNotFound);
    }
    return await paginatedResult.shift();
  }

  public async updateStatus (
    id: string,
    status: boolean
  ): Promise<updateDocumentTypes | Document> {
    // validation jwtToken
    this._validator.validateIsJwtToken(this._jwtToken);
    await this._validator.validateIdExistsInCollection(
      usersCollection,
      this._decodedJwtToken._id,
      errorsMessages.invalidToken,
      ErrorTypes.UNAUTHORIZED
    );
    // validation id
    this._validator.validateIdAsObjectId(
      id,
      errorsMessages.invalidIdFormat,
      ErrorTypes.INVALIDINPUT
    );
    await this._validator.validateIdExistsInCollection(
      usersCollection,
      id,
      errorsMessages.invalidId,
      ErrorTypes.INVALIDINPUT
    );
    // is the same id or admin privilege.
    this._validator.isDocumentOwnerOrAdmin(
      id,
      this._decodedJwtToken._id,
      this._isAdmin
    );
    return await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isEnabled: status } }
    );
  }

  public async deleteDocument (id: string): Promise<deleteDocumentTypes> {
    this._validator.validateIsJwtToken(this._jwtToken);
    await this._validator.validateIdExistsInCollection(
      usersCollection,
      this._decodedJwtToken._id,
      errorsMessages.invalidToken,
      ErrorTypes.UNAUTHORIZED
    );
    this._validator.validateIdAsObjectId(
      id,
      errorsMessages.invalidIdFormat,
      ErrorTypes.INVALIDINPUT
    );
    await this._validator.validateIdExistsInCollection(
      usersCollection,
      id,
      errorsMessages.invalidId,
      ErrorTypes.INVALIDINPUT
    );
    if (!this._isSuperAdmin) {
      throw new UnauthorizedException(errorsMessages.notSuperAdmin);
    }
    return usersCollection.deleteOne({ _id: new ObjectId(id) });
  }

  public async updateDocument (
    id: string,
    request: Request
  ): Promise<updateDocumentTypes | Document> {
    this._validator.validateIsJwtToken(this._jwtToken);
    this._validator.validateIdAsObjectId(
      id,
      errorsMessages.invalidIdFormat,
      ErrorTypes.INVALIDINPUT
    );
    await this._validator.validateIdExistsInCollection(
      usersCollection,
      this._decodedJwtToken._id,
      errorsMessages.invalidToken,
      ErrorTypes.UNAUTHORIZED
    );
    await this._validator.validateIdExistsInCollection(
      usersCollection,
      id,
      errorsMessages.invalidId,
      ErrorTypes.INVALIDINPUT
    );
    this._validator.isDocumentOwnerOrAdmin(
      id,
      this._decodedJwtToken._id,
      this._isAdmin
    );
    await this._validator.validateIsUniqueInCollection(
      usersCollection,
      { email: request.body.email },
      validateIsUniqueInCollectionParams.UPDATE,
      errorsMessages.emailExists,
      id
    );
    const updateUser = new UserEntity();
    updateUser.firstName = request.body.firstName;
    updateUser.lastName = request.body.lastName;
    updateUser.email = request.body.email;
    updateUser.avatar = request.body.avatar;
    updateUser.roles = request.body.roles;
    updateUser.aboutMe = request.body.aboutMe;
    updateUser.isEnabled = request.body.isEnabled;
    updateUser.updatedAt = new Date(Date.now());
    delete updateUser.createdAt;
    if (request.body.password) {
      throw new UnauthorizedException(errorsMessages.passwordNotAllowed);
    }
    // Just for entity validation  - not process later
    updateUser.password = 'Test123%%';
    await this._validator.validateEntity(updateUser);

    await this._validator.validateIsUniqueInCollection(
      usersCollection,
      { email: request.body.email },
      validateIsUniqueInCollectionParams.UPDATE,
      errorsMessages.emailExists,
      id
    );

    return await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          firstName: updateUser.firstName,
          lastName: updateUser.lastName,
          email: updateUser.email,
          avatar: updateUser.avatar,
          aboutMe: updateUser.aboutMe,
          isEnabled: updateUser.isEnabled
        }
      }
    );
  }
}

export default UserRepository;

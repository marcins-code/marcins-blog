import { Request } from 'express';
import { Collection, Document, MongoClient, ObjectId } from 'mongodb';
import ArticleTypeEntity from '../Entity/ArticleTypeEntity';
import RepositoryAbstractClass from './RepositoryAbstractClass';
import { dbName } from '../Utils/dbConnection';
import { errorsMessages } from '../Validator/ErrorMessages';
import {
  ErrorTypes,
  validateIsUniqueInCollectionParams
} from '../Interfaces/Enums';
import UnauthorizedException from '../Exceptions/UnauthorizedException';
import {
  deleteDocumentTypes,
  insertDocumentTypes, PaginatedDocumentsTypes,
  updateDocumentTypes
} from '../Interfaces/CustomTypes';
import NotFoundException from '../Exceptions/NotFoundException';

let articleTypesCollection: Collection;
let usersCollection: Collection;

class ArticleTypeRepository extends RepositoryAbstractClass {
  constructor (lang: string, jwtToken: string | undefined = undefined) {
    super(lang, jwtToken);
  }

  static async injectDB (conn: MongoClient | void) {
    if (articleTypesCollection) {
      return;
    }
    try {
      if (conn instanceof MongoClient) {
        articleTypesCollection = conn.db(dbName).collection('articleTypes');
        usersCollection = conn.db(dbName).collection('users');
      }
    } catch (e: any) {
      console.error(`Unable to establish collection handles in userDAO: ${e}`);
    }
  }

  public async createDocument (request: Request): Promise<insertDocumentTypes> {
    this._validator.validateIsJwtToken(this._jwtToken);
    await this._validator.validateIdExistsInCollection(
      usersCollection,
      this._decodedJwtToken._id,
      errorsMessages.invalidToken,
      ErrorTypes.UNAUTHORIZED
    );
    const newArticleType = new ArticleTypeEntity();
    newArticleType.name = request.body.name;
    newArticleType.type = request.body.type;
    newArticleType.icon = request.body.icon;
    newArticleType.creator = new ObjectId(this._decodedJwtToken._id);
    newArticleType.description = request.body.description;
    newArticleType.isEnabled = request.body.isEnabled;
    await this._validator.validateEntity(newArticleType);
    await this._validator.validateIsUniqueInCollection(
      articleTypesCollection,
      { name: request.body.name, type: request.body.type },
      validateIsUniqueInCollectionParams.INSERT,
      errorsMessages.suchNameInTypeExists
    );

    return await articleTypesCollection.insertOne({ ...newArticleType });
  }

  public async deleteDocument (id: string): Promise<deleteDocumentTypes> {
    this._validator.validateIsJwtToken(this._jwtToken);
    this._validator.validateIdAsObjectId(
      id,
      errorsMessages.invalidIdFormat,
      ErrorTypes.INVALIDINPUT
    );
    await this._validator.validateIdExistsInCollection(
      articleTypesCollection,
      id,
      errorsMessages.invalidId,
      ErrorTypes.INVALIDINPUT
    );
    await this._validator.validateIdExistsInCollection(
      usersCollection,
      this._decodedJwtToken._id,
      errorsMessages.invalidToken,
      ErrorTypes.UNAUTHORIZED
    );
    if (!this._isSuperAdmin) {
      throw new UnauthorizedException(errorsMessages.notSuperAdmin);
    }
    return await articleTypesCollection.deleteOne({ _id: new ObjectId(id) });
  }

  public async getDocumentById (id: string): Promise<Document | undefined> {
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
    const noJwtTokenMatch = { _id: new ObjectId(id), isEnabled: true };
    const jwtTokenMatch = { _id: new ObjectId(id) };
    const noJwtTokenProject = {
      name: 1,
      type: 1,
      icon: 1,
      creator: { $arrayElemAt: ['$creator', 0] },
      createdAt: 1,
      updatedAt: 1,
      description: `$description.${this._lang}`
    };
    const jwtTokenProject = {
      ...noJwtTokenProject,
      isEnabled: 1,
      description: 1
    };
    const pipeline = [
      {
        $match: this._jwtToken ? jwtTokenMatch : noJwtTokenMatch
      },
      this._creatorLookUp,
      {
        $project: this._jwtToken ? jwtTokenProject : noJwtTokenProject
      }
    ];

    const articleType = await articleTypesCollection
      .aggregate(pipeline)
      .toArray();
    if (!articleType.length) {
      throw new NotFoundException(errorsMessages.articleTypeNotFound);
    }
    return articleType.shift();
  }

  public async getPaginatedDocuments (
    page: number,
    perPage: number
  ): Promise<PaginatedDocumentsTypes | Document | undefined> {
    if (this._jwtToken) {
      await this._validator.validateIdExistsInCollection(
        usersCollection,
        this._decodedJwtToken._id,
        errorsMessages.invalidToken,
        ErrorTypes.UNAUTHORIZED
      );
    }
    this._validator.isInteger(perPage, errorsMessages.noIntegerPerPage);
    this._validator.isInteger(page, errorsMessages.noIntegerPage);
    const dataWithoutJwtProjection: Object = {
      name: 1,
      type: 1,
      icon: 1,
      seriePart: 1,
      createdAt: 1,
      updatedAt: 1,
      // creator: '$creator',
      creator: { $arrayElemAt: ['$creator', 0] },
      description: `$description.${this._lang}`
    };
    const dataProjection = !this._jwtToken
      ? dataWithoutJwtProjection
      : {
          ...dataWithoutJwtProjection,
          isEnabled: 1
        };
    let pipeline;
    pipeline = [
      { $match: { isEnabled: true } },
      {
        $facet: {
          data: [
            { $skip: (page - 1) * perPage },
            { $limit: perPage },
            this._creatorLookUp,
            { $project: dataProjection }
          ],
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
    const articleTypes = await articleTypesCollection
      .aggregate(pipeline)
      .toArray();
    const { totalPages } = articleTypes[0];
    if (page > totalPages) {
      throw new NotFoundException(errorsMessages.itemsNotFound);
    }

    return articleTypes.shift();
  }

  public async updateStatus (id: string, status: boolean): Promise<any> {
    // TODO add validation for boolean
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
      articleTypesCollection,
      id,
      errorsMessages.invalidId,
      ErrorTypes.INVALIDINPUT
    );

    const docToUpdate = await articleTypesCollection
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
        { $project: { creator: 1, _id: 0 } }
      ])
      .toArray();

    this._validator.isDocumentOwnerOrAdmin(
      this._decodedJwtToken._id,
      docToUpdate[0].creator.toString(),
      this._isAdmin
    );

    // findOne({ _id: new ObjectId(id) });
    return await articleTypesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isEnabled: status } }
    );
  }

  public async updateDocument (
    id: string,
    request: Request
  ): Promise<updateDocumentTypes | Document> {
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
      articleTypesCollection,
      id,
      errorsMessages.invalidId,
      ErrorTypes.INVALIDINPUT
    );

    const docToUpdate = await articleTypesCollection
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
        { $project: { creator: 1, _id: 0 } }
      ])
      .toArray();

    this._validator.isDocumentOwnerOrAdmin(
      this._decodedJwtToken._id,
      docToUpdate[0].creator.toString(),
      this._isAdmin
    );

    const updatedAType = new ArticleTypeEntity();
    updatedAType.name = request.body.name;
    updatedAType.type = request.body.type;
    updatedAType.icon = request.body.icon;
    updatedAType.isEnabled = request.body.isEnabled;
    updatedAType.description = request.body.description;
    updatedAType.updatedAt = new Date(Date.now());
    delete updatedAType.createdAt;
    // just for validator
    updatedAType.creator = docToUpdate[0].creator;
    await this._validator.validateEntity(updatedAType);
    delete updatedAType.creator;
    await this._validator.validateIsUniqueInCollection(
      articleTypesCollection,
      { name: request.body.name, type: request.body.type },
      validateIsUniqueInCollectionParams.UPDATE,
      errorsMessages.suchNameInTypeExists,
      id
    );

    return await articleTypesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updatedAType } }
    );
  }
}

export default ArticleTypeRepository;

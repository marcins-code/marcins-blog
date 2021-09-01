import RepositoryAbstractClass from '../Repository/RepositoryAbstractClass';
import { Request } from 'express';
import { Collection, Document, MongoClient, ObjectId } from 'mongodb';
import { dbName } from '../Utils/dbConnection';
import { errorsMessages } from '../Validator/ErrorMessages';
import {
  ErrorTypes,
  validateIsUniqueInCollectionParams
} from '../Interfaces/Enums';
import ArticleEntity from '../Entity/ArticleEntity';
import {
  deleteDocumentTypes,
  insertDocumentTypes, PaginatedDocumentsTypes,
  updateDocumentTypes
} from '../Interfaces/CustomTypes';
import UnauthorizedException from '../Exceptions/UnauthorizedException';
import NotFoundException from '../Exceptions/NotFoundException';

let articlesCollection: Collection;
// @ts-ignore
let usersCollection: Collection;

class ArticleRepository extends RepositoryAbstractClass {
  private _articleTypeLookUp:Object = {
    $lookup: {
      from: 'articleTypes',
      let: { id: '$articleTypeId' },
      pipeline: [
        {
          $match: { $expr: { $eq: ['$_id', '$$id'] } }
        },
        {
          $project: {
            name: 1,
            type: 1,
            icon: 1,
            description: `$description.${this._lang}`,
            _id: 1
          }
        }
      ],
      as: 'articleType'
    }
  };

  constructor (lang: string, jwtToken: string | undefined = undefined) {
    super(lang, jwtToken);
  }

  static async injectDB (conn: MongoClient | void) {
    if (articlesCollection) {
      return;
    }
    try {
      if (conn instanceof MongoClient) {
        articlesCollection = conn.db(dbName).collection('articles');
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

    const newArticle = new ArticleEntity();
    newArticle.titlePl = request.body.titlePl;
    newArticle.titleEn = request.body.titleEn;
    newArticle.articleType = request.body.articleType;
    newArticle.articleTypeId = new ObjectId(request.body.articleTypeId);
    newArticle.seriePart = request.body.seriePart;
    newArticle.content = request.body.content;
    newArticle.creator = new ObjectId(this._decodedJwtToken._id);
    newArticle.tags = request.body.tags;
    await this._validator.validateEntity(newArticle);
    await this._validator.validateIsUniqueInCollection(
      articlesCollection,
      {
        titlePl: request.body.titlePl,
        articleTypeId: new ObjectId(request.body.articleTypeId)
      },
      validateIsUniqueInCollectionParams.INSERT,
      errorsMessages.articleTitleExists
    );
    return await articlesCollection.insertOne({ ...newArticle });
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
      articlesCollection,
      id,
      errorsMessages.invalidId,
      ErrorTypes.INVALIDINPUT
    );
    if (!this._isSuperAdmin) {
      throw new UnauthorizedException(errorsMessages.notSuperAdmin);
    }
    return articlesCollection.deleteOne({ _id: new ObjectId(id) });
  }

  public async getDocumentById (id: string): Promise<Document> {
    this._validator.validateIdAsObjectId(
      id,
      errorsMessages.invalidIdFormat,
      ErrorTypes.INVALIDINPUT
    );
    const objId = new ObjectId(id);
    let queriedArticle: Document;
    if (!this._jwtToken) {
      queriedArticle = await articlesCollection
        .aggregate([
          {
            $match: {
              _id: objId,
              isEnabled: true
            }
          },
          this._creatorLookUp,
          this._articleTypeLookUp,
          {
            $project: {
              _id: 1,
              title: { $cond: { if: this._lang === 'pl', then: '$titlePl', else: '$titleEn' } },
              articleType: { $arrayElemAt: ['$articleType', 0] },
              seriePart: 1,
              createdAt: 1,
              updatedAt: 1,
              creator: { $arrayElemAt: ['$creator', 0] },
              content: `$content.${this._lang}`
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
      queriedArticle = await articlesCollection
        .aggregate([
          {
            $match: { _id: objId }
          },
          this._creatorLookUp,
          this._articleTypeLookUp,
          {
            $project: {
              titlePl: 1,
              titleEn: 1,
              seriePart: 1,
              createdAt: 1,
              updatedAt: 1,
              content: 1,
              isEnabled: 1,
              articleType: { $arrayElemAt: ['$articleType', 0] },
              creator: { $arrayElemAt: ['$creator', 0] }
            }
          }
        ])
        .toArray();
    }
    if (queriedArticle && !queriedArticle.length) {
      throw new NotFoundException(errorsMessages.itemNotFound);
    } else {
      return queriedArticle.shift();
    }
  }

  public async getPaginatedDocuments (page: number, perPage: number): Promise<PaginatedDocumentsTypes | Document | undefined> {
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
      _id: 1,
      title: { $cond: { if: this._lang === 'pl', then: '$titlePl', else: '$titleEn' } },
      articleType: { $arrayElemAt: ['$articleType', 0] },
      seriePart: 1,
      createdAt: 1,
      updatedAt: 1,
      creator: { $arrayElemAt: ['$creator', 0] },
      content: { $substr: [`$content.${this._lang}`, 0, 250] }
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
            this._articleTypeLookUp,
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
    const articleTypes = await articlesCollection
      .aggregate(pipeline)
      .toArray();
    const { totalPages } = articleTypes[0];
    if (page > totalPages) {
      throw new NotFoundException(errorsMessages.itemsNotFound);
    }

    return articleTypes.shift();
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
      articlesCollection,
      id,
      errorsMessages.invalidId,
      ErrorTypes.INVALIDINPUT
    );

    const docToUpdate = await articlesCollection
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
    const updateArticle = new ArticleEntity();
    updateArticle.titlePl = request.body.titlePl;
    updateArticle.titleEn = request.body.titleEn;
    updateArticle.articleType = request.body.articleType;
    updateArticle.articleTypeId = new ObjectId(request.body.articleTypeId);
    updateArticle.seriePart = request.body.seriePart;
    updateArticle.content = request.body.content;
    updateArticle.isEnabled = request.body.isEnabled;
    // just for validator
    updateArticle.creator = docToUpdate[0].creator;
    delete updateArticle.createdAt;
    updateArticle.tags = request.body.tags;
    await this._validator.validateEntity(updateArticle);
    delete updateArticle.creator;
    await this._validator.validateIsUniqueInCollection(
      articlesCollection,
      {
        titlePl: request.body.titlePl,
        articleTypeId: new ObjectId(request.body.articleTypeId)
      },
      validateIsUniqueInCollectionParams.UPDATE,
      errorsMessages.articleTitleExists,
      id
    );
    return articlesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updateArticle } }
    );
  }

  public async updateStatus (id: string, status: boolean): Promise<updateDocumentTypes | Document> {
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
      articlesCollection,
      id,
      errorsMessages.invalidId,
      ErrorTypes.INVALIDINPUT
    );
    const docToUpdate = await articlesCollection
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
        { $project: { creator: 1, _id: 0 } }
      ])
      .toArray();
    // is the same id and creator  or admin privilege.
    this._validator.isDocumentOwnerOrAdmin(
      docToUpdate[0].creator.toString(),
      this._decodedJwtToken._id,
      this._isAdmin
    );

    return await articlesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isEnabled: status } }
    );
  }
}

export default ArticleRepository;

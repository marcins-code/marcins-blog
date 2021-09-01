import { Request } from 'express';
import RepositoryAbstractClass from './RepositoryAbstractClass';
import { Collection, Document, MongoClient, ObjectId } from 'mongodb';
import { dbName } from '../Utils/dbConnection';
import { errorsMessages } from '../Validator/ErrorMessages';
import { ErrorTypes } from '../Interfaces/Enums';
import {
  deleteDocumentTypes,
  insertDocumentTypes, PaginatedDocumentsTypes,
  updateDocumentTypes
} from '../Interfaces/CustomTypes';
import GlossaryEntity from '../Entity/GlossaryEntity';
import UnauthorizedException from '../Exceptions/UnauthorizedException';
import NotFoundException from '../Exceptions/NotFoundException';

let glossaryCollection: Collection;
// @ts-ignore
let usersCollection: Collection;

class GlossaryRepository extends RepositoryAbstractClass {
  constructor (lang: string, jwtToken: string | undefined = undefined) {
    super(lang, jwtToken);
  }

  static async injectDB (conn: MongoClient | void) {
    if (glossaryCollection) {
      return;
    }
    try {
      if (conn instanceof MongoClient) {
        glossaryCollection = conn.db(dbName).collection('glossary');
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
    const newGlossary = new GlossaryEntity();
    newGlossary.abbreviation = request.body.abbreviation;
    newGlossary.explication = request.body.explication;
    newGlossary.phrase = request.body.phrase;
    newGlossary.explication = request.body.explication;
    newGlossary.explanation = request.body.explanation;
    newGlossary.isEnabled = request.body.isEnabled;
    newGlossary.creator = new ObjectId(this._decodedJwtToken._id);
    await this._validator.validateEntity(newGlossary);

    return await glossaryCollection.insertOne({ ...newGlossary });
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
      glossaryCollection,
      id,
      errorsMessages.invalidId,
      ErrorTypes.INVALIDINPUT
    );
    if (!this._isSuperAdmin) {
      throw new UnauthorizedException(errorsMessages.notSuperAdmin);
    }
    return glossaryCollection.deleteOne({ _id: new ObjectId(id) });
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
      _id: 1,
      abbreviation: 1,
      phrase: 1,
      creator: { $arrayElemAt: ['$creator', 0] },
      explication: 1,
      updatedAt: 1,
      createdAt: 1,
      explanation: `$explanation.${this._lang}`
    };
    const jwtTokenProject = {
      ...noJwtTokenProject,
      isEnabled: 1,
      explanation: 1
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

    const glossary = await glossaryCollection
      .aggregate(pipeline)
      .toArray();
    if (!glossary.length) {
      throw new NotFoundException(errorsMessages.itemNotFound);
    }
    return glossary.shift();
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
      abbreviation: 1,
      phrase: 1,
      explication: 1,
      createdAt: 1,
      updatedAt: 1,
      creator: { $arrayElemAt: ['$creator', 0] },
      explanation: { $substr: [`$explanation.${this._lang}`, 0, 250] }
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
    const glossary = await glossaryCollection
      .aggregate(pipeline)
      .toArray();
    const { totalPages } = glossary[0];
    if (page > totalPages) {
      throw new NotFoundException(errorsMessages.itemsNotFound);
    }

    return glossary.shift();
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
      glossaryCollection,
      id,
      errorsMessages.invalidId,
      ErrorTypes.INVALIDINPUT
    );
    const docToUpdate = await glossaryCollection
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

    const updateGlossary = new GlossaryEntity();
    updateGlossary.abbreviation = request.body.abbreviation;
    updateGlossary.explication = request.body.explication;
    updateGlossary.phrase = request.body.phrase;
    updateGlossary.explication = request.body.explication;
    updateGlossary.explanation = request.body.explanation;
    updateGlossary.isEnabled = request.body.isEnabled;
    // just for validator
    updateGlossary.creator = new ObjectId(this._decodedJwtToken._id);
    await this._validator.validateEntity(updateGlossary);
    delete updateGlossary.creator;
    return await glossaryCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updateGlossary } }
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
      glossaryCollection,
      id,
      errorsMessages.invalidId,
      ErrorTypes.INVALIDINPUT
    );
    const docToUpdate = await glossaryCollection
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
        {
          $project: {
            creator: 1,
            _id: 0
          }
        }
      ])
      .toArray();
    // is the same id and creator  or admin privilege.
    this._validator.isDocumentOwnerOrAdmin(
      docToUpdate[0].creator.toString(),
      this._decodedJwtToken._id,
      this._isAdmin
    );

    return await glossaryCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isEnabled: status } }
    );
  }
}
export default GlossaryRepository;

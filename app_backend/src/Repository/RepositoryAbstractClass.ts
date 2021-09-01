import Validator from '../Validator/Validator';
import {
  customJwtPayload,
  deleteDocumentTypes
} from '../Interfaces/CustomTypes';
import { Request } from 'express';
import { errorsMessages } from '../Validator/ErrorMessages';
import { ErrorTypes } from '../Interfaces/Enums';
import InvalidInputException from '../Exceptions/InvalidInputException';

abstract class RepositoryAbstractClass {
  protected _validator: Validator;
  protected readonly _lang: string;
  protected readonly _jwtToken: string | undefined;
  protected readonly _decodedJwtToken: customJwtPayload;
  protected readonly _isAdmin: boolean;
  protected readonly _isSuperAdmin: boolean;
  protected readonly _creatorLookUp: Object = {
    $lookup: {
      from: 'users',
      let: { id: '$creator' },
      pipeline: [
        {
          $match: { $expr: { $eq: ['$_id', '$$id'] } }
        },
        {
          $project: {
            firstName: 1,
            lastName: 1,
            _id: 1
          }
        }
      ],
      as: 'creator'
    }
  };

  protected constructor (
    lang: string | undefined,
    jwtToken: string | undefined = undefined
  ) {
    this._jwtToken = jwtToken;
    this._validator = new Validator();

    if (!lang) throw new InvalidInputException(errorsMessages.missingLang);
    this._lang = lang;
    this._validator.validateLanguage(this._lang);

    if (this._jwtToken) {
      this._decodedJwtToken = this._validator.validateJwtToken(this._jwtToken);
      this._validator.validateIdAsObjectId(
        this._decodedJwtToken._id,
        errorsMessages.invalidToken,
        ErrorTypes.UNAUTHORIZED
      );
      this._isAdmin = this._decodedJwtToken.roles.some((role: string) =>
        /ADMIN/.test(role)
      );
      this._isSuperAdmin = this._decodedJwtToken.roles.some((role: string) =>
        /SUPERADMIN/.test(role)
      );
    }
  }

  public abstract getPaginatedDocuments(
    page: number,
    perPage: number
  ): Promise<any>;

  public abstract getDocumentById(id: string): Promise<any>;

  public abstract createDocument(request: Request): Promise<any>;

  public abstract updateDocument(id: string, requestBody: Request): Object;

  public abstract deleteDocument(id: string): Promise<deleteDocumentTypes>;

  public abstract updateStatus(id: string, status: boolean): Object;
}

export default RepositoryAbstractClass;

import { validateOrReject } from 'class-validator';
import { Collection, ObjectId } from 'mongodb';
import InvalidInputException from '../Exceptions/InvalidInputException';
import { errorsMessages } from './ErrorMessages';
import {
  ErrorTypes,
  validateIsUniqueInCollectionParams,
  validLanguages
} from '../Interfaces/Enums';
import NotFoundException from '../Exceptions/NotFoundException';
import UnauthorizedException from '../Exceptions/UnauthorizedException';
import Encryption from '../Security/Encryption';
import { commonRegex } from './commonRegex';
import BadRequestException from '../Exceptions/BadRequestException';

class Validator {
  private encryption: Encryption;
  constructor () {
    this.encryption = new Encryption();
  }

  async validateEntity (obj: Object): Promise<any> {
    try {
      return await validateOrReject(obj);
    } catch (errors: any) {
      if (errors) {
        const [firstMessage]: string[] = Object.values(errors[0].constraints);
        throw new InvalidInputException(firstMessage);
      }
    }
  }

  validateEmail (email: string): void {
    if (!commonRegex.email.test(email)) {
      throw new InvalidInputException(errorsMessages.invalidEmailFormat);
    }
  }

  public async validateIsUniqueInCollection (
    collection: Collection,
    filter: Object,
    params: validateIsUniqueInCollectionParams,
    message: string,
    id: string = ''
  ): Promise<void> {
    if (params === 1) {
      filter = {
        ...filter,
        _id: { $ne: new ObjectId(id) }
      };
    }
    const docNo = await collection.countDocuments(filter);
    const isNotUnique = docNo > 0;
    if (isNotUnique) {
      throw new InvalidInputException(message);
    }
  }

  public isInteger (variable: number, message: string): void {
    if (!Number.isInteger(variable)) {
      throw new InvalidInputException(message);
    }
  }

  public validateLanguage (lang: string | undefined) {
    if (!lang) throw new InvalidInputException(errorsMessages.missingLang);
    if (!Object.values(validLanguages).includes(lang) && true) {
      throw new InvalidInputException(errorsMessages.invalidLang);
    }

    return lang;
  }

  public async validateIdExistsInCollection (
    collection: Collection,
    id: string,
    message: string,
    errorType: ErrorTypes
  ): Promise<void> {
    const docNo = await collection.countDocuments({ _id: new ObjectId(id) });
    if (!docNo) {
      switch (errorType) {
        case ErrorTypes.INVALIDINPUT:
          throw new InvalidInputException(message);
        case ErrorTypes.NOTFOUND:
          throw new NotFoundException(message);
        case ErrorTypes.UNAUTHORIZED:
          throw new UnauthorizedException(message);
        case ErrorTypes.BADREQUEST:
          throw new BadRequestException(message);
        default:
          throw new Error(message);
      }
    }
  }

  validateIdAsObjectId (
    id: string,
    message: string,
    errorType: ErrorTypes
  ): void {
    if (!id) {
      throw new InvalidInputException(errorsMessages.invalidId);
    }
    const validId = ObjectId.isValid(id);
    if (!validId) {
      switch (errorType) {
        case ErrorTypes.INVALIDINPUT:
          throw new InvalidInputException(message);
        case ErrorTypes.NOTFOUND:
          throw new NotFoundException(message);
        case ErrorTypes.UNAUTHORIZED:
          throw new UnauthorizedException(message);
        case ErrorTypes.BADREQUEST:
          throw new BadRequestException(message);
        default:
          throw new Error(message);
      }
    }
  }

  public validateIsJwtToken (jwtToken: string | undefined): void {
    if (!jwtToken) {
      throw new UnauthorizedException(errorsMessages.missingAuthorization);
    }
  }

  public validateJwtToken (jwtToken: string) {
    this.validateIsJwtToken(jwtToken);
    let tokenData;
    try {
      tokenData = this.encryption.verifyJwtToken(jwtToken);
    } catch (err) {
      throw new UnauthorizedException(errorsMessages.invalidToken);
    }
    return tokenData;
  }

  public isDocumentOwnerOrAdmin (
    id: string,
    idToCompare: string,
    isAdmin: boolean
  ) {
    if (id !== idToCompare && !isAdmin) {
      throw new UnauthorizedException(errorsMessages.notAuthorized);
    }
  }
}

export default Validator;

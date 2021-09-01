import { IsDefined, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { errorsMessages } from '../Validator/ErrorMessages';
import { ObjectId } from 'mongodb';

class GlossaryEntity {
  _id?: ObjectId;

  @ValidateIf((o) => o.phrase === undefined || o.phrase === '')
  @IsDefined({ message: errorsMessages.abrOrPhraseIsRequired })
  @MinLength(2, { message: errorsMessages.abbTooShort })
  @MaxLength(10, { message: errorsMessages.abbTooLong })
  abbreviation: string;

  @ValidateIf((o) => o.abbreviation === '' || o.abbreviation === undefined)
  @IsDefined({ message: errorsMessages.abrOrPhraseIsRequired })
  @MinLength(2, { message: errorsMessages.phraseTooShort })
  @MaxLength(100, { message: errorsMessages.phraseTooLong })
  phrase: string | undefined;

  @ValidateIf((o) => o.abbreviation !== '')
  @IsDefined({ message: errorsMessages.explicationIsRequired })
  @MinLength(2, { message: errorsMessages.explicationTooShort })
  @MaxLength(100, { message: errorsMessages.explicationTooLong })
  explication: string;

  explanation: {
    pl: string;
    en: string;
  };

  creator?: ObjectId;
  isEnabled: boolean = false;
  createdAt?: Date = new Date(Date.now());
  updatedAt?: Date = new Date(Date.now());
}

export default GlossaryEntity;

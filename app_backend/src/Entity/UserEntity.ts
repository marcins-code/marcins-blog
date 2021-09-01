import { IsDefined, Matches, MaxLength, MinLength } from 'class-validator';
import { commonRegex } from '../Validator/commonRegex';
import { ObjectId } from 'mongodb';
import { errorsMessages } from '../Validator/ErrorMessages';

class UserEntity {
  _id?: ObjectId;

  // TODO move error to errorMessage
  @IsDefined({
    message: errorsMessages.firstNameIsRequired
  })
  @MinLength(2, {
    message: errorsMessages.firstNameTooShort
  })
  @MaxLength(50, {
    message: errorsMessages.firstNameTooLong
  })
  @Matches(commonRegex.names, {
    message: errorsMessages.firstNameNotMatch
  })
  firstName: string;

  @IsDefined({
    message: errorsMessages.lastNameIsRequired
  })
  @MinLength(2, {
    message: errorsMessages.lastNameTooShort
  })
  @MaxLength(50, {
    message: errorsMessages.lastNameTooLong
  })
  @Matches(commonRegex.names, {
    message: errorsMessages.lastNameNotMatch
  })
  lastName: string;

  @IsDefined({ message: errorsMessages.emailIsRequired })
  @MaxLength(255, {
    message: errorsMessages.emailTooLong
  })
  @Matches(commonRegex.email, {
    message: errorsMessages.invalidEmailFormat
  })
  email: string;

  @IsDefined({ message: errorsMessages.passwordIsRequired })
  @Matches(commonRegex.password, {
    message: errorsMessages.passwordNotMatch
  })
  password: string;

  isEnabled: boolean = false;
  avatar: string;
  roles: string[] = ['ROLE_USER'];
  aboutMe: { pl: string; en: string };
  createdAt?: Date = new Date(Date.now());
  updatedAt: Date = new Date(Date.now());
}

export default UserEntity;

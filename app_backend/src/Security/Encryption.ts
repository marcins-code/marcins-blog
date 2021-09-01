import fs from 'fs';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import UnauthorizedException from '../Exceptions/UnauthorizedException';
import { errorsMessages } from '../Validator/ErrorMessages';
import { customJwtPayload } from '../Interfaces/CustomTypes';

const privateKey = fs.readFileSync('private.key');
const saltRounds = 10;

class Encryption {
  public async hashPassword (password: string) {
    return await bcrypt.hash(password, saltRounds);
  }

  public async comparePassword (
    plainPassword: string,
    hashedPassword: string
  ): Promise<void> {
    const isValidPassword = await bcrypt.compare(plainPassword, hashedPassword);

    if (!isValidPassword) {
      throw new UnauthorizedException(errorsMessages.incorrectPassword);
    }
  }

  public signJwtToken (items: Object, expiration: string): string {
    return jwt.sign(items, privateKey, { expiresIn: expiration });
  }

  public verifyJwtToken (token: string): customJwtPayload {
    try {
      return <customJwtPayload>jwt.verify(token, privateKey);
    } catch (err) {
      throw new UnauthorizedException(err.message);
    }
  }
}

export default Encryption;

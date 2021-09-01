export default class NotFoundException extends Error {
  code: number;

  constructor (message: string, errorCode: number = 404) {
    super(message);
    this.code = errorCode;
  }
}

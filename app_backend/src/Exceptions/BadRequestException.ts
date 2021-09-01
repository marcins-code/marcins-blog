class BadRequestException extends Error {
  code: number;
  constructor (message: string, errorCode: number = 400) {
    super(message);
    this.code = errorCode;
  }
}
export default BadRequestException;

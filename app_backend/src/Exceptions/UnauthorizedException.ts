class UnauthorizedException extends Error {
  code: number;
  constructor (message: string, errorCode: number = 401) {
    super(message);
    this.code = errorCode;
  }
}
export default UnauthorizedException;

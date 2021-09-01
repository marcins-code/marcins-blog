class InvalidInputException extends Error {
  code: number;
  constructor (message: string, errorCode: number = 422) {
    super(message);
    this.code = errorCode;
  }
}

export default InvalidInputException;

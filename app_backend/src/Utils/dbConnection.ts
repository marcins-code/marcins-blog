import dotenv from 'dotenv';
dotenv.config();

export const dbName =
  process.env.NODE_ENV === 'production'
    ? process.env.MONGO_DB
    : process.env.MONGO_TEST_DB;
export const uri = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${dbName}?authSource=admin`;
export const connectionOptions = { wtimeoutMS: 2500, useNewUrlParser: true };

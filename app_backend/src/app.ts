import express, { Application } from 'express';
import users from './Router/userRouter';

const app: Application = express();

app.use('/', users);

export default app;

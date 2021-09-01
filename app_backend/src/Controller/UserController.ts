import UserRepository from '../Repository/UserRepository';
import { NextFunction, Request, Response } from 'express';
import Authentication from '../Repository/Authentication';
import Validator from '../Validator/Validator';

class UserController {
  static async signUp (req: Request, res: Response, next: NextFunction) {
    try {
      console.log(req.body);
      const repository = new Authentication();
      const signUp = await repository.signUp(req.body);
      res.status(201).json({ ...signUp });
    } catch (err) {
      return next(res.status(err.code).json(err.message));
    }
  }

  static async getAllUsers (req: Request, res: Response, next: NextFunction) {
    try {
      // let lang;
      // if (req.headers['application-language']) {
      //   lang = req.headers['application-language'].toString();
      // } else {
      //   lang = undefined;
      // }
      const validator = new Validator();
      const lang = validator.validateLanguage(req.headers['application-language']!.toString());
      // validator.validateLanguage(lang);
      const repository = new UserRepository(lang);
      const perPage = parseInt(req.query.perPage!.toString());
      const page = parseInt(req.query.page!.toString());
      const users = await repository.getPaginatedDocuments(page, perPage);

      res.status(200).json({ ...users });
    } catch (err) {
      return next(res.status(err.code).json(err.message));
    }
  }

  static async getUserById (req: Request, res: Response, next: NextFunction) {
    try {
      // console.log(req.query);
      // let lang;
      // if (req.query.lang) {
      //   lang = req.query.lang!.toString();
      //   console.log(lang);
      // } else {
      //   lang = null;
      // }
      // const id = req.params.id;
      // console.log(req.params);
      // @ts-ignore
      // console.log(req.headers);
      // @ts-ignore
      const repository = new UserRepository('pl');
      const user = await repository.getDocumentById(req.params.id);
      res.status(200).json({ ...user });
    } catch (err) {
      return next(res.status(err.code).json(err.message));
    }
  }
}

export default UserController;

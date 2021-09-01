import { Router } from 'express';
import UserController from '../Controller/UserController';

const router = Router();

router.get('/users', UserController.getAllUsers);
router.get('/user/:id', UserController.getUserById);

router.post('user/signUp', UserController.signUp);

export default router;

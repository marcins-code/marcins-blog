// import ArticleTypeRepository from '../../../src/Repository/ArticleTypeRepository';
// import { articleTypeForTests, invalidIdFormats, someMongoId } from '../../utils/exampleData';
// import { Request } from 'express';
// import { errorsMessages } from '../../../src/Validator/ErrorMessages';
// import TestHelpersClass from '../../utils/testHelpers';
// import faker from 'faker';
// import { ObjectId } from 'mongodb';
// import Authentication from '../../../src/Repository/Authentication';

// describe('Querying single document with \'getDocumentById\' method', () => {
//   describe('Errors handling', () => {
//     it('Should be error when is invalid id format', async () => {
//       const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//       for (const invalidIdFormat of invalidIdFormats) {
//         try {
//           const queriedAType = await repository.getDocumentById(invalidIdFormat);
//           expect(queriedAType).toThrowError();
//         } catch (err) {
//           expect(err.code).toEqual(422);
//           expect(err.message).toEqual(errorsMessages.invalidIdFormat);
//         }
//       }
//     });
//
//     it('Should be error when id does not exists articleTypes collection', async () => {
//       const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//
//       try {
//         const queriedAType = await repository.getDocumentById(someMongoId.toHexString());
//         expect(queriedAType).toThrowError();
//       } catch (err) {
//         expect(err.code).toEqual(404);
//         expect(err.message).toEqual(errorsMessages.articleTypeNotFound);
//       }
//     });
//     it('Should be error when id encoded in jwtToken does not exist in user collection', async () => {
//       const repository = await new ArticleTypeRepository('pl', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
//       try {
//         const queriedAType = await repository.getDocumentById(firstDoc!._id.toString());
//         expect(queriedAType).toThrowError();
//       } catch (err) {
//         expect(err.code).toEqual(401);
//         expect(err.message).toEqual(errorsMessages.invalidToken);
//       }
//     });
//   });
//   describe('Validation response without jwtToken', () => {
//     it('Should be not possible to query disable document', async () => {
//       const firstDisabled = await TestHelpersClass.getSomeDisabledDocument(articleTypesCollection, 1);
//       const repository = new ArticleTypeRepository('en');
//       try {
//         const queriedAType = await repository.getDocumentById(firstDisabled!._id.toString());
//         expect(queriedAType).toThrowError();
//       } catch (err) {
//         expect(err.code).toEqual(404);
//         expect(err.message).toEqual(errorsMessages.articleTypeNotFound);
//       }
//     });
//     it('Should be proper object with pl language', async () => {
//       const repository = new ArticleTypeRepository('pl');
//       const queriedAType = await repository.getDocumentById(firstDoc!._id.toString());
//       // eslint-disable-next-line no-unused-expressions
//       // expect(() => { queriedAType; }).not.toThrowError();
//       expect(queriedAType!.name).toEqual(firstDoc!.name);
//       expect(queriedAType!.type).toEqual(firstDoc!.type);
//       expect(queriedAType!.icon).toEqual(firstDoc!.icon);
//       expect(queriedAType!.description).toEqual(firstDoc!.description.pl);
//       expect(typeof queriedAType!.creator.firstName).toBe('string');
//       expect(typeof queriedAType!.creator.lastName).toBe('string');
//     });
//     it('Should be proper object with en language', async () => {
//       const repository = new ArticleTypeRepository('en');
//       const queriedAType = await repository.getDocumentById(firstDoc!._id.toString());
//       // eslint-disable-next-line no-unused-expressions
//       // expect(() => { queriedAType; }).not.toThrowError();
//       expect(queriedAType!.name).toEqual(firstDoc!.name);
//       expect(queriedAType!.type).toEqual(firstDoc!.type);
//       expect(queriedAType!.icon).toEqual(firstDoc!.icon);
//       expect(queriedAType!.description).toEqual(firstDoc!.description.en);
//       expect(typeof queriedAType!.creator.firstName).toBe('string');
//       expect(typeof queriedAType!.creator.lastName).toBe('string');
//     });
//   });
//   describe('Validation response with jwtToken', () => {
//     it('Should be proper object with pl language', async () => {
//       const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//       const queriedAType = await repository.getDocumentById(firstDoc!._id.toString());
//       // eslint-disable-next-line no-unused-expressions
//       // expect(() => { queriedAType; }).not.toThrowError();
//       expect(queriedAType!.name).toEqual(firstDoc!.name);
//       expect(queriedAType!.type).toEqual(firstDoc!.type);
//       expect(queriedAType!.icon).toEqual(firstDoc!.icon);
//       expect(queriedAType!.isEnabled).toEqual(firstDoc!.isEnabled);
//       expect(queriedAType!.description).toEqual(firstDoc!.description);
//       expect(typeof queriedAType!.creator.firstName).toBe('string');
//       expect(typeof queriedAType!.creator.lastName).toBe('string');
//       expect(queriedAType!.creator._id).toBeInstanceOf(ObjectId);
//     });
//     it('Should be proper object with en language', async () => {
//       const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//       const queriedAType = await repository.getDocumentById(firstDoc!._id.toString());
//       // eslint-disable-next-line no-unused-expressions
//       // expect(() => { queriedAType; }).not.toThrowError();
//       expect(queriedAType!.name).toEqual(firstDoc!.name);
//       expect(queriedAType!.type).toEqual(firstDoc!.type);
//       expect(queriedAType!.icon).toEqual(firstDoc!.icon);
//       expect(queriedAType!.isEnabled).toEqual(firstDoc!.isEnabled);
//       expect(queriedAType!.description).toEqual(firstDoc!.description);
//       expect(typeof queriedAType!.creator.firstName).toBe('string');
//       expect(typeof queriedAType!.creator.lastName).toBe('string');
//       expect(queriedAType!.creator._id).toBeInstanceOf(ObjectId);
//     });
//   });
// });

//












// describe('Updating status', () => {
//   describe('Error handling', () => {
//     it('Should be error without jwtToken', async () => {
//       const repository = new ArticleTypeRepository('pl');
//       try {
//         const updateStatus = await repository.updateStatus(firstDoc!._id.toString(), false);
//         expect(updateStatus).toThrowError();
//       } catch (err) {
//         expect(err.code).toEqual(401);
//         expect(err.message).toEqual(errorsMessages.missingAuthorization);
//       }
//     });
//     it('Should be error if encoded in jwtToken id does not exists in user collection', async () => {
//       const repository = new ArticleTypeRepository('pl', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
//       try {
//         const updateStatus = await repository.updateStatus(firstDoc!._id.toString(), false);
//         expect(updateStatus).toThrowError();
//       } catch (err) {
//         expect(err.code).toEqual(401);
//         expect(err.message).toEqual(errorsMessages.invalidToken);
//       }
//     });
//     it('Should be error if given id has invalid format', async () => {
//       const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//       for (const invalidIdFormat of invalidIdFormats) {
//         try {
//           const updateStatus = await repository.updateStatus(invalidIdFormat, false);
//           expect(updateStatus).toThrowError();
//         } catch (err) {
//           expect(err.code).toEqual(422);
//           expect(err.message).toEqual(errorsMessages.invalidIdFormat);
//         }
//       }
//     });
//     it('Should be error if given id does not exists in articleTypes collection', async () => {
//       const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//
//       try {
//         const updateStatus = await repository.updateStatus(someMongoId.toHexString(), false);
//         expect(updateStatus).toThrowError();
//       } catch (err) {
//         expect(err.code).toEqual(422);
//         expect(err.message).toEqual(errorsMessages.invalidId);
//       }
//     });
//   });
//   describe('Response validation', () => {
//     it('Should be possible to change status as creator ', async () => {
//       const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//       const updateStatus = await repository.updateStatus(firstDoc!._id.toString(), false);
//       expect(updateStatus.acknowledged).toBe(true);
//       expect(updateStatus.modifiedCount).toBe(1);
//       expect(updateStatus.upsertedId).toBe(null);
//       expect(updateStatus.upsertedCount).toBe(0);
//       expect(updateStatus.matchedCount).toBe(1);
//     });
//
//     it('Should be possible to change status as ADMIN', async () => {
//       const adminUser = await usersCollection.findOne({ roles: ['ROLE_ADMIN'] });
//       const authRepo = new Authentication();
//       const adminLogIn = await authRepo.login(adminUser!.email, adminUser!.firstName);
//       const repository = new ArticleTypeRepository('pl', adminLogIn.jwtToken);
//       const updateStatus = await repository.updateStatus(firstDoc!._id.toString(), true);
//       console.log(updateStatus);
//     });
//     it('Should be isEnabled true', async () => {
//       const firstDoc = await TestHelpersClass.getFirstDocument(articleTypesCollection);
//       expect(firstDoc!.isEnabled).toEqual(true);
//     });
//   });
// });
// describe('Updating document', () => {
//   describe('Error handling', () => {
//     describe('Authorization errors and id errors', () => {
//       it('Should be error without jwtToken', async () => {
//         const repository = new ArticleTypeRepository('pl');
//         try {
//           const updateArType = await repository.updateDocument(firstDoc!._id.toString(), articleTypeForTests as Request);
//           expect(updateArType).toThrowError();
//         } catch (err) {
//           expect(err.code).toEqual(401);
//           expect(err.message).toEqual(errorsMessages.missingAuthorization);
//         }
//       });
//       it('Should be error if id encoded in jwtToken not exists in users collection', async () => {
//         const repository = new ArticleTypeRepository('pl', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
//         try {
//           const updateArType = await repository.updateDocument(firstDoc!._id.toString(), articleTypeForTests as Request);
//           expect(updateArType).toThrowError();
//         } catch (err) {
//           expect(err.code).toEqual(401);
//           expect(err.message).toEqual(errorsMessages.invalidToken);
//         }
//       });
//       it('Should be error if given id is invalid', async () => {
//         const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//         for (const invalidIdFormat of invalidIdFormats) {
//           try {
//             const updateArType = await repository.updateDocument(invalidIdFormat, articleTypeForTests as Request);
//             expect(updateArType).toThrowError();
//           } catch (err) {
//             expect(err.code).toEqual(422);
//             expect(err.message).toEqual(errorsMessages.invalidIdFormat);
//           }
//         }
//       });
//       it('Should be error if given id not exists in articleTypes collection', async () => {
//         const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//         try {
//           const updateArType = await repository.updateDocument(someMongoId.toHexString(), articleTypeForTests as Request);
//           expect(updateArType).toThrowError();
//         } catch (err) {
//           expect(err.code).toEqual(422);
//           expect(err.message).toEqual(errorsMessages.invalidId);
//         }
//       });
//       it('Should be error when not creator or Admin', async () => {
//         const lastDoc = await articleTypesCollection.findOne({}, { skip: 9 });
//         const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//         try {
//           const updateArType = await repository.updateDocument(lastDoc!._id.toString(), articleTypeForTests as Request);
//           expect(updateArType).toThrowError();
//         } catch (err) {
//           expect(err.code).toEqual(401);
//           expect(err.message).toEqual(errorsMessages.notAuthorized);
//         }
//       });
//     });
//     describe('Given fields validation', () => {
//       describe('Name field', () => {
//         it('Should be error when name field is missing', async () => {
//           // @ts-ignore
//           delete articleTypeForTests.body.name;
//           const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//           try {
//             const updateArType = await repository.updateDocument(firstDoc!._id.toString(), articleTypeForTests as Request);
//             expect(updateArType).toThrowError();
//           } catch (err) {
//             expect(err.code).toEqual(422);
//             expect(err.message).toEqual(errorsMessages.articleTypeNameRequired);
//           }
//         });
//         it('Should be error when name field is too short', async () => {
//           articleTypeForTests.body.name = 'D';
//           const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//           try {
//             const updateArType = await repository.updateDocument(firstDoc!._id.toString(), articleTypeForTests as Request);
//             expect(updateArType).toThrowError();
//           } catch (err) {
//             expect(err.code).toEqual(422);
//             expect(err.message).toEqual(errorsMessages.articleTypeTooShort);
//           }
//         });
//         it('Should be error when name field is too long', async () => {
//           articleTypeForTests.body.name = faker.lorem.words(15);
//           const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//           try {
//             const updateArType = await repository.updateDocument(firstDoc!._id.toString(), articleTypeForTests as Request);
//             expect(updateArType).toThrowError();
//           } catch (err) {
//             expect(err.code).toEqual(422);
//             expect(err.message).toEqual(errorsMessages.articleTypeTooLong);
//           }
//         });
//       });
//       describe('Type field', () => {
//         it('Should be error when type field is missing ', async () => {
//           articleTypeForTests.body.name = 'Docker';
//           // @ts-ignore
//           delete articleTypeForTests.body.type;
//           const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//           try {
//             const updateArType = await repository.updateDocument(firstDoc!._id.toString(), articleTypeForTests as Request);
//             expect(updateArType).toThrowError();
//           } catch (err) {
//             expect(err.code).toEqual(422);
//             expect(err.message).toEqual(errorsMessages.articleTypeTypeRequired);
//           }
//         });
//         it('Should be error when is not category or serie', async () => {
//           articleTypeForTests.body.type = 'jakiśTam';
//           const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//           try {
//             const updateArType = await repository.updateDocument(firstDoc!._id.toString(), articleTypeForTests as Request);
//             expect(updateArType).toThrowError();
//           } catch (err) {
//             expect(err.code).toEqual(422);
//             expect(err.message).toEqual(errorsMessages.articleTypeValidTypes);
//           }
//         });
//       });
//       describe('SeriePart field ', () => {
//         it('Should be error when type is serie and seriePart is missing', async () => {
//           articleTypeForTests.body.type = 'serie';
//           // @ts-ignore
//           delete articleTypeForTests.body.seriePart;
//           const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//           try {
//             const updateArType = await repository.updateDocument(firstDoc!._id.toString(), articleTypeForTests as Request);
//             expect(updateArType).toThrowError();
//           } catch (err) {
//             expect(err.code).toEqual(422);
//             expect(err.message).toEqual(errorsMessages.seriePartRequired);
//           }
//         });
//         it('Should be error when type is serie and seriePart is string', async () => {
//           // @ts-ignore
//           articleTypeForTests.body.seriePart = 'bąk';
//           const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//           try {
//             const updateArType = await repository.updateDocument(firstDoc!._id.toString(), articleTypeForTests as Request);
//             expect(updateArType).toThrowError();
//           } catch (err) {
//             expect(err.code).toEqual(422);
//             expect(err.message).toEqual(errorsMessages.seriePartMustBeInt);
//           }
//         });
//         it('Should be error when type is serie and seriePart is not integer', async () => {
//           articleTypeForTests.body.seriePart = 4.6;
//           const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//           try {
//             const updateArType = await repository.updateDocument(firstDoc!._id.toString(), articleTypeForTests as Request);
//             expect(updateArType).toThrowError();
//           } catch (err) {
//             expect(err.code).toEqual(422);
//             expect(err.message).toEqual(errorsMessages.seriePartMustBeInt);
//           }
//         });
//       });
//       describe('Icon field', () => {
//         it('Should be error when icon field is missing ', async () => {
//           articleTypeForTests.body.seriePart = 3;
//           // @ts-ignore
//           delete articleTypeForTests.body.icon;
//           const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//           try {
//             const updateArType = await repository.updateDocument(firstDoc!._id.toString(), articleTypeForTests as Request);
//             expect(updateArType).toThrowError();
//           } catch (err) {
//             expect(err.code).toEqual(422);
//             expect(err.message).toEqual(errorsMessages.articleTypeIconRequired);
//           }
//         });
//       });
//     });
//   });
//   describe('Validating updating document', () => {
//     let newData:any;
//     it('Should be possible to update as creator', async () => {
//       articleTypeForTests.body.icon = 'fa some icon';
//       const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//       try {
//         const updateArType = await repository.updateDocument(firstDoc!._id.toString(), articleTypeForTests as Request);
//         expect(updateArType.acknowledged).toBe(true);
//         expect(updateArType.modifiedCount).toBe(1);
//         expect(updateArType.upsertedId).toBe(null);
//         expect(updateArType.upsertedCount).toBe(0);
//         expect(updateArType.matchedCount).toBe(1);
//       } catch (err) {
//         expect(err).toBeNull();
//       }
//     });
//     it('Should be new data in document', async () => {
//       const updatedFirstDoc = await TestHelpersClass.getFirstDocument(articleTypesCollection);
//       expect(updatedFirstDoc!.name).toEqual(articleTypeForTests.body.name);
//       expect(updatedFirstDoc!.type).toEqual(articleTypeForTests.body.type);
//       expect(updatedFirstDoc!.icon).toEqual(articleTypeForTests.body.icon);
//       expect(updatedFirstDoc!.seriePart).toEqual(articleTypeForTests.body.seriePart);
//       expect(updatedFirstDoc!.creator).toEqual(firstDoc!.creator);
//       expect(updatedFirstDoc!.createdAt).toEqual(firstDoc!.createdAt);
//       expect(updatedFirstDoc!.description).toEqual(articleTypeForTests.body.description);
//     });
//     it('Should be possible to update as admin', async () => {
//       const adminUser = await usersCollection.findOne({ roles: ['ROLE_ADMIN'] });
//       const authRepo = new Authentication();
//       const adminLogIn = await authRepo.login(adminUser!.email, adminUser!.firstName);
//       const repository = new ArticleTypeRepository('pl', adminLogIn.jwtToken);
//       newData = {
//         body: {
//           name: faker.lorem.words(1),
//           type: 'category',
//           icon: faker.lorem.word(),
//           isEnabled: true,
//           description: {
//             pl: 'Opis kategorii',
//             en: 'Category description'
//           }
//         }
//       };
//       try {
//         const updateArType = await repository.updateDocument(firstDoc!._id.toString(), newData as Request);
//         expect(updateArType.acknowledged).toBe(true);
//         expect(updateArType.modifiedCount).toBe(1);
//         expect(updateArType.upsertedId).toBe(null);
//         expect(updateArType.upsertedCount).toBe(0);
//         expect(updateArType.matchedCount).toBe(1);
//       } catch (err) {
//         expect(err).toBeNull();
//       }
//     });
//     it('Should be new data in document', async () => {
//       const updatedFirstDoc = await TestHelpersClass.getFirstDocument(articleTypesCollection);
//       expect(updatedFirstDoc!.name).not.toEqual(articleTypeForTests.body.name);
//       expect(updatedFirstDoc!.type).toEqual(newData.body.type);
//       expect(updatedFirstDoc!.icon).not.toEqual(articleTypeForTests.body.icon);
//       expect(updatedFirstDoc!.seriePart).toEqual(null);
//       expect(updatedFirstDoc!.creator).toEqual(firstDoc!.creator);
//       expect(updatedFirstDoc!.createdAt).toEqual(firstDoc!.createdAt);
//       expect(updatedFirstDoc!.description).toEqual(newData.body.description);
//     }); ;
//   });
// });
// describe('Deleting article types', () => {
//   describe('Handling errors', () => {
//     it('Should be error without jwtToken', async () => {
//       const repository = new ArticleTypeRepository('pl');
//       try {
//         const deleteAType = await repository.deleteDocument(someMongoId.toHexString());
//         expect(deleteAType).toThrowError();
//       } catch (err) {
//         expect(err.code).toEqual(401);
//         expect(err.message).toEqual(errorsMessages.missingAuthorization);
//       }
//     });
//     it('Should be error with invalid id format', async () => {
//       const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//       for (const invalidIdFormat of invalidIdFormats) {
//         try {
//           const updateStatus = await repository.deleteDocument(invalidIdFormat);
//           expect(updateStatus).toThrowError();
//         } catch (err) {
//           expect(err.code).toEqual(422);
//           expect(err.message).toEqual(errorsMessages.invalidIdFormat);
//         }
//       }
//     });
//     it('Should be error if given id not exist in collection', async () => {
//       const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//       try {
//         const changeStatus = await repository.deleteDocument(someMongoId.toHexString());
//         expect(changeStatus).toThrowError();
//       } catch (err) {
//         expect(err.code).toEqual(422);
//         expect(err.message).toEqual(errorsMessages.invalidId);
//       }
//     });
//     it('Should be not possible to delete id encoded in jwtToken which not exists in db', async () => {
//       const repository = new ArticleTypeRepository('pl', TestHelpersClass.makeJwtTokenWithIdNotExistsInUsersCollection());
//       try {
//         const deleteUser = await repository.deleteDocument(firstDoc!._id.toLocaleString());
//         expect(deleteUser).toThrowError();
//       } catch (err) {
//         expect(err.code).toEqual(401);
//         expect(err.message).toEqual(errorsMessages.invalidToken);
//       }
//     });
//     it('Should be not possible to delete without SUPERADMIN privilege', async () => {
//       const repository = new ArticleTypeRepository('pl', firstUserLogIn.jwtToken);
//       try {
//         const deleteUser = await repository.deleteDocument(firstDoc!._id.toLocaleString());
//         expect(deleteUser).toThrowError();
//       } catch (err) {
//         expect(err.code).toEqual(401);
//         expect(err.message).toEqual(errorsMessages.notSuperAdmin);
//       }
//     });
//   });
//   describe('Deleting article type', () => {
//     it('Should be possible to delete user with SUPERADMIN', async () => {
//       const superAdmin = await usersCollection.findOne({ roles: ['ROLE_SUPERADMIN'] });
//       const authRepo = new Authentication();
//       const logInSUPERADMIN = await authRepo.login(superAdmin!.email, superAdmin!.firstName);
//       const repository = new ArticleTypeRepository('pl', logInSUPERADMIN.jwtToken);
//       const lastDoc = await articleTypesCollection.findOne({}, { skip: 10 });
//       try {
//         const deleteDoc = await repository.deleteDocument(lastDoc!._id.toString());
//         expect(deleteDoc.acknowledged).toEqual(true);
//         expect(deleteDoc.deletedCount).toEqual(1);
//       } catch (err) {
//         expect(err).toBeNull();
//       }
//     });
//     it('Should be initial number of documents in collection', async () => {
//       const totalDocuments = await articleTypesCollection.countDocuments();
//       expect(totalDocuments).toEqual(docsQty);
//     });
//   });
// });

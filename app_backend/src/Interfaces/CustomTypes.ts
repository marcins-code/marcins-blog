import { Document, ObjectId } from 'mongodb';
import { JwtPayload } from 'jsonwebtoken';

export interface loginTypes {
  jwtToken: string;
  firstName: string;
  lastName: string;
  _id: string;
}

export interface PaginatedDocumentsTypes {
  data: Document[];
  docsOnPage: number;
  totalDocs: number;
  totalPages: number;
  currentPage: number;
}

export interface customJwtPayload extends JwtPayload {
  _id: string;
  roles: string[];
}

export interface updateDocumentTypes extends Document {
  acknowledged: boolean;
  modifiedCount: number;
  upsertedId: any;
  upsertedCount: number;
  matchedCount: number;
}

export interface deleteDocumentTypes {
  acknowledged: boolean;
  deletedCount: number;
}

export interface insertDocumentTypes {
  acknowledged: boolean;
  insertedId: ObjectId;
}

declare module 'mongoose' {

  type MongooseQueryAndDocumentMiddleware = 'remove' | 'updateOne' | 'deleteOne';

  type MongooseDistinctDocumentMiddleware = 'validate' | 'save' | 'init';
  type MongooseDefaultDocumentMiddleware = MongooseDistinctDocumentMiddleware | 'remove';
  type MongooseDocumentMiddleware = MongooseDistinctDocumentMiddleware | MongooseQueryAndDocumentMiddleware;

  type MongooseDistinctQueryMiddleware = 'count' | 'estimatedDocumentCount' | 'countDocuments' | 'deleteMany' | 'distinct' | 'find' | 'findOne' | 'findOneAndDelete' | 'findOneAndRemove' | 'findOneAndReplace' | 'findOneAndUpdate' | 'replaceOne' | 'update' | 'updateMany';
  type MongooseDefaultQueryMiddleware = MongooseDistinctQueryMiddleware | 'updateOne' | 'deleteOne';
  type MongooseQueryMiddleware = MongooseDistinctQueryMiddleware | MongooseQueryAndDocumentMiddleware;

  type MongooseQueryOrDocumentMiddleware = MongooseDistinctQueryMiddleware|MongooseDistinctDocumentMiddleware|MongooseQueryAndDocumentMiddleware;

  type MiddlewareOptions = { document?: boolean, query?: boolean };
  type SchemaPreOptions = MiddlewareOptions;
  type SchemaPostOptions = MiddlewareOptions;

  type PreMiddlewareFunction<ThisType = any> = (this: ThisType, next: CallbackWithoutResultAndOptionalError) => void | Promise<void>;
  type PreSaveMiddlewareFunction<ThisType = any> = (this: ThisType, next: CallbackWithoutResultAndOptionalError, opts: SaveOptions) => void | Promise<void>;
  type PostMiddlewareFunction<ThisType = any, ResType = any> = (this: ThisType, res: ResType, next: CallbackWithoutResultAndOptionalError) => void | Promise<void>;
  type ErrorHandlingMiddlewareFunction<ThisType = any, ResType = any> = (this: ThisType, err: NativeError, res: ResType, next: CallbackWithoutResultAndOptionalError) => void;
}

declare module 'mongoose' {

  type MongooseDistinctDocumentMiddleware = 'validate' | 'save' | 'init';
  type MongooseDocumentMiddleware = MongooseDistinctDocumentMiddleware | 'remove' | 'updateOne' | 'deleteOne';
  type MongooseDistinctQueryMiddleware = 'count' | 'estimatedDocumentCount' | 'countDocuments' | 'deleteMany' | 'distinct' | 'find' | 'findOne' | 'findOneAndDelete' | 'findOneAndRemove' | 'findOneAndReplace' | 'findOneAndUpdate' | 'replaceOne' | 'update' | 'updateMany';
  type MongooseQueryMiddleware = MongooseDistinctQueryMiddleware | 'remove' | 'updateOne' | 'deleteOne';
  type MongooseQueryOrDocumentMiddleware = MongooseQueryMiddleware| MongooseDocumentMiddleware;

  type MiddlewareOptions = { document?: boolean, query?: boolean };
  type SchemaPreOptions = MiddlewareOptions;
  type SchemaPostOptions = MiddlewareOptions;

  type PreMiddlewareFunction<ThisType = any> = (this: ThisType, next: CallbackWithoutResultAndOptionalError) => void | Promise<void>;
  type PreSaveMiddlewareFunction<ThisType = any> = (this: ThisType, next: CallbackWithoutResultAndOptionalError, opts: SaveOptions) => void | Promise<void>;
  type PostMiddlewareFunction<ThisType = any, ResType = any> = (this: ThisType, res: ResType, next: CallbackWithoutResultAndOptionalError) => void | Promise<void>;
  type ErrorHandlingMiddlewareFunction<ThisType = any, ResType = any> = (this: ThisType, err: NativeError, res: ResType, next: CallbackWithoutResultAndOptionalError) => void;
}

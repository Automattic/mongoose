declare module 'mongoose' {

  type MongooseQueryAndDocumentMiddleware = 'updateOne' | 'deleteOne';

  type MongooseDistinctDocumentMiddleware = 'save' | 'init' | 'validate';
  type MongooseDocumentMiddleware = MongooseDistinctDocumentMiddleware | MongooseQueryAndDocumentMiddleware;

  type MongooseDistinctQueryMiddleware = 'count' | 'estimatedDocumentCount' | 'countDocuments' | 'deleteMany' | 'distinct' | 'find' | 'findOne' | 'findOneAndDelete' | 'findOneAndRemove' | 'findOneAndReplace' | 'findOneAndUpdate' | 'replaceOne' | 'updateMany';
  type MongooseDefaultQueryMiddleware = MongooseDistinctQueryMiddleware | 'updateOne' | 'deleteOne';
  type MongooseQueryMiddleware = MongooseDistinctQueryMiddleware | MongooseQueryAndDocumentMiddleware;

  type MongooseQueryOrDocumentMiddleware = MongooseDistinctQueryMiddleware|MongooseDistinctDocumentMiddleware|MongooseQueryAndDocumentMiddleware;

  type MiddlewareOptions = {
    /**
      * Enable this Hook for the Document Methods
      * @default true
      */
    document?: boolean,
    /**
      * Enable this Hook for the Query Methods
      * @default true
      */
    query?: boolean,
    /**
      * Explicitly set this function to be a Error handler instead of based on how many arguments are used
      * @default false
      */
    errorHandler?: boolean
  };
  type SchemaPreOptions = MiddlewareOptions;
  type SchemaPostOptions = MiddlewareOptions;

  type PreMiddlewareFunction<ThisType = any> = (this: ThisType, next: CallbackWithoutResultAndOptionalError) => void | Promise<void>;
  type PreSaveMiddlewareFunction<ThisType = any> = (this: ThisType, next: CallbackWithoutResultAndOptionalError, opts: SaveOptions) => void | Promise<void>;
  type PostMiddlewareFunction<ThisType = any, ResType = any> = (this: ThisType, res: ResType, next: CallbackWithoutResultAndOptionalError) => void | Promise<void>;
  type ErrorHandlingMiddlewareFunction<ThisType = any, ResType = any> = (this: ThisType, err: NativeError, res: ResType, next: CallbackWithoutResultAndOptionalError) => void;
  type ErrorHandlingMiddlewareWithOption<ThisType = any, ResType = any> = (this: ThisType, err: NativeError, res: ResType | null, next: CallbackWithoutResultAndOptionalError) => void | Promise<void>;
}

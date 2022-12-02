declare module 'mongoose' {

  type MongooseDocumentMiddleware = 'validate' | 'save' | 'remove' | 'updateOne' | 'deleteOne' | 'init';
  type MongooseQueryMiddleware = 'count' | 'estimatedDocumentCount' | 'countDocuments' | 'deleteMany' | 'deleteOne' | 'distinct' | 'find' | 'findOne' | 'findOneAndDelete' | 'findOneAndRemove' | 'findOneAndReplace' | 'findOneAndUpdate' | 'remove' | 'replaceOne' | 'update' | 'updateOne' | 'updateMany';

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

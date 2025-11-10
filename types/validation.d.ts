declare module 'mongoose' {
  type SchemaValidator<T, THydratedDocumentType> = RegExp |
    [RegExp, string] |
    Function |
    [Function, string] |
    ValidateOpts<T, THydratedDocumentType> |
    ValidateOpts<T, THydratedDocumentType>[];

  interface ValidatorProps {
    path: string;
    fullPath: string;
    value: any;
    reason?: Error;
  }

  interface ValidatorMessageFn {
    (props: ValidatorProps): string;
  }

  type ValidateFn<T, THydratedDocumentType> = (
    this: THydratedDocumentType | Query<unknown, THydratedDocumentType>,
    value: any,
    props?: ValidatorProps & Record<string, any>
  ) => boolean;

  type AsyncValidateFn<T, THydratedDocumentType> = (
    this: THydratedDocumentType | Query<unknown, THydratedDocumentType>,
    value: any,
    props?: ValidatorProps & Record<string, any>
  ) => Promise<boolean>;

  interface ValidateOpts<T, THydratedDocumentType> {
    msg?: string;
    message?: string | ValidatorMessageFn;
    type?: string;
    validator: ValidateFn<T, THydratedDocumentType> | AsyncValidateFn<T, THydratedDocumentType>;
    propsParameter?: boolean;
  }
}

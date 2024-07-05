declare module 'mongoose' {

  type SchemaValidator<T, EnforcedDocType> = RegExp | [RegExp, string] | Function | [Function, string] | ValidateOpts<T, EnforcedDocType> | ValidateOpts<T, EnforcedDocType>[];

  interface ValidatorProps {
    path: string;
    fullPath: string;
    value: any;
    reason?: Error;
  }

  interface ValidatorMessageFn {
    (props: ValidatorProps): string;
  }

  type ValidateFn<T, EnforcedDocType> =
    (this: EnforcedDocType, value: any, props?: ValidatorProps & Record<string, any>) => boolean;

  type AsyncValidateFn<T, EnforcedDocType> =
    (this: EnforcedDocType, value: any, props?: ValidatorProps & Record<string, any>) => Promise<boolean>;

  interface ValidateOpts<T, EnforcedDocType> {
    msg?: string;
    message?: string | ValidatorMessageFn;
    type?: string;
    validator: ValidateFn<T, EnforcedDocType>
    | AsyncValidateFn<T, EnforcedDocType>;
    propsParameter?: boolean;
  }
}

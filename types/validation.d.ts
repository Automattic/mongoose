declare module 'mongoose' {

  type SchemaValidator<T> = RegExp | [RegExp, string] | Function | [Function, string] | ValidateOpts<T> | ValidateOpts<T>[];

  interface ValidatorProps {
    path: string;
    value: any;
  }

  interface ValidatorMessageFn {
    (props: ValidatorProps): string;
  }

  interface ValidateFn<T> {
    (value: T): boolean;
  }

  interface LegacyAsyncValidateFn<T> {
    (value: T, done: (result: boolean) => void): void;
  }

  interface AsyncValidateFn<T> {
    (value: any): Promise<boolean>;
  }

  interface ValidateOpts<T> {
    msg?: string;
    message?: string | ValidatorMessageFn;
    type?: string;
    validator: ValidateFn<T> | LegacyAsyncValidateFn<T> | AsyncValidateFn<T>;
  }
}

declare module 'mongoose' {
  type CallbackError = typeof global.Error | null;

  type Callback<T = any> = (error: CallbackError, result: T) => void;

  type CallbackWithoutResult = (error: CallbackError) => void;
  type CallbackWithoutResultAndOptionalError = (error?: CallbackError) => void;
}

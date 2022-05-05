
declare module 'mongoose' {

  type IfEquals<T, U, Y = true, N = false> =
        (<G>() => G extends T ? 1 : 0) extends
        (<G>() => G extends U ? 1 : 0) ? Y : N;

  type PopulateAFromB<A, B> = A & Omit<B, keyof A>;
  type x = PopulateAFromB<{
    name: string;
  }, LeanDocumentBaseType>;

}


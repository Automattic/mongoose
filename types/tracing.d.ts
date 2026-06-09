declare module 'mongoose' {
  interface TracingContext {
    operation: string;
    collection: string;
    database: string;
    serverAddress: string;
    serverPort: number;
    args: Record<string, any>;
  }
}

/// <reference path="./utility.d.ts" />

declare module 'mongoose' {
    type VirtualPathFunctions<DocType = {}, PathType = unknown, TInstanceMethods = {}> = {
      get?: (this: Document<any, any, DocType> & DocType) => PathType;
      set?: (this: Document<any, any, DocType> & DocType, ...args: any) => unknown;
      options?: VirtualTypeOptions<HydratedDocument<DocType, TInstanceMethods>, DocType>;
    };

    type VirtualsSchemaOptionsPropertyType<DocType = any, virtualPaths = Record<any, unknown>, TInstanceMethods = {}> = {
      [K in keyof virtualPaths]: VirtualPathFunctions<IsItRecordAndNotAny<DocType> extends true ? DocType : any, virtualPaths[K], TInstanceMethods>
    };
}
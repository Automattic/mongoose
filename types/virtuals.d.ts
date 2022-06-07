/// <reference path="./utility.d.ts" />

declare module 'mongoose' {
    type VirtualPathFunctions<DocType = {}, pathType = unknown> = {
      get?: (this: Document<any, any, DocType> & DocType) => pathType;
      set?: (this: Document<any, any, DocType> & DocType, ...args: any) => unknown;
    };

    type VirtualsSchemaOptionsPropertyType<DocType = any, virtualPaths = Record<any, unknown>> = {
      [K in keyof virtualPaths]: VirtualPathFunctions<IsItRecordAndNotAny<DocType> extends true ? DocType : any, virtualPaths[K]>
    };
}
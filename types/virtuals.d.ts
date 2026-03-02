declare module 'mongoose' {
  type VirtualPathFunctions<DocType = {}, PathValueType = unknown, THydratedDocumentType = any> = {
    get?: TVirtualPathFN<PathValueType, THydratedDocumentType, PathValueType>;
    set?: TVirtualPathFN<PathValueType, THydratedDocumentType, void>;
    options?: VirtualTypeOptions<THydratedDocumentType, DocType>;
  };

  type TVirtualPathFN<PathType = unknown, THydratedDocumentType = any, TReturn = unknown> =
    (value: PathType, virtual: VirtualType<unknown>, doc: THydratedDocumentType) => TReturn;

  type SchemaOptionsVirtualsPropertyType<DocType = any, VirtualPaths = Record<any, unknown>, THydratedDocumentType = any> = {
    [K in keyof VirtualPaths]: VirtualPathFunctions<DocType, VirtualPaths[K], THydratedDocumentType>
  } & ThisType<THydratedDocumentType>;
}

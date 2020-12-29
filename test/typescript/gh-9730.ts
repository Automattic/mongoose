import { Document, model, Schema, Model, Types } from 'mongoose';

export interface IEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}
class GenericRepository<T extends IEntity> {
    collectionName: string;
    schema: Schema;

    constructor(collectionName: string, schema: Schema) {
        this.collectionName = collectionName;
        this.schema = schema;
        schema.set('toJSON', { virtuals: true });
        schema.set('toObject', { virtuals: true });
    }
    async insert(item: T): Promise<T> {
        const itemDal = model(this.collectionName, this.schema);
        // delete values of createdAt and updatedAt and let the DB handle the values
        delete (item as any).createdAt;
        delete (item as any).updatedAt;
        return await itemDal
            .create(item)
            .then(async returnedItem => {
                return (returnedItem as Document).toObject() as T;
            });
    }
    async insertMany(items: T[]): Promise<T[]> {
        const itemDal = model(this.collectionName, this.schema);
        // delete values of createdAt and updatedAt and let the DB handle the values
        items.forEach(item => {
            if ((item as any).createdAt) delete (item as any).createdAt;
            if ((item as any).updatedAt) delete (item as any).updatedAt;
        });

        return await itemDal
            .insertMany(items)
            .then(async returnedItems => {
                return returnedItems.map(returnedItem => (returnedItem as Document).toObject() as T);
            });
    }
}
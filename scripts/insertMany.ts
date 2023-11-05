import * as mongoose from "mongoose";

export class RepositoryBase<T> {
    protected model: mongoose.Model<T & mongoose.Document>;

    constructor(schemaModel: mongoose.Model<T & mongoose.Document>) {
        this.model = schemaModel;
    }

    async insertMany(elems: T[]): Promise<T[]> {
        elems = await this.model.insertMany(elems) as T[];
        return elems;
    }
}
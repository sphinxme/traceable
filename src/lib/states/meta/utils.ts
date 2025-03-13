import ObjectID from "bson-objectid";

export const id = () => ObjectID().toHexString();
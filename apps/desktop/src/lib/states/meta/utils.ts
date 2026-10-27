import ObjectID from "bson-objectid";

/** 生成全局唯一 ID（bson-objectid 十六进制串），用作 Task / Event / Text 等实体的主键。 */
export const id = () => ObjectID().toHexString();

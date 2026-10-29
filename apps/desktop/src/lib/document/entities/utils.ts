import ObjectID from "bson-objectid";

/** panelStates 折叠树保留键；taskId 不得与之碰撞。 */
const RESERVED_IDS = new Set(["nav", "homes", "folded"]);

/** 生成全局唯一 ID（bson-objectid 十六进制串），用作 Task / Event / Text 等实体的主键。 */
export const id = () => {
  const value = ObjectID().toHexString();
  if (RESERVED_IDS.has(value)) {
    throw new Error(`reserved id generated: ${value}`);
  }
  return value;
};

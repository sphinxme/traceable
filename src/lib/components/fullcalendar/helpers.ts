export const filterNullProps = (obj: Record<string, any>) => {
  let result: Record<string, any> = {};

  for (const key in obj) {
    if (obj[key] != null) result[key] = obj[key];
  }

  return result;
};

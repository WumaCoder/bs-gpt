/**
 * 提取方法参数类型
 */

export type ParamsType<T> = T extends (...args: infer P) => any ? P : never;

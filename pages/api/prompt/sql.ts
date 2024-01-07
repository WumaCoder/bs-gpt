export default (tables: string[], message: string) => {
  return `
这是我的表结构:
\`\`\`sql
${tables.join("\n")}
\`\`\`
下面我将会让你生成sql，请按照下面的需求生成一条sql，不需要其他废话，注意如何as别名的时候需要加\`号。

需求：
${message}`;
};

export default (tables: string[], message: string) => {
  const current = tables.shift();
  return `Below is the current database table structure. I need you to write an SQL statement to query the following requirements. No need to return any other explanatory content.

Requirements:

- When using AS for aliases, add a backtick (\`).
- Ensure the correctness of the SQL.


Current:
\`\`\`sql
${current}
\`\`\`

Other:
\`\`\`sql
${tables.join("\n")}
\`\`\`


Statement:

${message}
`;
};

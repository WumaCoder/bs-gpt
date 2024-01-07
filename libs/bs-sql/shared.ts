import Parser from "js-sql-parser";

export function sqlFieldReplace(sql: string, replaceMap: Map<string, string>) {
  const reg = /([^\s,?= ]+)/gm;
  return sql.replace(reg, (match, p1) => {
    const trimmedMatch = match.trim();
    const replacement = replaceMap.get(trimmedMatch) ?? replaceMap.get(p1);
    if (
      !replacement &&
      trimmedMatch.includes("(") &&
      trimmedMatch.includes(")")
    ) {
      return trimmedMatch.replace(/\((.+)\)/gm, (match, p1) => {
        const replacement = replaceMap.get(p1);
        return `(${replacement || p1})`;
      });
    }
    return replacement || match;
  });
}

export function replaceName(sql: string, replaceMap: Map<string, string>) {
  replaceMap.forEach((id, name) => {
    sql = sql.replace(name, id);
  });
  return sql;
}

export function replaceFieldNames(
  query: string | any,
  fieldReplacements: any,
  tableReplacements: any,
  extFields?: string[]
) {
  const ast = typeof query === "string" ? Parser.parse(query) : query;

  // console.log(ast);
  const tableAliasMap: any = {};

  function traverseTableName(node: any) {
    if (!node || typeof node !== "object") return;

    if (node.type === "SubQuery") {
      // console.log(JSON.stringify(node));
      node.value = replaceFieldNames(
        node.value,
        fieldReplacements,
        tableReplacements
      );
    }

    // 处理表别名
    if (node.type === "TableFactor") {
      if (node.alias && node.alias.value) {
        tableAliasMap[node.alias.value] = node.value.value;
        node.value.value =
          tableReplacements[extantName(node.value.value)] || node.value.value;
      } else {
        tableAliasMap[node.value.value] = node.value.value;
        node.value.value =
          tableReplacements[extantName(node.value.value)] || node.value.value;
      }
    }

    // 遍历子节点
    Object.keys(node).forEach((key) => {
      if (typeof node[key] === "object") {
        traverseTableName(node[key]);
      }
    });
  }

  function traverse(node: any) {
    if (!node || typeof node !== "object") return;

    // 处理表别名
    if (node.type === "TableFactor") {
      return;
    }

    // 处理字段名
    if (node.type === "Identifier") {
      // console.log(node);
      if (node.value.includes(".")) {
        const [tableAlias, columnName] = node.value.split(".");
        const actualTable = tableAliasMap[tableAlias];
        const newColumnName =
          fieldReplacements[actualTable] &&
          fieldReplacements[actualTable][columnName];
        // console.log(JSON.stringify({ tableAlias, columnName, actualTable, newColumnName, node }));
        if (newColumnName) {
          const tableMap =
            tableReplacements[extantName(tableAlias)] || tableAlias;
          node.value = `${tableMap}.${newColumnName}`;
        }
      } else {
        Object.keys(fieldReplacements).some((table) => {
          const mapTable = tableReplacements[extantName(table)] || table;
          const newColumnName = fieldReplacements[table][node.value];
          if (newColumnName) {
            node.value = `${mapTable}.${newColumnName}`;
            return true;
          }
        });
      }
    }

    if (node.type === "SelectExpr") {
      extFields?.forEach((field) => {
        node.value.push({
          type: "Identifier",
          value: field,
          alias: null,
          hasAs: null,
        });
      });
    }

    // 遍历子节点
    Object.keys(node).forEach((key) => {
      if (typeof node[key] === "object") {
        traverse(node[key]);
      }
    });
  }

  traverseTableName(ast);
  // console.log(JSON.stringify(ast));
  traverse(ast);

  Object.defineProperty(ast, "toString", {
    value: () => Parser.stringify(ast),
  });

  return ast;
}

export function mapToObj(map: Map<string, any>) {
  const obj: any = {};
  map.forEach((v, k) => {
    obj[k] = v;
  });
  return obj;
}

export function extantName(name: string) {
  if (name.startsWith("`") && name.endsWith("`")) {
    return name.substring(1, name.length - 1);
  }
  return name;
}

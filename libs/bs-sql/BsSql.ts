import { FieldType, IFieldMeta, ITable } from "@lark-base-open/js-sdk";
import { BsSdk } from "../bs-sdk/BsSdk";
import { Emitter } from "../bs-sdk/Emitter";
import alasql from "alasql";
import { transFieldsMap } from "../bs-sdk/shared";
import { mapToObj, replaceFieldNames } from "./shared";

export type TableListCtx = {
  tableMap: Map<string, ITable>;
  tableIdMapName: Map<string, string>;
  tableNameMapId: Map<string, string>;
  tableList: ITable[];
};

export class BsSql {
  public emFetchTableList = new Emitter<(data: TableListCtx) => any>();
  public emFetchTableListFields = new Emitter<(data: any) => any>();
  public emSelectTables = new Emitter<(data: any) => any>();

  constructor(private sdk: BsSdk) {
    this.fetchTables();
  }

  async fetchTables() {
    const tableMap = new Map<string, ITable>();
    const tableNameMapId = new Map<string, string>();
    const tableIdMapName = new Map<string, string>();
    const tableList = await this.sdk.getTableList();

    tableList.map((item) => tableMap.set(item.id, item));

    const nameMapIds: { name: string; id: string }[] = [];
    await Promise.all(
      tableList.map(async (item) => {
        const name = await item.getName();
        nameMapIds.push({
          name,
          id: item.id,
        });
      })
    );

    // 按名字从长到短排序
    nameMapIds
      .sort((a, b) => b.name.length - a.name.length)
      .forEach((item) => {
        tableNameMapId.set(item.name, item.id);
        tableIdMapName.set(item.id, item.name);
      });

    this.emFetchTableList.emitLifeCycle({
      tableMap,
      tableIdMapName,
      tableNameMapId,
      tableList,
    });
  }

  extractName(sql: string, ids: string[]) {
    const selectTablesId: string[] = [];
    ids.forEach((id) => {
      if (sql.includes(id)) {
        selectTablesId.push(id);
      }
    });
    return selectTablesId;
  }
  async query(sql: string) {
    const activeId = (await this.sdk.getActiveTable()).id;
    const [tableListCtx] = await this.emFetchTableList.wait();
    sql = sql.replace(/FROM\s+(\?)\s?/gim, `FROM ${activeId} `);
    console.log("1sql:", sql);

    sql =
      replaceFieldNames(sql, {}, mapToObj(tableListCtx.tableNameMapId)) + "";
    console.log("sql:", sql);
    const selectTablesId: string[] = this.extractName(
      sql,
      Array.from(tableListCtx.tableNameMapId.values())
    );

    console.log("tableListCtx:", tableListCtx);

    console.log("selectTablesId:", selectTablesId);

    const transFields: any = {};

    const tableMapFields = new Map<
      string,
      {
        fieldsMapName: any;
        fieldsMapId: any;
      }
    >();
    const tables = (alasql as any).tables;
    const selectTables = await Promise.all(
      selectTablesId.map(async (id) => {
        const table = tableListCtx.tableMap.get(id) as ITable;
        const records = await this.sdk.getRecordList(table);
        const fields = await table.getFieldMetaList();
        const data = await this.sdk.getDisplayRecordList(table, fields);
        const t = transFieldsMap(fields);

        transFields[id] = t.fieldsMapName;

        tableMapFields.set(id, t);

        console.log("selectTables:", table, records, data);
        tables[id] = { data };
        return table;
      })
    );

    this.emFetchTableListFields.emitLifeCycle(tableMapFields);
    this.emSelectTables.emitLifeCycle(selectTables);

    sql = replaceFieldNames(sql, transFields, {}, ["_id"]) + "";

    console.log("res:", sql, transFields);

    return alasql(sql);
  }
  async structure(table: ITable) {
    const fields = await table.getFieldMetaList();
    console.log(fields);
    let sql = `CREATE TABLE \`${await table.getName()}\`(\n${fields
      .map((item) => {
        return `   \`${item.id}\` ${typeTrans(item.type)} COMMENT '${
          item.name
        }'`;
      })
      .join(",\n")}\n);`;
    console.log(sql);
    return sql;
  }
}

function typeTrans(type: FieldType) {
  if (type === FieldType.Number) {
    return "int";
  }
  return "text";
}

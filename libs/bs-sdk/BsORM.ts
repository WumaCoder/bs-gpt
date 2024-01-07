import { IField, ITable } from "@lark-base-open/js-sdk";
import { BIField, BsSdk } from "./BsSdk";
import { Emitter } from "./Emitter";

export type Model = {
  table: ITable;
  fields: BIField[];
};

export class BsORM {
  public models: Map<string, Model> = new Map();
  public activeModel: string | undefined;
  public initEmitter = new Emitter();
  constructor(public sdk: BsSdk) {
    sdk.getTableList().then(async (tables) => {
      await Promise.all(
        tables.map(async (table) => {
          const fields = await sdk.getFieldList(table);
          this.models.set(table.id, { table, fields: fields });
        })
      );
      const activeTable = await sdk.getActiveTable();
      this.activeModel = activeTable?.id;
      this.initEmitter.emitLifeCycle();
    });

    sdk.emSelectionChange.on(async (event) => {
      this.activeModel = event.data.tableId as string;
    });
  }

  getRecord(recordId: string) {
    return this.sdk
      .getRecordById(this.active.table, recordId)
      .then((record) => record.fields);
  }

  get active(): Model {
    return this.models.get(this.activeModel!) as Model;
  }

  async use(table: string | ITable) {
    await this.initEmitter.wait();
    if (typeof table === "string") {
      this.activeModel = table;
      const model = this.models.get(table);
      if (!model) return;
      return model.table;
    }
    this.activeModel = table.id;
    return table;
  }

  getFields() {
    const table = this.activeModel;
    if (!table) return undefined;
    const model = this.models.get(table);
    if (!model) return undefined;
    return model.fields as BIField[];
  }

  getFieldsMap() {
    const fields = this.getFields();
    const map = new Map<string, BIField>();
    fields?.forEach((field) => {
      map.set(field.id, field);
    });
    return map;
  }
}

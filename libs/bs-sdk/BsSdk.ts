import {
  IEventCbCtx,
  bitable,
  Selection,
  ITable,
  IField,
  IGetRecordsParams,
  IRecord,
  IFieldMeta,
  FieldType,
} from "@lark-base-open/js-sdk";
import { format } from "date-fns";
import { Emitter } from "./Emitter";
import { transDisplayRecord } from "./shared";
import { BsStorage } from "./BsStorage";

export type SelectionChangeEmitter = (event: IEventCbCtx<Selection>) => any;
export type InitEmitter = (sdk: BsSdk) => any;

export interface BIField extends IField {
  name: string;
}

export class BsSdk {
  public readonly bitable = bitable;
  public readonly base = bitable.base;
  public activeTable: ITable | undefined;
  public storageKey = "storage";
  // public readonly initEmitter = new Emitter<InitEmitter>();
  public readonly emSelectionChange = new Emitter<SelectionChangeEmitter>();
  public readonly storage = new BsStorage(this, this.storageKey, {});

  constructor({
    onSelectionChange = false,
    immediatelySelectionChange = true,
  } = {}) {
    if (onSelectionChange) {
      this.base.onSelectionChange(async (event) => {
        this.activeTable = undefined;
        this.emSelectionChange.emitLifeCycle(event);
      });
    }
    if (immediatelySelectionChange && onSelectionChange) {
      this.getSelection().then((selection) => {
        this.emSelectionChange.emitSync({ data: selection });
      });
    }
  }

  async getRecordIds(table?: ITable) {
    if (!table) table = await this.getActiveTable();
    return await table.getRecordIdList();
  }

  async getRecordById(table: ITable, recordId: string) {
    return await table.getRecordById(recordId);
  }

  async getActiveTable() {
    if (this.activeTable) return this.activeTable;
    this.activeTable = await bitable.base.getActiveTable();
    return this.activeTable;
  }

  async getTableList() {
    return await bitable.base.getTableList();
  }

  async getFieldList(table: ITable) {
    const fieldList: BIField[] = await table.getFieldList();
    for (let i = 0; i < fieldList.length; i++) {
      const field = fieldList[i];
      field.name = await field.getName();
    }
    return fieldList;
  }

  async getSelection(): Promise<Selection> {
    return await bitable.base.getSelection();
  }

  async getSelectionQuery(selection: Partial<Selection>) {
    const table = selection.tableId
      ? await this.base.getTableById(selection.tableId)
      : undefined;
    const result = {
      table: table,
      view: selection.viewId
        ? await table?.getViewById(selection.viewId)
        : undefined,
      field: selection.fieldId
        ? await table?.getFieldById(selection.fieldId)
        : undefined,
      record: selection.recordId
        ? await table?.getRecordById(selection.recordId)
        : undefined,
    };
    return result;
  }

  async getSelection2({
    viewId = false,
    fieldId = false,
    recordId = false,
  } = {}) {
    const selection = await this.getSelection();
    return await this.getSelectionQuery({
      viewId: viewId ? selection.viewId : undefined,
      fieldId: fieldId ? selection.fieldId : undefined,
      recordId: recordId ? selection.recordId : undefined,
    });
  }

  async getRecordList(table: ITable, filter?: IGetRecordsParams) {
    let pageToken;
    const records: IRecord[] = [];

    while (true) {
      const res = await table.getRecords({
        pageSize: 5000,
        ...filter,
        pageToken,
      });
      records.push(...res.records);
      pageToken = res.pageToken;
      if (!res.hasMore) {
        break;
      }
    }

    return records;
  }

  async getDisplayRecordList(
    table: ITable,
    fields: IFieldMeta[],
    filter?: IGetRecordsParams
  ) {
    const list = await this.getRecordList(table, filter);
    console.log("fields:", fields);

    const data = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      data.push({
        _id: item.recordId,
        ...transDisplayRecord(fields, item),
      });
    }

    return data;
  }

  async getBaseId() {
    const table = await this.getActiveTable();
    const view = await table.getActiveView();
    const keyId = (
      await this.bitable.bridge.getBitableUrl({
        tableId: table.id,
        viewId: view.id,
      } as any)
    ).split("?")[0];

    const bid = keyId.split("/").pop()!;
    return bid;
  }
}

import { FieldType, ITextField } from "@lark-base-open/js-sdk";
import { BsSdk } from "./BsSdk";

export class BsStorage {
  cache: any = {};
  constructor(
    private bsSdk: BsSdk,
    private storageKey: string,
    private initData: any = {}
  ) {}

  async init() {
    try {
      const table = await this.bsSdk.base.getTableByName(this.storageKey);
      return table;
    } catch (error) {
      const data = this.initData;
      const res = await this.bsSdk.bitable.base.addTable({
        name: this.storageKey,
        fields: [
          {
            name: "data",
            type: FieldType.Text,
          },
        ],
      });
      const newTable = await this.bsSdk.bitable.base.getTableById(res.tableId);
      const textField = await newTable.getField<any>("data");
      const textCell = await textField.createCell(JSON.stringify({ data }));
      await newTable.addRecord(textCell);

      return newTable;
    }
  }

  async get<T>(key: string, defaultValue?: T): Promise<Awaited<T>> {
    const table = await this.init();
    const textField = await table.getField<ITextField>("data");
    const updateAt = (await textField.getMeta()).description.content;
    if (!updateAt && this.cache[key]) {
      return this.cache[key] ?? defaultValue;
    }
    const records = await this.bsSdk.getRecordIds(table);
    const record = records[0];
    const cell = await textField.getCell(record);
    const obj = JSON.parse(String((cell as any).val[0].text));
    this.cache = obj;
    table.setField(textField.id, {
      description: {
        content: "",
      },
    });
    return obj.data[key] ?? defaultValue;
  }

  async set(key: string, data: any) {
    const table = await this.init();
    const records = await this.bsSdk.getRecordIds(table);
    const record = records[0];
    const textField = await table.getField<ITextField>("data");
    const cell = await textField.getCell(record);
    const obj = JSON.parse(String((cell as any).val[0].text));
    obj.data[key] = data;
    this.cache[key] = data;
    await cell.setValue(JSON.stringify(obj));
    console.log("textField", textField);
    table.setField(textField.id, {
      description: {
        content: String(Date.now()),
      },
    });
    return true;
  }

  async delete(key: string) {
    const table = await this.init();
    const records = await this.bsSdk.getRecordIds(table);
    const record = records[0];
    const textField = await table.getField<any>("data");
    const cell = await textField.getCell(record);
    const obj = JSON.parse(String(cell.val[0].text));
    delete obj.data[key];
    this.cache[key] = undefined;
    await cell.setValue(JSON.stringify(obj));
    return true;
  }
}

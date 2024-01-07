import { copyTextToClipboard2 } from "@/libs/helper/tools";
import { IconChevronLeft, IconCopy, IconExpand } from "@douyinfe/semi-icons";
import { Button, Table, Toast } from "@douyinfe/semi-ui";
import { MutableRefObject, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export default function TableView(props: any) {
  const [t, i18n] = useTranslation();
  const content = props.content;
  const bsSdk = props.bsSdk;
  const [showDetail, setShowDetail] = useState("");
  const wrapRef = useRef<HTMLDivElement | undefined>();

  const height =
    (wrapRef.current?.clientHeight ?? 0) < 400
      ? 500
      : wrapRef.current?.clientHeight;

  return (
    <>
      {showDetail && (
        <div
          style={{
            background: "#f7f8ff",
            height,
          }}
        >
          <div>
            <Button
              icon={<IconChevronLeft />}
              theme="borderless"
              aria-label="back"
              onClick={() => setShowDetail("")}
            />
            <Button
              icon={<IconExpand />}
              theme="borderless"
              aria-label="full"
              style={{ float: "right" }}
              onClick={() => open(showDetail)}
            />
            <Button
              icon={<IconCopy />}
              theme="borderless"
              aria-label="full"
              style={{ float: "right" }}
              onClick={() => {
                copyTextToClipboard2(showDetail);
                Toast.success(t("fu-zhi-cheng-gong"));
              }}
            />
          </div>
          <div style={{ overflow: "hidden" }}>
            <iframe
              src={showDetail}
              style={{
                border: 0,
                padding: 0,
                margin: 0,
                height,
                width: "100%",
                marginTop: "-130px",
              }}
            ></iframe>
          </div>
        </div>
      )}
      <div ref={wrapRef as any} style={{ display: showDetail ? "none" : "" }}>
        <div style={{ fontSize: "1.1rem", marginBottom: 10 }}>
          {content.tableName}
        </div>
        <Table
          columns={content.columns}
          dataSource={content.result}
          pagination={{
            pageSize: 10,
          }}
          resizable
          bordered
          onRow={(row: any) => {
            return {
              onClick: async (e) => {
                if (row?._id) {
                  console.log("table", content.table, row);
                  const table = await bsSdk.base.getTableById(content.table.id);
                  const recordShareLink = await table.getRecordShareLink(
                    row._id
                  );
                  console.log({ recordShareLink });
                  // botSend("record", recordShareLink);
                  setShowDetail(recordShareLink);
                }
              },
            };
          }}
        />
      </div>
    </>
  );
}

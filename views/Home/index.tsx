import React, { useCallback, useEffect, useRef, useState } from "react";
import Chat, {
  Bubble,
  MessageProps,
  QuickReplyItemProps,
  useMessages,
} from "@chatui/core";
import "@chatui/core/dist/index.css";
import { BsSdk } from "@/libs/bs-sdk/BsSdk";
import { BsSql } from "@/libs/bs-sql";
import { Table } from "@douyinfe/semi-ui";
import { useHotkeys } from "react-hotkeys-hook";
import { ComposerProps } from "@chatui/core/lib/components/Composer";

const bsSdk = new BsSdk({});
const bsSql = new BsSql(bsSdk);

export default function Home() {
  const [inputRef, setInputRef] = useState<HTMLInputElement>();
  const history = useRef<string[]>([]);
  const composerRef = useRef<any>();
  const historyIndex = useRef(-1);
  const [quickReplies] = useState<QuickReplyItemProps[]>([
    {
      name: "查询当前表",
      code: "select * from ?",
      // isNew: true,
      // isHighlight: true,
    },
    {
      name: "帮助",
      code: "help",
      // isNew: true,
      // isHighlight: true,
    },
    {
      name: "联系开发者",
      code: "feedback",
      // isNew: true,
      // isHighlight: true,
    },
  ]);
  const { messages, appendMsg, setTyping, updateMsg, deleteMsg, resetList } =
    useMessages([]);

  function addHistory(str: string) {
    if (history.current.length > 20) {
      history.current.shift();
    }
    if (str === history.current[history.current.length - 1]) {
      return;
    }
    history.current.push(str);
  }

  const sendFn = (type: string, val: any, pos: "left" | "right") => {
    const _id = geneId();
    appendMsg({
      _id,
      type: type,
      content: val,
      position: pos,
    });
    return _id;
  };
  const botSend = (type: string, val: any) => sendFn(type, val, "left");
  const userSend = (type: string, val: any) => sendFn(type, val, "right");

  function handleSend(type: string, val: string) {
    console.log(type, val);

    if (type === "text" && val.trim()) {
      setTyping(true);
      userSend("text", val);
      addHistory(val);

      const [cmd, ...args] = parseStringCmd(val);

      switch (cmd) {
        case "token":
          if (args.length) {
            bsSdk.storage.set("token", args[0]).then(() => {
              botSend("text", "设置成功");
            });
          } else {
            bsSdk.storage.get("token").then((v) => {
              botSend("text", v || "未设置");
            });
          }
          break;
        case "select":
          select(val).then(async (content) => {
            botSend("select", content);
          });
          break;
        case "help":
          botSend(
            "text",
            "您可以在下方输入框进行对话式查询多维表格数据，比如：\n\n帮我查一下每天销售量。"
          );
          break;
        case "feedback":
          botSend("text", "请联系微信：zhangyunchen1992");
          break;
        case "clear":
          resetList([
            {
              _id: geneId(),
              type: "text",
              content:
                "欢迎使用 GPT查询 助手，您可以在下方输入框进行对话式查询多维表格数据，比如：\n\n帮我查一下每天销售量。",
            },
          ]);
          break;
        default:
          break;
      }

      // setTimeout(() => {
      //   const _id = geneId();
      //   appendMsg({
      //     _id,
      //     type: "text",
      //     content: { text: "Bala bala" },
      //   });
      //   setInterval(() => {
      //     // 动态更新时间
      //     updateMsg(_id, {
      //       type: "text",
      //       content: { text: "Bala bala \n" + new Date().getTime() },
      //     });
      //   }, 1000);
      // }, 1000);
    }
  }

  useEffect(() => {
    // if (window.t) {
    //   return;
    // }
    // window.t = true;
    //select * from ?
    botSend(
      "text",
      "欢迎使用 GPT查询 助手，您可以在下方输入框进行对话式查询多维表格数据，比如：\n\n帮我查一下每天销售量。"
    );
    bsSdk.storage.get("token").then((v) => {
      if (!v) {
        botSend("text", "请配置 openai token 进行使用.\n语法: \ntoken 密钥");
      }
    });
  }, []);

  // useHotkeys("up", () => botSend("text", "f"), []);

  function renderMessageContent(msg: MessageProps) {
    const { type, content } = msg;
    if (type === "select") {
      return (
        <Bubble type="text">
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
            // onRow={(row) => {
            //   return {
            //     onClick: async (e) => {
            //       if (row?._id) {
            //         console.log("table", content.table, row);
            //         const table = await bsSdk.base.getTableById(
            //           content.table.id
            //         );
            //         const recordShareLink = await table.getRecordShareLink(
            //           row._id
            //         );
            //         console.log({ recordShareLink });
            //       }
            //     },
            //   };
            // }}
          />
        </Bubble>
      );
    }
    return <Bubble content={content} />;
  }

  function handleQuickReplyClick(e: any) {
    handleSend("text", e.code);
  }

  useEffect(() => {
    const target = inputRef;
    if (!target) return;
    const fn = (e: any) => {
      if (e.key === "ArrowUp") {
        if (historyIndex.current <= history.current.length) {
          composerRef.current.setText(history.current[historyIndex.current]);
          setTimeout(() => {
            // 光标移动到最后
            const len = history.current[historyIndex.current].length;
            target.setSelectionRange(len, len);
          });
          historyIndex.current--;
          historyIndex.current = Math.max(historyIndex.current, 0);
        }
      } else if (e.key === "ArrowDown") {
        if (historyIndex.current >= 0) {
          composerRef.current.setText(history.current[historyIndex.current]);
          historyIndex.current++;
          historyIndex.current = Math.min(
            historyIndex.current,
            history.current.length - 1
          );
        }
      } else if (e.key === "Enter") {
        historyIndex.current = history.current.length - 1;
      }
    };
    target.addEventListener("keydown", fn);
    return () => {
      target.removeEventListener("keydown", fn);
    };
  }, [inputRef]);

  return (
    <Chat
      navbar={{ title: "GPT 查询" }}
      messages={messages}
      renderMessageContent={renderMessageContent}
      onSend={handleSend}
      quickReplies={quickReplies}
      onQuickReplyClick={handleQuickReplyClick}
      composerRef={composerRef}
      onInputFocus={(e) => {
        historyIndex.current = history.current.length - 1;
        setInputRef(e.target as any);
      }}
    />
  );
}

function geneId() {
  return Math.random().toString(36).slice(2);
}

async function select(sql: string) {
  const result = await bsSql.query(sql);
  const [tableListCtx] = await bsSql.emFetchTableList.wait();
  const [tableFields] = await bsSql.emFetchTableListFields.wait();
  const fieldIdMapName = new Map<string, string>();
  tableFields.forEach((t: any) => {
    Object.keys(t.fieldsMapId).forEach((id) => {
      fieldIdMapName.set(id, t.fieldsMapId[id]);
    });
  });
  const columns = Object.keys(result[0] || {})
    .filter((item) => !["_id", "_raw_"].includes(item))
    .map((id) => {
      return {
        title: fieldIdMapName.get(id) || id,
        width: 100,
        dataIndex: id,
        key: id,
        ellipsis: true,
        resize: true,
      };
    });
  return {
    tableName: await tableListCtx.tableList[0].getName(),
    table: tableListCtx.tableList[0],
    columns,
    result,
  };
}

function parseStringCmd(str: string) {
  const args = [];
  let temp = "";
  let begin = false;
  let isQuote = false;

  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === " " && temp) {
      args.push(temp);
      temp = "";
    } else if (c === '"' && !begin) {
      begin = true;
    } else if (c === '"' && begin) {
      begin = false;
    } else if (c === "\\" && begin) {
      temp += '"';
      i += 2;
    } else if (c !== " " || begin) {
      temp += c;
    }
  }
  if (temp) {
    args.push(temp);
  }
  return args;
}

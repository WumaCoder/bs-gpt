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
import TableView from "@/components/TableView";
import { useTranslation } from "react-i18next";
import axios from "axios";

const bsSdk = new BsSdk({ onSelectionChange: true });
const bsSql = new BsSql(bsSdk);

export default function Home() {
  const [t, i18n] = useTranslation();

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
    {
      name: "获取表结构",
      code: "table",
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

  async function handleSend(type: string, val: string) {
    console.log(type, val);

    if (type === "text" && val.trim()) {
      setTyping(true);
      userSend("text", val);
      addHistory(val);

      const [cmdStr, ...args] = parseStringCmd(val);
      const cmd = cmdStr.toLocaleLowerCase();
      console.log(cmd, args);

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
        case "table":
          const tableStruct = await bsSql.structure(
            await bsSdk.getActiveTable()
          );
          botSend("text", tableStruct);
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
        default: {
          const table = await bsSdk.getActiveTable();
          const tableStruct = await bsSql.structure(table);
          const tableList = (await bsSdk.getTableList()).filter(
            (item) => item.id !== table.id
          );
          const tableStructs = await Promise.all(
            tableList.map((item) => bsSql.structure(item))
          );

          fetch("/api/ai", {
            method: "POST", // 指定请求方法为 POST
            headers: {
              "Content-Type": "application/json", // 设置请求头
            },
            body: JSON.stringify({
              token: await bsSdk.storage.get("token"),
              message: val,
              tables: [tableStruct, ...tableStructs],
              responseType: "stream",
            }), // 将 JavaScript 对象转换为 JSON 字符串
          })
            .then((response) => {
              const reader = response.body!.getReader();
              const decoder = new TextDecoder();
              let text = "";
              const id = botSend("text", "");
              // 逐步读取数据
              return reader
                .read()
                .then(function processText({ done, value }): any {
                  if (done) {
                    console.log("Stream complete");
                    const sqls = extractSqlBlocks(text);
                    console.log(sqls);
                    select(sqls[0]).then(async (content) => {
                      updateMsg(id, {
                        type: "select",
                        content,
                      });
                    });

                    return;
                  }

                  // 将 Uint8Array 转换为字符串
                  const chunk = decoder.decode(value, { stream: true });
                  console.log(chunk);
                  text += chunk;
                  updateMsg(id, {
                    type: "text",
                    content: text,
                  });
                  // 读取下一个数据块
                  return reader.read().then(processText);
                });
            })
            .catch((err) => {
              console.error("Fetch error:", err);
            });
          break;
        }
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
    async () => {
      const lang = await bsSdk.bitable.bridge.getLanguage();
      i18n.changeLanguage(lang.includes("zh") ? "zh" : "en");
    };
  }, []);

  // useHotkeys("up", () => botSend("text", "f"), []);

  function renderMessageContent(msg: MessageProps) {
    const { type, content } = msg;
    if (type === "select") {
      return (
        <Bubble type="text" style={{ width: "100%", overflow: "hidden" }}>
          <TableView content={content} bsSdk={bsSdk}></TableView>
        </Bubble>
      );
    }

    if (type === "includesql") {
      return (
        <Bubble
          type="text"
          style={{ width: "100%", overflow: "hidden" }}
        ></Bubble>
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
          const len = history.current[historyIndex.current].length;
          setTimeout(() => {
            // 光标移动到最后
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
        historyIndex.current = history.current.length;
      }
    };
    target.addEventListener("keydown", fn);
    return () => {
      target.removeEventListener("keydown", fn);
    };
  }, [inputRef]);

  return (
    <Chat
      navbar={{ title: "AI 助手" }}
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
  const [selectTables] = await bsSql.emSelectTables.wait();
  return {
    tableName: await selectTables[0].getName(),
    table: selectTables[0],
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

function extractSqlBlocks(text: string) {
  // 正则表达式匹配被 ``` 包围的 SQL 代码块
  const sqlBlockRegex = /```sql\s+([\s\S]*?)```/g;

  // 使用正则表达式匹配文本
  const matches = [];
  let match;
  while ((match = sqlBlockRegex.exec(text)) !== null) {
    matches.push(match[1].trim()); // 添加匹配的 SQL 代码块，去除首尾空白
  }

  if (matches.length === 0 && text.toLocaleLowerCase().includes("select")) {
    matches.push(text);
  }

  return matches;
}

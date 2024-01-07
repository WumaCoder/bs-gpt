import { createContext, useEffect, useRef, useState } from "react";
import { BsORM } from "../../BsORM";
import { Form, Spin } from "@douyinfe/semi-ui";
import { BaseFormProps } from "@douyinfe/semi-ui/lib/es/form";

export const Context = createContext<{ orm?: BsORM }>({
  orm: undefined,
});

export type BProvideProps = {
  orm: BsORM;
  formProps?: BaseFormProps;
  children: JSX.Element | JSX.Element[];
  loadingText?: string;
};

export default function BProvide(props: BProvideProps) {
  const [ctx, setCtx] = useState({ orm: props.orm });
  const [init, setInit] = useState(false);
  useEffect(() => {
    const clear = props.orm.initEmitter.on(() => {
      console.log("init", props.orm);
      setInit(true);
    });
    return clear;
  }, []);

  return (
    <Context.Provider value={ctx}>
      <Form {...props.formProps}>
        {init ? (
          props.children
        ) : (
          <div
            style={{
              height: "500px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
            }}
          >
            <Spin size="large"></Spin>
            <div style={{ fontSize: "14px", color: "#333", marginTop: "5px" }}>
              {props.loadingText || "loading..."}
            </div>
          </div>
        )}
      </Form>
    </Context.Provider>
  );
}

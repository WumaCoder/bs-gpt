// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import sql from "./prompt/sql";

type Data = {
  code: number;
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") return;
  const body = req.body;
  console.log(JSON.stringify(body));
  const token = body.token;
  const baseURL = body.baseURL || "https://api.openai.com/v1"; //"https://api.op-enai.com/v1"
  const tables = body.tables;
  const message = body.message;

  const openai = new OpenAI({
    apiKey: token, // This is the default and can be omitted
    baseURL: baseURL,
  });

  const stream = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: sql(tables, message) }],
    stream: true,
  });

  for await (const chunk of stream) {
    console.log(chunk);
    res.write(chunk.choices[0]?.delta?.content || "");
  }
  res.end();
}

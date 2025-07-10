/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import functions from "./functions.json";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const systemMsg = {
      role: "system",
      content: "You are an assistant that helps manage entity nodes.",
    };
    const userMsgs = messages || [];
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [systemMsg, ...userMsgs],
      functions,
      function_call: "auto",
    });
    return NextResponse.json(completion);
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to process chat request." },
      { status: 500 }
    );
  }
}

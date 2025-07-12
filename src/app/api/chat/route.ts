/* eslint-disable @typescript-eslint/no-unused-vars */
console.log("OPENAI_API_KEY set?", !!process.env.OPENAI_API_KEY);
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import functions from "./functions.json";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    // Fetch current entities for context
    const entitiesRes = await fetch(`${req.nextUrl.origin}/api/entities`);
    const allEntities = await entitiesRes.json();
    // Fetch all relations for context
    const relationsRes = await fetch(`${req.nextUrl.origin}/api/entity-graph`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entities: [], relations: [] }),
    });
    const { entities: currentEntities, relations: currentRelations } =
      await relationsRes.json();
    const systemMsg = {
      role: "system",
      content: [
        "You are an assistant that helps manage entity nodes. You will assist with creating, updating, and deleting entity nodes based on user input.",
        `Current entities: ${JSON.stringify(allEntities)}`,
        `Current relations: ${JSON.stringify(currentRelations)}`,
      ].join("\n"),
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
    console.error("Chat API error:", e);
    return NextResponse.json(
      {
        error: "Failed to process chat request.",
        details: (e as Error).message,
      },
      { status: 500 }
    );
  }
}

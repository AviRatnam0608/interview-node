import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import csv from "csv-parser";

const DATA_DIR = path.join(process.cwd(), "src/app/data/posthog_archive");

// Helper to get all relation CSV files
function getRelationFiles() {
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith("relation_") && f.endsWith(".csv"));
}

// Helper to parse a CSV file
function parseCSV(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

// GET all relations
export async function GET(req: NextRequest) {
  const files = getRelationFiles();
  const allRelations: Record<string, any[]> = {};
  for (const file of files) {
    const relationType = file.replace("relation_", "").replace("_data.csv", "");
    const data = await parseCSV(path.join(DATA_DIR, file));
    allRelations[relationType] = data;
  }
  return NextResponse.json(allRelations);
}

// POST, PUT, DELETE can be implemented similarly for CRUD

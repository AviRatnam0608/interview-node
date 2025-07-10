import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { Entity } from "@/app/interfaces/interface";

// Helper function to parse CSV data
function parseCSV(csvContent: string): Record<string, string>[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const data: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Add the last value

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    data.push(row);
  }

  return data;
}

// Helper function to convert CSV entity data to Entity interface
function csvToEntity(csvData: Record<string, string>): Entity {
  const { guid, name, type, ...properties } = csvData;
  return {
    guid,
    name,
    type,
    properties,
  };
}

// GET endpoint to return all entities
export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), "src/app/data/posthog_archive");
    const files = await fs.readdir(dataDir);
    const entityFiles = files.filter(
      (file) => file.startsWith("entity_") && file.endsWith("_data.csv")
    );
    const allEntities: Entity[] = [];

    for (const file of entityFiles) {
      const filePath = path.join(dataDir, file);
      const csvContent = await fs.readFile(filePath, "utf-8");
      const csvData = parseCSV(csvContent);
      const entities = csvData.map(csvToEntity);
      allEntities.push(...entities);
    }

    return NextResponse.json({ entities: allEntities });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load entities" },
      { status: 500 }
    );
  }
}

// POST, PUT, DELETE can be implemented similarly for CRUD

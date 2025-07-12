import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { Entity, Relation } from "@/app/interfaces/interface";

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

// Helper function to get entity file path based on entity type
function getEntityFilePath(entityType: string): string {
  const dataDir = path.join(process.cwd(), "src/app/data/posthog_archive");
  return path.join(dataDir, `entity_${entityType}_data.csv`);
}

// Helper function to get relation file path based on relation type
function getRelationFilePath(relationType: string): string {
  const dataDir = path.join(process.cwd(), "src/app/data/posthog_archive");
  return path.join(dataDir, `relation_${relationType}_data.csv`);
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

// Helper function to convert CSV relation data to Relation interface
function csvToRelation(csvData: Record<string, string>): Relation {
  const {
    guid,
    name,
    source_guid,
    target_guid,
    source_type,
    target_type,
    ...properties
  } = csvData;
  return {
    guid,
    type: name,
    source: source_guid,
    target: target_guid,
    properties: {
      source_type,
      target_type,
      ...properties,
    },
  };
}

// Given a list of relations and a list of entity types, return all unique Entity objects referenced by the relations
async function getEntitiesForRelations(
  relations: Relation[],
  entityTypes: string[]
): Promise<Entity[]> {
  const entityFiles: Entity[] = [];
  const processedEntityTypes = new Set<string>();

  // Load all entities for the given types
  for (const entityTypeRaw of entityTypes) {
    // Split by comma and trim, in case a string like "component, tool" is passed
    const splitTypes = entityTypeRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    for (const entityType of splitTypes) {
      if (processedEntityTypes.has(entityType)) continue;
      processedEntityTypes.add(entityType);
      try {
        const entityFilePath = getEntityFilePath(entityType);
        const entityData = await fs.readFile(entityFilePath, "utf-8");
        const entityCsvData = parseCSV(entityData);
        const entitiesOfType = entityCsvData.map(csvToEntity);
        entityFiles.push(...entitiesOfType);
      } catch (error) {
        console.warn(`Could not load entity type ${entityType}:`, error);
      }
    }
  }

  // Build a set of all guids referenced in the relations
  const guids = new Set<string>();
  for (const rel of relations) {
    if (rel.source) guids.add(rel.source);
    if (rel.target) guids.add(rel.target);
  }

  // Return all unique Entity objects referenced by the relations
  return entityFiles.filter((entity) => guids.has(entity.guid));
}

// POST endpoint to accept a list of entities and relations, and return related entities
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entities, relations } = body;

    // Normalize relation types: split any comma-separated strings into individual types
    const relationTypes: string[] = Array.isArray(relations)
      ? relations.flatMap((r) => r.split(",").map((s: string) => s.trim()))
      : [];

    console.log("Received entities:", entities);
    console.log("Received relations:", relations);

    if (!Array.isArray(entities) || !Array.isArray(relations)) {
      return NextResponse.json(
        { error: "entities and relations must be arrays" },
        { status: 400 }
      );
    }

    const allEntities: Entity[] = [];
    const allRelations: Relation[] = [];
    const processedEntityTypes = new Set<string>();

    // Process each entity type
    for (const entityType of entities) {
      if (processedEntityTypes.has(entityType)) continue;
      processedEntityTypes.add(entityType);

      try {
        const entityFilePath = getEntityFilePath(entityType);
        const entityData = await fs.readFile(entityFilePath, "utf-8");
        const entityCsvData = parseCSV(entityData);

        const entitiesOfType = entityCsvData.map(csvToEntity);
        allEntities.push(...entitiesOfType);

        console.log(
          `Loaded ${entitiesOfType.length} entities of type: ${entityType}`
        );
        console.log(
          `Sample entities for ${entityType}:`,
          entitiesOfType.slice(0, 2)
        );
      } catch (error) {
        console.warn(`Could not load entity type ${entityType}:`, error);
      }
    }

    // Process each relation type
    for (const relationType of relationTypes) {
      try {
        const relationFilePath = getRelationFilePath(relationType);
        console.log(`Loading relation file: ${relationFilePath}`);
        const relationData = await fs.readFile(relationFilePath, "utf-8");
        const relationCsvData = parseCSV(relationData);

        const relationsOfType = relationCsvData.map(csvToRelation);
        allRelations.push(...relationsOfType);

        console.log(
          `Loaded ${relationsOfType.length} relations of type: ${relationType}`
        );
        console.log(
          `Sample relations for ${relationType}:`,
          relationsOfType.slice(0, 2)
        );
      } catch (error) {
        console.warn(`Could not load relation type ${relationType}:`, error);
      }
    }

    // Filter relations by requested types (OR semantics) using normalized relationTypes (substring match)
    const matchedRelations =
      relationTypes.length > 0
        ? allRelations.filter((r) =>
            relationTypes.some((rt) => r.type.includes(rt))
          )
        : allRelations;

    // Use the helper to get all unique entities referenced by the matched relations
    const finalEntities = await getEntitiesForRelations(
      matchedRelations,
      entities
    );

    return NextResponse.json({
      entities: finalEntities,
      relations: matchedRelations,
    });
  } catch (e) {
    console.error("Error in POST handler:", e);
    return NextResponse.json(
      { error: "Invalid request body or server error" },
      { status: 400 }
    );
  }
}

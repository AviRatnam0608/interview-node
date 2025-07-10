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

// POST endpoint to accept a list of entities and relations, and return related entities
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entities, relations } = body;

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
    for (const relationType of relations) {
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

    // Find related entities based on relations
    const relatedEntityGuids = new Set<string>();

    // Add source and target entities from relations
    for (const relation of allRelations) {
      relatedEntityGuids.add(relation.source);
      relatedEntityGuids.add(relation.target);
    }

    // Filter entities to only include those that are part of the relations
    const relatedEntities = allEntities.filter((entity) =>
      relatedEntityGuids.has(entity.guid)
    );

    // If no relations were found, return all entities of the requested types
    // This handles the case where we want to see all entities of certain types
    const finalEntities =
      allRelations.length > 0 ? relatedEntities : allEntities;

    console.log(`Found ${relatedEntities.length} related entities`);
    console.log(`Found ${allRelations.length} relations`);
    console.log(`Returning ${finalEntities.length} entities`);
    console.log(`Related entity GUIDs:`, Array.from(relatedEntityGuids));

    return NextResponse.json({
      entities: finalEntities,
      relations: allRelations,
    });
  } catch (e) {
    console.error("Error in POST handler:", e);
    return NextResponse.json(
      { error: "Invalid request body or server error" },
      { status: 400 }
    );
  }
}

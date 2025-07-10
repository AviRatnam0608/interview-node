/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import {
  Entity,
  EntityGraphRequest,
  Relation,
} from "@/app/interfaces/interface";
import Chatbox from "@/app/widgets/chatbox";
import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import type { ForceGraphMethods } from "react-force-graph-2d";

// Use Next.js dynamic import with ssr: false for ForceGraph2D to prevent SSR/prerender errors related to window usage in this library.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

export const MainView: React.FC = () => {
  const fgRef = useRef<ForceGraphMethods>(undefined);

  const [entities, setEntities] = useState<Entity[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [entityType, setEntityType] = useState<string>("");
  const [relationType, setRelationType] = useState<string>("");

  // Reference to graph container and its dimensions
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function updateDimensions() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    }
    if (typeof window !== "undefined") {
      updateDimensions();
      // window.addEventListener("resize", updateDimensions);
      // return () => window.removeEventListener("resize", updateDimensions);
    }
    // On server, do nothing
    return () => {};
  }, []);

  // Build graph data ensuring all referenced nodes exist
  const nodeIds = new Set<string>(entities.map((e) => e.guid));
  relations.forEach((r) => {
    nodeIds.add(r.source);
    nodeIds.add(r.target);
  });

  const nodes = Array.from(nodeIds).map((id) => {
    const entity = entities.find((e) => e.guid === id);
    return {
      id,
      name: entity?.name ?? id,
      type: entity?.type ?? "unknown",
      label: entity?.name ?? id,
    };
  });

  const links = relations.map((r) => ({ source: r.source, target: r.target }));

  const graphData = { nodes, links };

  const fetchAllEntities = async (): Promise<void> => {
    fetch("/api/entities")
      .then((response) => response.json())
      .then((data) => {
        // Flatten and map to Entity type
        const allEntities: Entity[] = Object.values(data)
          .flat()
          .map((e: any) => ({
            guid: e.guid,
            name: e.name,
            type: e.type,
            properties: Object.fromEntries(
              Object.entries(e).filter(
                ([k]) => !["guid", "name", "type"].includes(k)
              )
            ),
          }));
        setEntities(allEntities);
        console.log("Fetched entities:", allEntities);
      })
      .catch((error) => console.error("Error fetching entities:", error));
  };

  const fetchEntities = async (
    entitiesReq: EntityGraphRequest
  ): Promise<void> => {
    if (!entitiesReq.entitiesType || !entitiesReq.relationsType) {
      return fetchAllEntities();
    }

    fetch("/api/entity-graph", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entities: entitiesReq.entitiesType,
        relations: entitiesReq.relationsType,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        // data.entities will be your filtered/custom entities
        setEntities(data.entities || []);
        setRelations(data.relations || []);
        console.log("Fetched custom entities:", data.entities);
        console.log("Fetched relations:", data.relations);
      })
      .catch((error) => console.error("Error fetching entities:", error));
  };

  return (
    <div>
      <div className="flex h-96">
        <div className="w-1/2 m-2">
          <Chatbox
            entities={[entityType || "component", "tool"]}
            relations={[relationType || "tests", "secures", "monitors"]}
          />
        </div>
        <div className="w-1/2 h-full pl-4 flex flex-col border-1 rounded-lg m-2">
          <div ref={containerRef} className="flex-1">
            <ForceGraph2D
              ref={fgRef}
              graphData={graphData}
              nodeLabel="label"
              nodeAutoColorBy="type"
              nodeRelSize={10}
              linkDirectionalArrowLength={3}
              linkDirectionalArrowRelPos={1}
              linkWidth={1}
              linkColor={() => "rgb(255, 255, 255)"}
              nodeCanvasObject={(node, ctx, globalScale) => {
                const label = (node as any).name;
                const fontSize = 12 / globalScale;
                ctx.font = `${fontSize}px Sans-Serif`;
                const textWidth = ctx.measureText(label).width;
                const padding = 4 / globalScale;
                const bckgDimensions = [
                  textWidth + padding * 2,
                  fontSize + padding * 2,
                ];
                ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
                ctx.fillRect(
                  node.x! - bckgDimensions[0] / 2,
                  node.y! - bckgDimensions[1] / 2,
                  bckgDimensions[0],
                  bckgDimensions[1]
                );
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#000";
                ctx.fillText(label, node.x!, node.y!);
              }}
              width={dimensions.width}
              height={dimensions.height}
            />
          </div>
        </div>
      </div>
      <div className="flex gap-5 m-2">
        <input
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          placeholder="Entity Type"
          className=" p-2 bg-gray-900 rounded-lg"
        />
        <input
          value={relationType}
          onChange={(e) => setRelationType(e.target.value)}
          placeholder="Relation Type"
          className="p-2 bg-gray-900 rounded-lg"
        />
        <button
          onClick={() =>
            fetchEntities({
              entitiesType: [entityType],
              relationsType: [relationType],
            })
          }
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-800 hover:cursor-pointer"
        >
          Fetch Entities
        </button>
      </div>
      <div className="mt-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-2">
            <h4 className="font-medium mb-2">
              Relations ({relations.length}):
            </h4>
            <div className="max-h-60 overflow-y-auto border rounded p-2">
              {relations.map((relation) => (
                <div
                  key={relation.guid}
                  className="text-sm mb-1 p-1 bg-gray-800 rounded"
                >
                  <strong>{relation.type}</strong>
                  <br />
                  <span className="text-xs text-gray-400">
                    {relation.source} → {relation.target}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

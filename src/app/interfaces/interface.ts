export interface Entity {
  guid: string;
  name: string;
  type: string;
  properties?: Record<string, unknown>;
}

export interface Relation {
  guid: string;
  type: string;
  source: string; // guid of source entity
  target: string; // guid of target entity
  properties?: Record<string, unknown>; // for any spec_ or custom fields
}

export interface EntityGraph {
  entities: Entity[];
  relations: Relation[];
}

export interface EntityGraphRequest {
  entitiesType: string[];
  relationsType: string[];
}

export interface EntityGraphResponse {
  entities: Entity[];
  relations?: Relation[];
}

export interface EntityGraphError {
  error: string;
}

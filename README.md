We have multiple CSV files -> Determine the type of the Entity based on the file names.

JSON files -> Meta data about the nodes (ignore for now)
Archive files -> (ignore for now)

CSV files prefixed with relation\_ -> determine the relation between nodes (either within the entity, or across entities).

For a given entity/ relation:

- any keys with the prefix spec\_ -> are custom/ for a given entity
- other keys are common across all entities.

One endpoint that takes in 2 (or more) entities, and give it a relation name. -> returns all entities.

Basic:
Entities: component, tool
Relation: tests

We want 2 views:
View 1:
Entity: component, tool (types of the entity)
Relation: tests, secures, monitors (between the above entities)

View 2
Entity: component, artifact, resource, environment (types of the entity)
Relation: deployed_in, deployed_to, package (between the above entities)

View layout:

- Graph o/p
- Chat area that you provide instructions through (uses some LLM).

Plan:

1. Import our data -> into some DB
2. Create basic CRUD op functions
3. Create API end-points that consume these CRUD functionality + business logic
4. Create front-end views, that allow the user to choose between view 1 or 2.

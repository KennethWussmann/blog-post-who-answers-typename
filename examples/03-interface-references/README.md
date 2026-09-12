# 03: Let catalog answer the concrete type

## Article

This accompanies **Let playlists return what it actually knows**. The question is whether playlists can return media IDs without declaring Song, Podcast or Audiobook. With Cosmo `0.346.1` and `wgc 0.130.4`, the interface-object reference reaches catalog, which supplies the concrete type.

## Setup

Use Linux x64, Node `24.14.1`, npm and `tar`. Install with `npm ci --ignore-scripts` at the project root. The pins are Cosmo Router `0.346.1`, native `wgc 0.130.4` and Federation `v2.7` SDL. Ports 4100–4102 must be free.

`playlists/schema.graphql` declares MediaItem as an object with `@interfaceObject` and `resolvable: false`. It contains no concrete media types. Catalog has separate before/after schemas. `schema-before.graphql` knows Song and Podcast, while `schema.graphql` also knows Audiobook. Both variants use the same playlists schema and resolver file.

## Run

From the project root:

```sh
npm run test:03-interface-references
npm run start:03-interface-references -- --before
```

In another terminal:

```sh
npm run query -- examples/03-interface-references/query.graphql
npm run query -- examples/03-interface-references/query-fragments-before.graphql
```

Stop with Ctrl-C, then start the after variant:

```sh
npm run start:03-interface-references
npm run query -- examples/03-interface-references/query.graphql
npm run query -- examples/03-interface-references/query-fragments-after.graphql
```

Run query commands in a second terminal while the server is running. The first terminal prints the actual subgraph exchanges. Ctrl-C stops the router and both subgraphs. Logs and composition output are in `.generated/03-interface-references/` and can be removed after stopping.

For native composition alone, use `graph-before.yaml` or `graph.yaml`:

```sh
mkdir -p .generated/03-interface-references
npx --no-install wgc router compose --input examples/03-interface-references/graph.yaml --out .generated/03-interface-references/execution-config.json
```

## Expected observations

With Cosmo `0.346.1`, the before query returns Song and Podcast. The after query adds Audiobook without changing playlists code. `expected-before.json` and `expected-after.json` contain the full client data, including the Song-specific `artist` field.

The playlists resolver returns only `{ id }` objects. Its executor adds `__typename: "MediaItem"` to the wire response when requested. Catalog receives representations like:

```json
{ "__typename": "MediaItem", "id": "audiobook-1" }
```

Catalog responds with the concrete type and requested fields:

```json
{ "__typename": "Audiobook", "title": "The Long Way Home" }
```

The client sees `Audiobook`, not `MediaItem`. Playlists receives no entity lookups for the supplied queries.

## Simplifications

The before/after data files stand in for catalog storage and playlist membership. No HTTP mutation or live deployment is simulated. This is the same two/three-item fixture and Song fragment as the verified research example, separated into readable SDL, JSON, resolvers and queries. Startup and checks are ordinary Node scripts rather than research machinery.

## Under the hood

From the playlists executor's perspective, MediaItem is a concrete object, so it doesn't need an abstract type resolver. The router crosses the subgraph boundary with the interface key. Catalog's MediaItem reference resolver looks up the record by ID, and its type resolver returns the record's concrete typename.

`resolvable: false` prevents routing an entity lookup through that playlists key. It doesn't stop playlists from resolving its own query fields. The check validates catalog representations and responses, the full client payload and unchanged playlists schema/resolver fingerprints across variants.

## Limitations

The catalog must have enough data to resolve each tested ID. These fixtures assume IDs are unique across media kinds and don't test collisions or missing records. They don't prove every operation always needs a catalog request. The unchanged-code comparison isn't a rolling deployment guarantee. Other routers, versions, streaming and performance weren't tested.

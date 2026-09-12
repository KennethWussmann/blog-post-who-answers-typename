# 01: Composition passes, the playlist doesn't

## Article

This accompanies **The playlist breaks when the set grows**. Playlists knows Song and Podcast. Catalog also knows Audiobook. With Cosmo `0.346.1` and `wgc 0.130.4`, these schemas compose, but asking playlists to return an Audiobook fails in its local executor.

## Setup

Use Linux x64, Node `24.14.1`, npm and `tar`. Install from the project root with `npm ci --ignore-scripts`. This example runs Cosmo Router `0.346.1`, native `wgc 0.130.4` and Federation `v2.7` SDL. Ports 4100, 4101 and 4102 must be free.

Read `playlists/schema.graphql` beside `catalog/schema.graphql`. Only catalog declares Audiobook. The two data files change playlist membership, not either schema. Both have catalog data for all three media kinds.

## Run

All commands run from the project root:

```sh
npm run test:01-unknown-type
npm run start:01-unknown-type -- --before
```

The check runs both membership variants and a known-only playlist control. For the interactive before variant, use another terminal:

```sh
npm run query -- examples/01-unknown-type/query.graphql
npm run query -- examples/01-unknown-type/query-known.graphql
```

Stop with Ctrl-C, then start without `--before` to add the audiobook to the mixed playlist:

```sh
npm run start:01-unknown-type
```

Send the same queries. The server terminal prints the subgraph requests and responses. Composition and router logs are in `.generated/01-unknown-type/`. Ctrl-C stops the router and both subgraphs. You can remove that generated directory after stopping.

To inspect composition separately after installation:

```sh
mkdir -p .generated/01-unknown-type
npx --no-install wgc router compose --input examples/01-unknown-type/graph.yaml --out .generated/01-unknown-type/execution-config.json
```

## Expected observations

With Cosmo `0.346.1`, the before variant returns Song and Podcast with their titles and no errors. After adding the audiobook, the client gets:

```json
{ "data": { "playlist": null, "sanity": "alive" } }
```

An error accompanies that data. GraphQL.js `16.14.2` emits this exact local diagnostic at `["playlist", "items", 2]`:

```text
Abstract type "MediaItem" was resolved to a type "Audiobook" that does not exist inside the schema.
```

Cosmo wraps it under a client error's `extensions.errors`. The top-level message is `Failed to fetch from Subgraph 'playlists'.`, not the abstract-type diagnostic itself. `expected-before.json`, `expected-after.json` and `expected-known.json` contain the curated data responses. The check asserts the error separately rather than matching unstable line numbers.

## Simplifications

The media objects, membership and titles are in JSON files instead of databases. SDL and operation formatting is expanded for readability. The article omits runnable roots, so `Query.playlist(id: ID!): Playlist` and a sibling `sanity` field are explicit here. `query-known.graphql` is an added control. These preserve the research fixture's nullability, three-item order and unknown third item.

## Under the hood

The playlists resolver returns objects containing `id` and `__typename`. Its `MediaItem.__resolveType` returns that typename. The local schema still has to recognise the answer. The error nulls the non-null item, then the non-null list, then the nullable playlist parent. The sibling field survives.

Successful native composition says nothing about every value a resolver might later return. The known-only query distinguishes an unknown-implementation error from a generally broken entity join.

## Limitations

The playlist-level boundary depends on the nullable parent field. A non-null parent could propagate the error farther, potentially to `data: null`. The exact diagnostic belongs to the pinned local executor. Other subgraph libraries, routers and versions weren't tested. This isn't a schema-migration, latency or backend request-count test.

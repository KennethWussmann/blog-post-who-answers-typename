# 04: Reviews doesn't resolve a Song

## Article

This accompanies **Adding fields to an entity-interface**. Reviews owns ratings for a media ID, not a resolver per media kind. With Cosmo `0.346.1` and `wgc 0.130.4`, the interface-object fields are queryable through MediaItem and its concrete implementations. Reviews receives MediaItem entity lookups in both cases.

## Setup

Use Linux x64, Node `24.14.1`, npm and `tar`. Install from the project root with `npm ci --ignore-scripts`. Pins are Cosmo Router `0.346.1`, native `wgc 0.130.4` and Federation `v2.7` SDL. Ports 4100–4103 must be free.

Read `reviews/schema.graphql`. Its MediaItem is an object with a resolvable key, unlike the reference-only playlists object. It adds `averageRating: Float` and `reviewCount: Int!`. Neither the reviews schema nor its resolvers mention Song, Podcast or Audiobook.

## Run

From the project root:

```sh
npm run test:04-generic-reviews
npm run start:04-generic-reviews -- --before
```

Use a second terminal for the two supplied query shapes:

```sh
npm run query -- examples/04-generic-reviews/query.graphql
npm run query -- examples/04-generic-reviews/query-fragments-before.graphql
```

Stop the server with Ctrl-C. Start without `--before`, then query the new catalog implementation:

```sh
npm run start:04-generic-reviews
```

In the second terminal:

```sh
npm run query -- examples/04-generic-reviews/query.graphql
npm run query -- examples/04-generic-reviews/query-fragments-after.graphql
```

The server terminal prints every subgraph request and response. Composition and router logs are under `.generated/04-generic-reviews/`. Ctrl-C stops the router and all three subgraphs. Generated files can be removed after stopping.

For composition alone:

```sh
mkdir -p .generated/04-generic-reviews
npx --no-install wgc router compose --input examples/04-generic-reviews/graph.yaml --out .generated/04-generic-reviews/execution-config.json
```

## Expected observations

Cosmo `0.346.1` returns ratings for Song and Podcast before the addition, then for Audiobook as well. The audiobook has `averageRating: 5` and `reviewCount: 1` in this fixture. The expected files record the complete client data.

The actual reviews operation has this structure:

```graphql
query($representations: [_Any!]!) {
  _entities(representations: $representations) {
    ... on MediaItem {
      averageRating
      reviewCount
    }
  }
}
```

Its representations use `__typename: "MediaItem"`, including `id: "audiobook-1"`. The check parses the captured queries and requires the MediaItem fragment. It rejects concrete media fragments instead of merely looking for a successful response.

`query.graphql` selects the ratings through the interface. The second query selects them through Song, Podcast and, in the after variant, Audiobook fragments. Both return the same ratings.

## Simplifications

JSON maps replace storage. The after variant adds catalog SDL, a catalog record, playlist membership and ratings data. **It doesn't change playlists or reviews schema/resolver files.** Their fingerprints are checked across variants. Each variant restarts local processes, so this demonstrates unchanged code, not deployment orchestration.

The three media kinds, field nullability, query shapes and exact ratings match the verified research fixture. Expected files omit transport metadata, not business fields.

## Under the hood

Native composition exposes the review fields on MediaItem and its implementations. Reviews still executes against its own concrete MediaItem object. Its one reference resolver returns the ID, and field resolvers use that ID to find ratings.

Catalog resolves concrete types for the supplied operations. Reviews doesn't need catalog's concrete typename to interpret its own MediaItem representation. Don't infer a guaranteed ordering between the catalog and reviews requests from one trace.

## Limitations

“No deployment needed” should be read here as no concrete-type-specific schema or resolver change. A real service may still need data ingestion, permissions or other operational changes. Missing ratings and missing catalog records aren't tested, even though the sample resolver defines fallbacks. Other versions, routers, key collisions, schema migration safety, streaming and performance weren't tested.

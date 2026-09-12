# 02: Keep the known items

## Article

This accompanies **The playlist breaks when the set grows**, specifically the change from `[MediaItem!]!` to `[MediaItem]!`. With Cosmo `0.346.1` and `wgc 0.130.4`, the nullable item position contains the execution error. It doesn't teach playlists what an Audiobook is.

## Setup

Use Linux x64, Node `24.14.1`, npm and `tar`. Run `npm ci --ignore-scripts` at the project root. Pins are Cosmo Router `0.346.1`, native `wgc 0.130.4` and Federation `v2.7` SDL. Ports 4100–4102 must be free.

Compare `playlists/schema.graphql` with example 01. The relevant change is the missing inner non-null marker on `items`. Catalog still defines Audiobook, playlists still doesn't and the mixed playlist still contains all three IDs with their concrete typenames.

## Run

From the project root:

```sh
npm run test:02-nullable-items
npm run start:02-nullable-items
```

In another terminal:

```sh
npm run query -- examples/02-nullable-items/query.graphql
npm run query -- examples/02-nullable-items/query-known.graphql
```

Read the live subgraph requests and responses in the server terminal. The native composition and router logs are under `.generated/02-nullable-items/`. Ctrl-C stops all three processes. Generated files can be removed after stopping. There is no separate before variant here, example 01 supplies the non-null comparison.

For composition without starting servers:

```sh
mkdir -p .generated/02-nullable-items
npx --no-install wgc router compose --input examples/02-nullable-items/graph.yaml --out .generated/02-nullable-items/execution-config.json
```

## Expected observations

Cosmo `0.346.1` returns the two known items and a null third position:

```json
{
  "data": {
    "playlist": {
      "name": "Commute",
      "items": [
        { "__typename": "Song", "id": "song-1", "title": "Northern Lights" },
        { "__typename": "Podcast", "id": "podcast-1", "title": "The Schema" },
        null
      ]
    },
    "sanity": "alive"
  }
}
```

An error still accompanies this data. GraphQL.js `16.14.2` reports the same unknown-Audiobook diagnostic at `["playlist", "items", 2]` as example 01. Catalog receives only Song and Podcast entity representations. `expected-after.json` records the data shape, while the check independently asserts the diagnostic, client error and absence of an Audiobook lookup.

## Simplifications

The data is in memory and the supplied article's partial schemas have explicit federation links and query roots. The three-item order and nullable-item boundary match the verified research fixture. The expected JSON omits error locations because the readable SDL/query formatting changes line and column numbers. The check still requires the exact diagnostic and error path.

## Under the hood

A nullable item can become null without invalidating its containing list. The playlists executor therefore preserves the Song and Podcast references. Cosmo can still fetch their titles from catalog and assemble the partial result. The unknown item never becomes a valid reference to forward.

## Limitations

This is error containment, not type resolution. The audiobook remains unreadable through this playlist query. It doesn't establish how a UI should display the partial response or whether changing nullability is acceptable for existing clients. Other executors, router versions, migrations, streaming and performance weren't tested.

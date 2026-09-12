# Blog Post: Who answers `__typename`?

This repo accompanies the blog post about polymorphism across subgraph boundaries. It validates the claims made in the post to ensure they are accurate against actual router behaviour.

The examples use real Cosmo Router `0.346.1` and native `wgc 0.130.4` composition. Each subgraph links Federation `v2.7`. They preserve the mixed Song/Podcast/Audiobook list, the unknown-type error, the nullability boundary and generic review lookups.

## Start here

You need **Linux x64**, Node **24.14.1**, npm, `tar` and free loopback ports **4100–4103**. Run commands from this project root, one example at a time. These are local development servers, not production configuration.

```sh
npm ci --ignore-scripts
npm test
```

`npm test` runs all four checks sequentially. Each check downloads or verifies the pinned router, composes the selected schemas, starts the local servers, sends the supplied queries and asserts the response and relevant subgraph traffic. It stops its processes on completion, failure or Ctrl-C. The two examples with expected GraphQL errors still pass when those errors and their effects match the assertions.

| Example | Article section | Question |
| --- | --- | --- |
| [01 Unknown type](examples/01-unknown-type/README.md) | The playlist breaks when the set grows | Why does composition pass while the playlist becomes null? |
| [02 Nullable items](examples/02-nullable-items/README.md) | The playlist breaks when the set grows | Can the known items survive the same error? |
| [03 Interface references](examples/03-interface-references/README.md) | Let playlists return what it actually knows | Can playlists return IDs while catalog supplies concrete types? |
| [04 Generic reviews](examples/04-generic-reviews/README.md) | Adding fields to an entity-interface | Can unchanged review resolvers serve a new media implementation? |

For an interactive run:

```sh
npm run start:04-generic-reviews
```

In another terminal at this project root:

```sh
npm run query -- examples/04-generic-reviews/query.graphql
```

The server terminal prints every subgraph query, variables and response. Stop it with Ctrl-C. Each example's README explains its before/after controls and where to inspect the SDL and resolvers.

## Pins and network access

| Component | Version |
| --- | --- |
| Cosmo Router | `0.346.1` |
| Native composer, npm `wgc` | `0.130.4` |
| Node | `24.14.1` |
| GraphQL.js | `16.14.2` |
| `@apollo/subgraph` | `2.15.0` |
| GraphQL Yoga | `5.23.0` |
| Federation SDL | `v2.7` |

npm dependencies come from the public npm registry. `scripts/download.mjs` downloads the Linux x64 router from the pinned [Cosmo release](https://github.com/wundergraph/cosmo/releases/tag/router%400.346.1), verifies its recorded SHA256 and checks its reported version. The hash was recorded from the research binary, not supplied as an upstream signature. Nothing silently falls back to another release.

Composition uses `wgc router compose`, not a shared composer shim. Local tool configuration lives under `.cache/`, downloaded binaries under `.bin/` and composition outputs/logs under `.generated/<example>/`. Router telemetry and tool update checks are disabled. No hosted graph or credentials are required.

## What this doesn't establish

These are synthetic in-memory examples, not production deployment or performance tests. A before/after comparison changes fixture data and catalog SDL while leaving playlists/reviews code untouched. It isn't a rolling deployment test.

`Query.playlist` is nullable here. Changing the parent nullability can let an execution error propagate farther. “Only IDs” describes the playlists resolver output, not the full wire response: the local executor also returns `__typename: "MediaItem"` when requested.

[Apollo's entity-interface documentation](https://www.apollographql.com/docs/graphos/schema-design/federated-schemas/entities/interfaces) describes implementation coverage and interface-key uniqueness. These examples assume those constraints rather than testing missing implementations or colliding IDs. Migration compatibility, other routers, other versions, streaming, missing business data and other platforms weren't tested.

This is editable example source. Passing its checks doesn't validate every statement in the article or replace editorial review.

## Licensing

Cosmo Router is Apache-2.0 licensed and downloaded separately. `wgc`, GraphQL.js, GraphQL Yoga and `@apollo/subgraph` retain their package licenses. `@apollo/subgraph` is an MIT-licensed subgraph library, not the Apollo Router binary. This project neither downloads nor starts Apollo Router and needs no ELv2 acceptance. The supplied article has separate rights and isn't included.

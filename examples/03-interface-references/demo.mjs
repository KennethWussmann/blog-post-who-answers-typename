import { readFile } from "node:fs/promises";
import { serve } from "../../scripts/servers.mjs";
import { createResolvers as playlists } from "./playlists/resolvers.mjs";
import { createResolvers as catalog } from "./catalog/resolvers.mjs";

export const startDemo = async (before = false) => {
  const base = "examples/03-interface-references";
  const variant = before ? "before" : "after";
  const data = JSON.parse(await readFile(`${base}/data-${variant}.json`, "utf8"));
  return serve({
    directory: "03-interface-references",
    graph: `${base}/${before ? "graph-before.yaml" : "graph.yaml"}`,
    subgraphs: [
      {
        name: "playlists",
        port: 4101,
        schema: `${base}/playlists/schema.graphql`,
        resolvers: playlists(data.playlistIds),
      },
      {
        name: "catalog",
        port: 4102,
        schema: `${base}/catalog/${before ? "schema-before.graphql" : "schema.graphql"}`,
        resolvers: catalog(data.catalog),
      },
    ],
  });
};

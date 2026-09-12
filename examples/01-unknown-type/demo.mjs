import { readFile } from "node:fs/promises";
import { serve } from "../../scripts/servers.mjs";
import { createResolvers as playlists } from "./playlists/resolvers.mjs";
import { createResolvers as catalog } from "./catalog/resolvers.mjs";

export const startDemo = async (before = false) => {
  const base = "examples/01-unknown-type";
  const variant = before ? "before" : "after";
  const data = JSON.parse(await readFile(`${base}/data-${variant}.json`, "utf8"));
  return serve({
    directory: "01-unknown-type",
    graph: `${base}/graph.yaml`,
    subgraphs: [
      {
        name: "playlists",
        port: 4101,
        schema: `${base}/playlists/schema.graphql`,
        resolvers: playlists(data.playlistItems),
      },
      {
        name: "catalog",
        port: 4102,
        schema: `${base}/catalog/schema.graphql`,
        resolvers: catalog(data.catalog),
      },
    ],
  });
};

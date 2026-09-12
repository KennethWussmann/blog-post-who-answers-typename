import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parse, visit } from "graphql";
import { sendQuery, representations } from "../../scripts/query.mjs";
import { startDemo } from "./demo.mjs";

const base = "examples/04-generic-reviews";
const sourceFiles = [
  "playlists/schema.graphql",
  "playlists/resolvers.mjs",
  "reviews/schema.graphql",
  "reviews/resolvers.mjs",
];
const fingerprint = async () =>
  Promise.all(
    sourceFiles.map(async (file) => {
      const text = await readFile(`${base}/${file}`, "utf8");
      assert.doesNotMatch(text, /Song|Podcast|Audiobook/);
      return createHash("sha256").update(text).digest("hex");
    }),
  );
const original = await fingerprint();
for (const variant of ["before", "after"]) {
  const demo = await startDemo(variant === "before");
  try {
    const expected = JSON.parse(await readFile(`${base}/expected-${variant}.json`, "utf8"));
    const ids = expected.data.playlist.items.map((item) => item.id).sort();
    for (const query of ["query.graphql", `query-fragments-${variant}.graphql`]) {
      demo.clear();
      const actual = await sendQuery(`${base}/${query}`);
      assert.equal(actual.errors, undefined);
      assert.deepEqual(actual.data, expected.data);
      assert.ok(demo.requests.some((request) => request.subgraph === "playlists"));
      assert.deepEqual(representations(demo.requests, "playlists"), []);
      const items = demo.responses
        .filter((response) => response.subgraph === "playlists")
        .flatMap((response) => response.result.data?.playlist?.items ?? []);
      assert.equal(items.length, ids.length);
      assert.ok(
        items.every(
          (item) =>
            item.__typename === "MediaItem" &&
            Object.keys(item).every((key) => key === "id" || key === "__typename"),
        ),
      );
      for (const subgraph of ["catalog", "reviews"]) {
        const refs = representations(demo.requests, subgraph);
        assert.ok(refs.length > 0);
        assert.ok(refs.every((ref) => ref.__typename === "MediaItem"));
        assert.deepEqual([...new Set(refs.map((ref) => ref.id))].sort(), ids);
      }
      const types = demo.responses
        .filter((response) => response.subgraph === "catalog")
        .flatMap((response) => response.result.data?._entities ?? [])
        .map((item) => item.__typename);
      assert.ok(expected.data.playlist.items.every((item) => types.includes(item.__typename)));

      const reviewRequests = demo.requests.filter((request) => request.subgraph === "reviews");
      const fragments = [];
      let entityFields = 0;
      for (const request of reviewRequests)
        visit(parse(request.query), {
          Field(node) {
            if (node.name.value === "_entities") entityFields += 1;
          },
          InlineFragment(node) {
            if (node.typeCondition) fragments.push(node.typeCondition.name.value);
          },
          FragmentDefinition(node) {
            fragments.push(node.typeCondition.name.value);
          },
        });
      assert.ok(entityFields > 0);
      assert.ok(fragments.includes("MediaItem"));
      assert.ok(fragments.every((name) => name === "MediaItem"));
    }
    assert.deepEqual(await fingerprint(), original);
  } finally {
    await demo.stop();
  }
}
process.stdout.write("04-generic-reviews: assertions passed\n");

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sendQuery, representations } from "../../scripts/query.mjs";
import { startDemo } from "./demo.mjs";

const base = "examples/01-unknown-type";
const diagnostic =
  'Abstract type "MediaItem" was resolved to a type "Audiobook" that does not exist inside the schema.';
for (const variant of ["before", "after"]) {
  const demo = await startDemo(variant === "before");
  try {
    const expected = JSON.parse(await readFile(`${base}/expected-${variant}.json`, "utf8"));
    const actual = await sendQuery(`${base}/query.graphql`);
    assert.deepEqual(actual.data, expected.data);
    assert.equal(actual.data.sanity, "alive");
    const local = demo.responses.filter((response) => response.subgraph === "playlists");
    const errors = local.flatMap((response) => response.result.errors ?? []);
    if (variant === "before") {
      assert.equal(actual.errors, undefined);
      assert.equal(errors.length, 0);
    } else {
      assert.ok(errors.some((error) => error.message === diagnostic));
      assert.ok(errors.some((error) => JSON.stringify(error.path) === '["playlist","items",2]'));
      assert.ok(actual.errors?.length > 0);
      assert.ok(
        actual.errors.some((error) =>
          error.extensions?.errors?.some((nested) => nested.message === diagnostic),
        ),
      );
      assert.ok(local.some((response) => response.result.data?.playlist === null));
    }
    assert.ok(
      representations(demo.requests, "catalog").every(
        (ref) => ref.id !== "audiobook-1" && ref.__typename !== "Audiobook",
      ),
    );
    demo.clear();
    const known = await sendQuery(`${base}/query-known.graphql`);
    assert.equal(known.errors, undefined);
    assert.deepEqual(
      known.data,
      JSON.parse(await readFile(`${base}/expected-known.json`, "utf8")).data,
    );
  } finally {
    await demo.stop();
  }
}
process.stdout.write("01-unknown-type: assertions passed\n");

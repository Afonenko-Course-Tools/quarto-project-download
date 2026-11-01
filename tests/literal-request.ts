import { lowerLiteralDownloadRequests } from "../_extensions/project-download/native-ts/early-filter.ts";
const ast = JSON.parse(
    await Deno.readTextFile(
      new URL(
        "fixtures/literal-request/baseline-early-ast.json",
        import.meta.url,
      ),
    ),
  ),
  core = Deno.env.get("CORE");
if (!core) throw Error("CORE обязателен");
const { qualifyAssignmentProducer } = await import(
  new URL(
    "_extensions/course-core/document/assignment-producer.ts",
    new URL("file://" + core + "/"),
  ).href
);
const evidence = { format: "html", sourceProbe: "actual1115" },
  context = { format: "html" },
  profile = {
    native: {
      producerEvidence: { html: { sourceProbe: "actual1115" } },
      literalShortcodes: ["xref", "meta"],
    },
  };
let count = 0;
function refuse(name: string, f: () => unknown, part: string) {
  let error = "";
  try {
    f();
  } catch (e) {
    error = String(e);
  }
  if (!error.includes(part)) throw Error(name + ": " + error);
  count++;
}
function qualify(v: unknown) {
  return qualifyAssignmentProducer(v, context, profile, evidence);
}
refuse("before13", () => qualify(ast), "Shortcode не квалифицирован");
const after = lowerLiteralDownloadRequests(
  structuredClone(ast),
  "bank/numbers.qmd",
);
qualify(after);
count++;
function first(v: any): any {
  if (Array.isArray(v)) {
    for (const x of v) {
      const r = first(x);
      if (r) return r;
    }
  } else if (v && typeof v === "object") {
    if (v.t === "Span" && v.c?.[0]?.[1]?.includes("quarto-shortcode__")) {
      return v;
    }
    for (const x of Object.values(v)) {
      const r = first(x);
      if (r) return r;
    }
  }
}
function mutant(
  name: string,
  fn: (v: any) => void,
  part = "DOWNLOAD.DELIVERY_PHASE_UNSUPPORTED",
) {
  const v = structuredClone(ast);
  fn(first(v.blocks));
  refuse(name, () => lowerLiteralDownloadRequests(v, "bank/numbers.qmd"), part);
}
mutant("outer authored id", (v) => v.c[0][0] = "exr-fake");
mutant("outer authored Core class", (v) => v.c[0][1].push("solution"));
mutant(
  "outer authored Core attr",
  (v) => v.c[0][2].push(["course-core-role", "solution"]),
);
mutant("param authored id", (v) => v.c[1][0].c[0][0] = "hidden");
mutant("unknown param attr", (v) => v.c[1][0].c[0][2].push(["unknown", "x"]));
mutant(
  "nested arg",
  (v) =>
    v.c[1].filter((p: any) => p.t === "Span")[1].c[1].push({
      t: "Str",
      c: "dynamic",
    }),
);
mutant(
  "UUID arg",
  (v) =>
    v.c[1].filter((p: any) => p.t === "Span")[1].c[0][2].push([
      "data-raw",
      "b58fc729-690b-4000-b19f-365a4093b2ff;123;",
    ]),
);
for (
  const cls of ["project-download-request", "project-download-raw-request"]
) {
  const v = structuredClone(ast);
  v.blocks.push({ t: "Para", c: [{ t: "Span", c: [["", [cls], []], []] }] });
  refuse(
    "reserved " + cls,
    () => lowerLiteralDownloadRequests(v, "bank/numbers.qmd"),
    "reserved",
  );
}
for (
  const field of [
    "project-download-native-source",
    "project-download-native-batch",
    "project-download-native-result",
  ]
) {
  const v = structuredClone(ast);
  v.meta[field] = { t: "MetaString", c: "forged" };
  refuse(
    field,
    () => lowerLiteralDownloadRequests(v, "bank/numbers.qmd"),
    "reserved",
  );
}
const unknown = structuredClone(ast), span = first(unknown.blocks);
span.c[1][0].c[0][2].find((x: any) => x[0] === "data-value")[1] =
  "other-handler";
const kept = lowerLiteralDownloadRequests(unknown, "bank/numbers.qmd");
refuse(
  "other remains Core-owned",
  () => qualify(kept),
  "Shortcode не квалифицирован",
);
console.log(
  JSON.stringify({
    controls: count,
    actual13ReaderFixture: true,
    scope:
      "pure qualifier/parser only, evidence equality controlled; NOT authority/admission/P",
  }),
);

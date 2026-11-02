import {
  decodeDownloadRequest,
  resolveDownloadRequests,
} from "../_extensions/project-download/domain/request.ts";
const assert = (v: unknown, m: string) => {
  if (!v) throw Error(m);
};
const equal = (a: unknown, b: unknown) =>
  assert(JSON.stringify(a) === JSON.stringify(b), JSON.stringify({ a, b }));
let checks = 0;
function refuses(fn: () => unknown, code: string) {
  let seen = "";
  try {
    fn();
  } catch (e) {
    seen = String(e);
  }
  assert(seen.includes(code), `Ожидался ${code}: ${seen}`);
  checks++;
}
const args = (id = "data", named: { key: string; value: string }[] = []) => ({
  positional: [id],
  named,
});
equal(decodeDownloadRequest(args(), "nested/page.qmd"), {
  resource: "data",
  text: "",
});
checks++;
for (const kind of ["starter", "full", "conditions"]) {
  equal(
    decodeDownloadRequest(
      args("exr-demo", [{ key: "kind", value: kind }, {
        key: "text",
        value: "Подпись",
      }]),
      "lesson.qmd",
    ),
    { resource: "exr-demo", text: "Подпись", kind },
  );
  checks++;
}
for (const positional of [[], ["a", "b"]]) {
  refuses(
    () => decodeDownloadRequest({ positional, named: [] }, "lesson.qmd"),
    "DOWNLOAD.REQUEST_INVALID",
  );
}
for (const id of ["../escape", "Bad", "", "a/b"]) {
  refuses(
    () => decodeDownloadRequest(args(id), "lesson.qmd"),
    "DOWNLOAD.REQUEST_INVALID",
  );
}
for (
  const named of [[{ key: "unknown", value: "x" }], [{
    key: "kind",
    value: "invalid",
  }], [{ key: "kind", value: "full" }, { key: "kind", value: "starter" }]]
) {
  refuses(
    () => decodeDownloadRequest(args("exr-a", named), "lesson.qmd"),
    "DOWNLOAD.REQUEST_INVALID",
  );
}
const batch = (resource = "exr-a", extra: Record<string, unknown> = {}) => ({
  source: "nested/page.qmd",
  view: "student",
  configuration: { "course-model": true },
  native: true,
  courseProcessed: true,
  exercises: {
    "exr-a": {
      "course-role": "independent-study",
      "statement-visibility": "open",
    },
  },
  artifactContext: {},
  requests: [{ ordinal: 0, ...args(resource), inline: true }],
  ...extra,
});
let r = resolveDownloadRequests(batch());
equal(r.links, [{
  ordinal: 0,
  href: "../_downloads/exr-a-starter.zip",
  text: "Скачать заготовку",
}]);
equal(r.request.artifacts, [{ exerciseId: "exr-a", kind: "starter" }]);
checks++;
r = resolveDownloadRequests(batch("exr-a", { view: "full" }));
equal(r.request.artifacts, [{ exerciseId: "exr-a", kind: "full" }]);
checks++;
r = resolveDownloadRequests(
  batch("exr-a", {
    artifactContext: {
      "exr-a": { purpose: "demonstration", statementVisibility: "open" },
    },
  }),
);
equal(r.request.artifacts, [{ exerciseId: "exr-a", kind: "full" }]);
checks++;
r = resolveDownloadRequests(
  batch("data", {
    configuration: { resources: { data: { path: "/data" } } },
    requests: [{
      ordinal: 0,
      ...args("data", [{ key: "text", value: "" }]),
      inline: true,
    }],
  }),
);
equal(r.links, [{
  ordinal: 0,
  href: "../_downloads/data.zip",
  text: "Скачать материалы",
}]);
equal(r.request.resources, ["data"]);
checks++;
refuses(
  () =>
    resolveDownloadRequests(
      batch("data", {
        configuration: { resources: { data: { path: "/data" } } },
        requests: [{
          ordinal: 0,
          ...args("data", [{ key: "kind", value: "full" }]),
          inline: true,
        }],
      }),
    ),
  "DOWNLOAD.REQUEST_INVALID",
);
refuses(
  () => resolveDownloadRequests(batch("exr-a", { configuration: undefined })),
  "DOWNLOAD.CONFIG_INVALID",
);
refuses(
  () =>
    resolveDownloadRequests(
      batch("unknown", { configuration: { resources: {} } }),
    ),
  "DOWNLOAD.RESOURCE_UNAVAILABLE",
);
refuses(
  () =>
    resolveDownloadRequests(
      batch("exr-a", { exercises: {}, artifactContext: {} }),
    ),
  "DOWNLOAD.KIND_UNQUALIFIED",
);
// Имена prototype не являются объявлением ресурса; законный own ID не запрещён.
for (const id of ["missing", "constructor"]) {
  refuses(() => resolveDownloadRequests(batch(id, {
    configuration: { resources: {} },
  })), "DOWNLOAD.RESOURCE_UNAVAILABLE");
}
r = resolveDownloadRequests(batch("constructor", {
  configuration: { resources: { constructor: { path: "/materials" } } },
}));
equal(r.request.resources, ["constructor"]);
assert(r.links[0].href === "../_downloads/constructor.zip", "Объявленный constructor потерян");
checks++;
r = resolveDownloadRequests(batch("exr-a", {
  requests: [{
    ordinal: 0,
    ...args("exr-a", [{ key: "kind", value: "conditions" }]),
    inline: true,
  }, {
    ordinal: 1,
    ...args("exr-a", [{ key: "kind", value: "conditions" }]),
    inline: true,
  }],
}));
equal(r.request.artifacts, [{ exerciseId: "exr-a", kind: "conditions" }]);
assert(r.links.length === 2, "Повторные ссылки должны сохраниться");
checks++;
// G1: законные stringify-only calls не требуют config/resource/kind resolution.
for (
  const named of [[], [{ key: "kind", value: "full" }], [{
    key: "text",
    value: "Текст",
  }]]
) {
  const b = batch("missing", {
    configuration: undefined,
    requests: [{ ordinal: 0, ...args("missing", named), inline: false }],
  });
  const q = resolveDownloadRequests(b);
  equal(q.links, []);
  equal(q.request.resources, []);
  assert(!q.request.artifacts, "Stringify-only не создаёт artifact");
  checks++;
}
refuses(
  () =>
    resolveDownloadRequests(
      batch("missing", {
        configuration: undefined,
        requests: [{ ordinal: 0, ...args("../invalid"), inline: false }],
      }),
    ),
  "DOWNLOAD.REQUEST_INVALID",
);
console.log(
  JSON.stringify({
    status: "PASS",
    checks,
    scope: "Pure Download request contract, no Core/authority/IO",
  }),
);

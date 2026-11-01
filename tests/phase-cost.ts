import { copy } from "stdlib/fs";
import { dirname, fromFileUrl, join } from "stdlib/path";
const repo = dirname(dirname(fromFileUrl(import.meta.url))),
  base = Deno.env.get("DOWNLOAD_BASE"),
  root = await Deno.makeTempDir({ prefix: "download-cost-" }),
  rows: any[] = [],
  q = Deno.env.get("QUARTO") ?? "/opt/quarto/bin/quarto";
if (!base) throw Error("DOWNLOAD_BASE обязателен для paired measurement");
function assert(v: unknown, m: string) {
  if (!v) throw Error(m);
}
try {
  await Deno.mkdir(join(root, "data"));
  await Deno.writeTextFile(join(root, "data/a.txt"), "PUBLIC\n");
  await Deno.mkdir(join(root, "_extensions"));
  await Deno.writeTextFile(
    join(root, "_quarto.yml"),
    "project: {type: website}\nformat: {html: {theme: none}}\nfilters: [project-download]\nproject-download: {resources: {data: {path: data}}}\n",
  );
  const observer = join(root, "quarto-observer.sh");
  await Deno.writeTextFile(
    observer,
    `#!/usr/bin/env bash\nset -euo pipefail\nprintf '%s\\n' "$*" >> "$DOWNLOAD_COST_LOG"\nexec ${
      JSON.stringify(q)
    } "$@"\n`,
  );
  await Deno.chmod(observer, 0o700);
  for (const [name, source] of [["before", base], ["after", repo]]) {
    if (
      Deno.env.get("DOWNLOAD_COST_SELECT") &&
      name !== Deno.env.get("DOWNLOAD_COST_SELECT")
    ) continue;
    await Deno.remove(join(root, "_extensions/project-download"), {
      recursive: true,
    }).catch(() => {});
    await copy(
      join(source!, "_extensions/project-download"),
      join(root, "_extensions/project-download"),
    );
    {
      for (
        const file of [
          "filter.lua",
          ...(name === "after" ? ["native-ts/early-filter.lua"] : []),
        ]
      ) {
        const path = join(root, "_extensions/project-download", file),
          source = await Deno.readTextFile(path);
        await Deno.writeTextFile(
          path,
          source.replaceAll(
            "function(node,filter)return node:walk(filter)end",
            "function(node,filter)io.stderr:write('DOWNLOAD_TEST_WALK\\n');return node:walk(filter)end",
          ),
        );
      }
    }
    for (
      const [n, restrictive] of (name === "after"
        ? [[0, false], [1, false], [13, false], [0, true], [1, true], [
          13,
          true,
        ]]
        : [[0, false], [1, false], [13, false]]) as [number, boolean][]
    ) {
      await Deno.writeTextFile(
        join(root, "index.qmd"),
        "# Пакет\n\n" +
          Array(n).fill("{{< project-download data >}}").join("\n\n") + "\n",
      );
      const log = join(root, "calls.log");
      await Deno.writeTextFile(log, "");
      const t = performance.now(),
        r = await new Deno.Command(q, {
          args: ["render", "index.qmd"],
          cwd: root,
          env: {
            QUARTO: observer,
            DOWNLOAD_COST_LOG: log,
            ...(restrictive ? { PROJECT_DOWNLOAD_LITERAL_ONLY: "1" } : {}),
          },
          stdout: "piped",
          stderr: "piped",
        }).output();
      assert(r.success, new TextDecoder().decode(r.stderr));
      const calls = (await Deno.readTextFile(log)).trim().split("\n").filter(
          Boolean,
        ),
        early = calls.filter((c) =>
          c.includes("/native-ts/early-filter.ts")
        ).length,
        late = calls.filter((c) =>
          c.includes("/native-ts/late-filter.ts")
        ).length;
      if (name === "after") {
        assert(
          early === (restrictive && n ? 1 : 0) && late === (n ? 1 : 0),
          "ordinary phase cost depends on requests: " + JSON.stringify(calls),
        );
      }
      rows.push({
        name,
        requests: n,
        restrictive,
        fullWalkLogOccurrences:
          (new TextDecoder().decode(r.stderr).match(/DOWNLOAD_TEST_WALK/g) ??
            []).length,
        ms: performance.now() - t,
        earlyTS: early,
        lateTS: late,
        tool: q,
        stdoutBytes: r.stdout.length,
        stderrBytes: r.stderr.length,
      });
    }
  }
  console.log(
    JSON.stringify({
      scope:
        "same fixture/tool/readonly cache, new process per render; no general speed claim",
      rows,
    }),
  );
  const out = Deno.env.get("DOWNLOAD_LITERAL_EVIDENCE");
  if (out) {
    await Deno.mkdir(out, { recursive: true });
    await Deno.writeTextFile(
      join(out, "phase-cost.json"),
      JSON.stringify(rows, null, 2),
    );
  }
} finally {
  await Deno.remove(root, { recursive: true });
}

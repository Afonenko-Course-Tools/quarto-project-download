// Actual ordinary no-Core stringify carriers; G1/G2, не assignment/P.
import { copy } from "stdlib/fs";
import { dirname, fromFileUrl, join } from "stdlib/path";
const repo = dirname(dirname(fromFileUrl(import.meta.url))),
  root = await Deno.makeTempDir({ prefix: "download-carriers-" }),
  q = Deno.env.get("QUARTO") ?? "quarto",
  td = new TextDecoder();
function assert(v: unknown, m: string) {
  if (!v) throw Error(m);
}
const rows: any[] = [];
try {
  await copy(
    join(Deno.env.get("NATIVE_CARRIER_BASE") ?? repo, "_extensions"),
    join(root, "_extensions"),
  );
  await Deno.writeTextFile(
    join(root, "_quarto.yml"),
    "project: {type: website}\nformat: {html: {theme: none}}\nfilters: [project-download]\n",
  );
  const callbackFile = join(
      root,
      "_extensions/project-download/shortcodes.lua",
    ),
    callbackSource = await Deno.readTextFile(callbackFile);
  await Deno.writeTextFile(
    callbackFile,
    callbackSource.replace(
      /function\(args,\s*kwargs\)/,
      "function(args,kwargs) io.stderr:write('DOWNLOAD_TEST_CALLBACK\\n');",
    ),
  );
  async function run(
    name: string,
    body: string,
    error?: string,
    restrictive = false,
    metadata = false,
    expectedRequest?: string,
  ) {
    if (
      Deno.env.get("NATIVE_CARRIER_BASE") &&
      (name.startsWith("authored reserved") || name === "restrictive callback")
    ) return;
    if (
      Deno.env.get("CARRIER_CASE") &&
      !name.includes(Deno.env.get("CARRIER_CASE")!)
    ) return;
    await Deno.remove(join(root, "_generated"), { recursive: true }).catch(
      () => {},
    );
    await Deno.writeTextFile(
      join(root, "index.qmd"),
      (metadata ? "---\ntitle: '" + body + "'\n---\n" : "") + "# Носитель\n\n" +
        (metadata ? "Текст" : body) + "\n",
    );
    const t = performance.now(),
      p = await new Deno.Command(q, {
        args: ["render", "index.qmd"],
        cwd: root,
        env: restrictive ? { PROJECT_DOWNLOAD_LITERAL_ONLY: "1" } : {},
        stdout: "piped",
        stderr: "piped",
      }).output(),
      stderr = td.decode(p.stderr);
    rows.push({
      name,
      exit: p.code,
      callbackLogOccurrences:
        (stderr.match(/DOWNLOAD_TEST_CALLBACK/g) ?? []).length,
      ms: performance.now() - t,
    });
    if (error) {
      assert(!p.success && stderr.includes(error), name + ": " + stderr);
      return;
    }
    assert(p.success, name + ": " + stderr);
    const requests = [];
    for await (
      const e of Deno.readDir(
        join(root, "_generated/project-download/requests"),
      )
    ) {
      requests.push(
        JSON.parse(
          await Deno.readTextFile(
            join(root, "_generated/project-download/requests", e.name),
          ),
        ),
      );
    }
    assert(
      requests.length === 1 &&
        JSON.stringify(requests[0].resources) ===
          JSON.stringify(expectedRequest ? [expectedRequest] : []) &&
        !requests[0].artifacts,
      name + ": stringify создал resource request",
    );
    const html = await Deno.readTextFile(join(root, "_site/index.html"));
    const main = html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? html;
    rows.at(-1).mainSha256 = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(main)),
      ),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
    assert(
      (name.startsWith("nested") || name.startsWith("Math") ||
        name === "shortcodes off" || html.includes("Текст")) &&
        !html.includes("project-download-raw-request") &&
        !html.includes("data-project-download-ordinal"),
      name + ": carrier leak/text",
    );
  }
  const call = '{{< project-download missing kind=full text="Текст" >}}';
  await Deno.mkdir(join(root, "_extensions/echo"));
  await Deno.writeTextFile(
    join(root, "_extensions/echo/_extension.yml"),
    "title: Носитель\ncontributes: {shortcodes: [echo.lua]}\n",
  );
  await Deno.writeTextFile(
    join(root, "_extensions/echo/echo.lua"),
    "return {echo=function(args)return pandoc.Str(pandoc.utils.stringify(args[1])) end}",
  );
  await run("Code missing resource/no config", "`" + call + "`");
  await run(
    "Raw HTML missing resource/no config",
    '<span title="' + call + '">Текст</span>',
  );
  await run(
    "attribute missing resource/no config",
    '[Текст]{title="' + call + '"}',
  );
  for (
    const [name, call] of [
      ["bad-id", '{{< project-download Bad text="Текст" >}}'],
      ["bad-kind", '{{< project-download missing kind=other text="Текст" >}}'],
      ["bad-key", '{{< project-download missing unknown=1 text="Текст" >}}'],
    ]
  ) await run(name, "`" + call + "`", "DOWNLOAD.REQUEST_INVALID");
  await run("inline missing resource", call, "DOWNLOAD.CONFIG_INVALID");
  await run(
    "metadata native syntax refusal",
    call,
    "DOWNLOAD.REQUEST_INVALID",
    false,
    true,
  );
  await Deno.writeTextFile(
    join(root, "_quarto.yml"),
    "project: {type: website}\nformat: {html: {theme: none}}\nfilters: [project-download]\nproject-download: {resources: {data: {path: data}}}\n",
  );
  await run(
    "metadata live request",
    "{{< project-download data >}}",
    undefined,
    false,
    true,
    "data",
  );
  await Deno.writeTextFile(
    join(root, "_quarto.yml"),
    "project: {type: website}\nformat: {html: {theme: none}}\nfilters: [project-download]\nshortcodes: [_extensions/echo/echo.lua]\n",
  );
  await run("nested opaque baseline", "{{< echo " + call + " >}}");
  await run(
    "nested parsed but not invoked baseline",
    "{{< echo {{< project-download missing kind=bad >}} >}}",
  );

  await run("Math opaque baseline", "$" + call + "$");
  await run(
    "escaped literal",
    '{{{< project-download missing text="Текст" >}}}',
    undefined,
    true,
  );
  await run(
    "shortcodes off",
    "```{.text shortcodes=false}\n" + call + "\n```",
    undefined,
    true,
  );
  await Deno.writeTextFile(
    join(root, "erase.lua"),
    "return {{Span=function(s)if s.classes:includes('project-download-raw-request') or s.classes:includes('project-download-request') then return {} end end}}",
  );
  await Deno.writeTextFile(
    join(root, "_quarto.yml"),
    "project: {type: website}\nformat: {html: {theme: none}}\nfilters: [{at: post-quarto, path: erase.lua}, project-download]\n",
  );
  await run("consumed actual callback", "Текст " + call);
  await run(
    "consumed invalid actual callback",
    "Текст {{< project-download missing kind=bad >}}",
    "DOWNLOAD.REQUEST_INVALID",
  );
  await run(
    "authored reserved Span",
    "[Текст]{.project-download-request resource=missing}",
    "DOWNLOAD.DELIVERY_PHASE_UNSUPPORTED",
  );
  await run(
    "authored reserved Header",
    "# Текст {.project-download-raw-request}",
    "DOWNLOAD.DELIVERY_PHASE_UNSUPPORTED",
  );
  await run(
    "restrictive callback",
    "`" + call + "`",
    "DOWNLOAD.DELIVERY_PHASE_UNSUPPORTED",
    true,
  );
  console.log(
    JSON.stringify({
      scope: "native ordinary carriers, no Core/assignment/P",
      rows,
    }),
  );
  const o = Deno.env.get("DOWNLOAD_LITERAL_EVIDENCE");
  if (o) {
    await Deno.mkdir(o, { recursive: true });
    await Deno.writeTextFile(
      join(o, "carriers.json"),
      JSON.stringify(rows, null, 2),
    );
  }
} finally {
  await Deno.remove(root, { recursive: true });
}

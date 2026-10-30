// Узкая проверка порта упаковки; native proof находится в public-runtime.ts.
import { publish } from "../_extensions/project-download/application/publish.ts";
import { zip } from "../_extensions/project-download/domain/zip.ts";
const files = [{
  name: "README.md",
  bytes: new TextEncoder().encode("Точный README Core\n"),
}];
let packages = 0, saves = 0;
await publish({ resources: {}, "course-model": true }, [], {
  requests: () =>
    Promise.resolve([{
      source: "index.qmd",
      resources: [],
      artifacts: [{ exerciseId: "exr-demo", kind: "starter" }, {
        exerciseId: "exr-demo",
        kind: "starter",
      }],
    }]),
  courseResource: () => Promise.reject(Error("Не обычный ресурс")),
  modelArtifact: (request) =>
    Promise.resolve({
      kind: request.kind,
      files,
      package: () => {
        packages++;
        return Promise.resolve(zip(files));
      },
    }),
  files: () => Promise.reject(Error("Нельзя повторно читать project tree")),
  save: (archives) => {
    if (archives.length !== 1 || archives[0].name !== "exr-demo-starter.zip") {
      throw Error("Потеряна identity ZIP");
    }
    saves++;
    return Promise.resolve();
  },
});
if (packages !== 1 || saves !== 1) {
  throw Error(
    "ZIP должен создаваться один раз на готовый artifact: " +
      JSON.stringify({ packages, saves }),
  );
}
console.log(
  "PASS один вызов упаковки для повторной ссылки без ZIP для сравнения inventory",
);

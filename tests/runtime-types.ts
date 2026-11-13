import { sibling } from "../_extensions/project-download/infrastructure/siblings.ts";
import type {
  NativePublication,
  ProjectContractContext,
  SiblingModules,
} from "../_extensions/project-download/infrastructure/siblings.ts";
import "../_extensions/project-download/infrastructure/runtime.ts";
import "../_extensions/project-download/application/package-artifact.ts";

type NotAny<T> = 0 extends 1 & T ? never : true;
type Core = SiblingModules["course-core"];
type Artifact = Awaited<ReturnType<Core["materializeProject"]>>;
type Resources = Awaited<ReturnType<NativePublication["resourceFiles"]>>;
const checked: [
  NotAny<Awaited<ReturnType<typeof sibling<"course-core">>>>,
  NotAny<Artifact>,
  NotAny<Artifact["files"][number]>,
  NotAny<Resources>,
] = [true, true, true, true];
void checked;

// Только compiler consumers: никакая операция или validator не запускается.
function dtoMisuse(
  Core: Core,
  context: ProjectContractContext,
  condition: ReturnType<NativePublication["condition"]>,
  resources: Resources,
) {
  // @ts-expect-error Обычные ресурсы не являются учебным набором ArtifactFiles.
  const artifact: Artifact = resources;
  // @ts-expect-error Context ещё не прошёл planProject и не является plan.
  Core.materializationClosure(context, condition);
  void artifact;
}
void dtoMisuse;

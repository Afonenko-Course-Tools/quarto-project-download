import { sibling } from "../_extensions/project-download/infrastructure/siblings.ts";
import type {
  NativeOperation,
  ProjectContractContext,
  SiblingModules,
} from "../_extensions/project-download/infrastructure/siblings.ts";
import "../_extensions/project-download/infrastructure/runtime.ts";
import "../_extensions/project-download/application/package-artifact.ts";

type NotAny<T> = 0 extends (1 & T) ? never : true;
type Core = SiblingModules["course-core"];
type Inventory = Awaited<ReturnType<Core["materializeProject"]>>;
type ResourceInventory = Awaited<
  ReturnType<NativeOperation["resourceInventory"]>
>;
const checked: [
  NotAny<Awaited<ReturnType<typeof sibling<"course-core">>>>,
  NotAny<Inventory>,
  NotAny<Inventory["files"][number]>,
  NotAny<ResourceInventory>,
] = [true, true, true, true];
void checked;

// Только compiler consumers: никакая операция или validator не запускается.
function dtoMisuse(
  Core: Core,
  context: ProjectContractContext,
  condition: ReturnType<NativeOperation["condition"]>,
  resources: ResourceInventory,
) {
  // @ts-expect-error Resource inventory не является учебным artifact inventory.
  const artifact: Inventory = resources;
  // @ts-expect-error Context ещё не прошёл planProject и не является plan.
  Core.materializationClosure(context, condition);
  void artifact;
}
void dtoMisuse;

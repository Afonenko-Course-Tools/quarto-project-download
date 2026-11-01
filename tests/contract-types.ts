import * as Public from "../_extensions/project-download/infrastructure/runtime.ts";
void Public;
import {
  type Configuration,
  configuration,
  type Resource,
} from "../_extensions/project-download/domain/config.ts";
type NotAny<T> = 0 extends (1 & T) ? never : true;
const config = configuration({});
const checked: NotAny<typeof config.resources[string]> = true;
const lawful: Resource = {
  path: "/data",
  include: null,
  exclude: null,
  profiles: null,
  gitignore: null,
};
const consumer = (value: Configuration) =>
  value.resources.data.path.toUpperCase();
const nullable: boolean | null | undefined = config["course-model"];
lawful.include?.map((value) => value.toUpperCase());
void checked;
void consumer;
void nullable;

const partial: Configuration = {
  resources: { data: { path: "/data" } },
  "course-model": true,
};
const listNotAny: NotAny<NonNullable<Resource["include"]>[number]> = true;
void partial;
void listNotAny;

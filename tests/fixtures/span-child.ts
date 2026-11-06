if (Deno.env.get("DOWNLOAD_SENTINEL") !== "functional") throw Error("Потерян functional env");
console.log(Deno.env.get("COURSE_PERF_PARENT_SPAN_ID") ?? "unlinked");
export {};

# Публичная упаковка файлов Core

`_extensions/project-download/public.ts` предоставляет `packageArtifact(files)`.
Операция принимает функциональный `ArtifactFiles` по `ArtifactFilesSchema` из
соседнего `course-core/public.ts`:

```ts
{
  exerciseId: string;
  audience: "student" | "full";
  files: {
    target: string;
    audience: "student" | "full";
    reason: string;
    bytes: Uint8Array;
  }[];
}
```

Пакет не содержит сертификата операции, SHA, исходного пути или заявленного
размера. Download делает собственную копию входных bytes и targets до ленивого
импорта Core, проверяет форму, аудиторию и пересечения targets, сортирует имена
и создаёт ZIP один раз. Размеры и CRC32 вычисляются по фактическим bytes.
README проходит без изменений. Чтение проекта, построение README и выбор
публичных/закрытых материалов остаются в Core.

Для обычного ArrayBuffer ранняя копия изолирует ZIP от последующих изменений
вызывающего кода. `structuredClone` сохраняет общую память SharedArrayBuffer,
поэтому после проверки схемы выполняется отдельная копия таких bytes.
До неё общая память может измениться; после неё ZIP владеет своими данными.

Обычные `project-download.resources` работают без Core. Публичный Core
загружается при вызове `packageArtifact`; import расширения сам его не запускает.

Различающие проверки `tests/package-bytes.ts` используют настоящий Core и
распаковку ZIP: точные бинарные bytes, README/src/resources, student/full,
запрещённые targets, пересечения файлов/каталогов и изменения caller memory.
`tests/public-inventory.ts` проверяет настоящую native операцию Core,
материализацию, конечные ссылки README и generated resources.
Это адресные проверки, не приёмка полного курса или опубликованного выпуска.

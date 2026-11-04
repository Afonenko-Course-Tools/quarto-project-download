# Публичная упаковка готового inventory

`_extensions/project-download/public.ts` предоставляет `packageArtifact(inventory)`.
Операция принимает готовый `ArtifactInventory` по схеме из соседнего
`course-core/public.ts`, один раз фиксирует собственный snapshot входных bytes и targets
до ленивого импорта Core, проверяет форму inventory, аудиторию и пересечения targets,
сортирует имена и создаёт ZIP один раз. SHA256 и size остаются полями схемы Core,
но упаковщик не подтверждает их соответствие переданным bytes. ZIP содержит именно
зафиксированные bytes, включая случай устаревших заявленных размера/хеша; фактические
размеры и CRC32 вычисляет прежний ZIP writer. Для обычных Uint8Array с отдельным
ArrayBuffer ранний snapshot изолирует ZIP от последующих изменений caller bytes,
targets и списка файлов. Standard structuredClone сохраняет SharedArrayBuffer как
общую память, поэтому только SAB-backed bytes получают отдельную ownership copy
после lazy import и существующего schema parse. Как и прежде, изменения общей памяти
до этой поздней копии могут попасть в ZIP; обычные bytes повторно не копируются.
Авторские каталоги и receipts не читаются; README входит в ZIP теми же байтами,
которые предоставил Core. После упаковки исправлять ссылки внутри ZIP нельзя.

Импорт Download и отдельная операция `zip(entries)` не требуют Core.
Публичный Core загружается только при вызове `packageArtifact`.

Композиция вызывает упаковку внутри callback текущей operation-owned A1 batch, держит ZIP
в памяти до успешной финальной проверки Core и только затем публикует bytes.
Проверка формы inventory не подтверждает текущесть исходников сама по себе.
`packageArtifact` упаковывает данные и не служит проверкой достоверности caller SHA256.
Выбор operation, exercise, audience и полномочий остаётся у владельца композиции;
другой operation нельзя принимать только по корректной форме UUID.

Проверка реального public producer и временной установленной namespaced раскладки:

```bash
CORE=/absolute/core-checkout QRC=/absolute/qrc-checkout \
  QUARTO_RUN_NO_NETWORK=true quarto run tests/public-inventory.ts
```

Fixture выполняет native pre/render/post, настоящий public loader Core, QRC bindings, materialization,
упаковку и распаковку. Он сравнивает имена и каждый байт с inventory, проверяет
отказ для небезопасных targets/аудиторий/collisions, snapshot при caller mutation и
сохранность README. Изменённые заявленные size/SHA256 при тех же bytes больше не
считаются ошибкой упаковки. Это проверка публичной границы, а не
квалификация всего Java/SP или штатного post-render composition entrypoint.
Production runtime теперь использует этот public loader и public ordinary resource inventory; детали и оставшиеся owner gates описаны в [native runtime](public-runtime.md). Runtime-issued condition обязателен для IO; JSON/clone finalized DTO его не заменяет.

B3 на Core998 добавляет реальный validateRelease и operation.withProjectContexts.
Actual root-generated SVG выявил owner membership blocker; этот M2 остаётся
непройденным до новой принятой Core дельты, прежний GREEN относится к B2/Core978.
Опция B3_KEEP сохраняет временный owner для диагностики следующего разрешённого
повтора, не меняя проверок или bytes.

# Публичная упаковка готового inventory

`_extensions/project-download/public.ts` предоставляет `packageArtifact(inventory)`.
Операция принимает готовый `ArtifactInventory` по схеме из соседнего
`course-core/public.ts`, фиксирует собственные байты, проверяет размер, SHA256,
аудиторию и пересечения targets, сортирует имена и создаёт ZIP один раз.
Авторские каталоги и receipts не читаются; README входит в ZIP теми же байтами,
которые предоставил Core. После упаковки исправлять ссылки внутри ZIP нельзя.

Импорт Download и отдельная операция `zip(entries)` не требуют Core.
Публичный Core загружается только при вызове `packageArtifact`.

Композиция вызывает упаковку внутри callback `readProjectContexts`, держит ZIP
в памяти до успешной финальной проверки Core и только затем публикует bytes.
Проверка формы inventory и хешей не подтверждает текущесть исходников сама по себе.
Выбор operation, exercise, audience и полномочий остаётся у владельца композиции;
другой operation нельзя принимать только по корректной форме UUID.

Проверка реального public producer и временной установленной namespaced раскладки:

```bash
CORE=/absolute/core-checkout QRC=/absolute/qrc-checkout \
  QUARTO_RUN_NO_NETWORK=true quarto run tests/public-inventory.ts
```

Fixture выполняет native render, early→late Core, QRC bindings, materialization,
упаковку и распаковку. Он сравнивает имена и каждый байт с inventory, проверяет
повреждённые DTO и сохранность README. Это проверка публичной границы, а не
квалификация всего Java/SP или штатного post-render composition entrypoint.
Перенос production runtime со старых private imports требует отдельного публичного
Core adapter для текущего native run и обычных ресурсов; эта граница здесь
не подменяется локальным receipt loader.

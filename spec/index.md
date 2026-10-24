---
type: index
component: project-download
status: current
version: 3.2.2
---

# Спецификации Download

`current` описывает контракт данного Git ref; `accepted-next` — согласованное
будущее изменение, ещё не заявленное реализованным. `historical` сохраняет
provenance и не задаёт активных требований. `type` различает contract/schema/API,
vocabulary, architecture, reference и plan; `component` указывает владельца.

| Документ | type | component | status |
| --- | --- | --- | --- |
| [Контракт Download](contract.md) | contract | project-download | current |
| [Поля конфигурации](../_extensions/project-download/domain/config.ts) | contract/API | project-download | current |
| [Ownership API](../_extensions/project-download/ownership.ts) | contract/API | project-download | current |
| [Диагностика](../docs/diagnostics.md) | reference | project-download | current |
| [Авторская модель Core](../../quarto-course/spec/index.md) | specification/index | course-core | current |
| [Результат реализации](../docs/releases/2026-10-08-implementation.md) | implementation-report | project-download | historical |
| [Карта сохранённой истории](../docs/history-index.md) | history-index | project-download | current |

Download владеет resource selection, ZIP и temporary requests/ownership. Обычные resources независимы от Core; Core владеет только явно подключённым учебным мостом и своей public resource policy.

Версия пакета определяется [descriptor](../_extensions/project-download/_extension.yml) того же Git ref.
Quarto 1.11.5 и CUE 0.17.1 заданы для текущего кандидата Download 3.2.2
с необязательным модельным мостом Core 8.2.3. Обычные resources независимы от Core;
точный files inventory и current-run guards принадлежат Core.
Изменения main после выпущенного тега — **unreleased**.
Документация установленного выпуска читается из того же immutable tag, что и код.

## Одна фаза Core на пакет ZIP из 3.2.1, сохранённая в 3.2.2

При наличии internal export `withNativeArtifactBatch` в Core 8.2.3 runtime
Download объединяет загрузку NativeRun и все модельные заявки в один callback.
ZIP bytes и receipt facts копируются в память до завершающей Core-проверки;
owned cleanup и публикация начинаются после успешного возврата batch.
На Core без этого export сохраняется прежний guarded standalone маршрут.
Обычные resources по-прежнему работают без Core.

Текущий кандидат исходников — 3.2.2; CI закрепляет Core
`dc3bd4d7d035359289fc13c44446947830defeb0`. Native/installed интеграция этой пары,
итоговый CI и публикация принимаются отдельно. Unit boundary double не является
доказательством native proof или банкового бюджета.

## Контекст наблюдения 3.2.2

Канонические фасады сохраняют ABI 1 и передают `attributes.extension_id`.
Необязательный `document_id` сохраняется только при явном контексте одного
документа; ресурсные и пакетные операции не выбирают произвольный документ.
Оба процесса Git получают полный снимок окружения через `childEnv` и
`clearEnv: true`. Новый общий runtime и полное семантическое покрытие не
вводятся. Согласуемая матрица Core 8.2.3 / Download 3.2.2 / Site 5.1.4 / QRC 3.1.1
требует собственной проверки точных refs и установленного состава.

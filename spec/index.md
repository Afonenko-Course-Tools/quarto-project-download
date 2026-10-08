---
type: index
component: project-download
status: current
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
| [План владельца](../docs/plans/2026-10-08-implementation.md) | plan | project-download | in-progress |
| [Карта сохранённой истории](../docs/history-index.md) | history-index | project-download | current |

Download владеет resource selection, ZIP и temporary requests/ownership. Обычные resources независимы от Core; Core владеет только явно подключённым учебным мостом и своей public resource policy.

Версия пакета определяется [descriptor](../_extensions/project-download/_extension.yml) того же Git ref.
Quarto 1.11.5 и CUE 0.17.1 согласованы с текущими правилами Core.
Изменения main после выпущенного тега — **unreleased**.
Документация установленного выпуска читается из того же immutable tag, что и код.

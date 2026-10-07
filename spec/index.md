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
| [Целевой authoring contract Core](../../quarto-course/spec/authoring-model-next.md) | contract | core | accepted-next |
| [План владельца](../docs/plans/2026-10-08-implementation.md) | plan | project-download | accepted-next |
| [Карта сохранённой истории](../docs/history-index.md) | history-index | project-download | current |

Download владеет resource selection, ZIP и temporary requests/ownership. Обычные resources независимы от Core; Core владеет только явно подключённым учебным мостом и своей public resource policy.

Версия пакета определяется только
[`_extension.yml`](../_extensions/project-download/_extension.yml) **того же Git ref**.
Последний проверенный опубликованный tool tag — `v1.1.1`; его descriptor
содержит `1.1.1`. `main` до нового выпуска — **unreleased**, даже если
число в descriptor пока совпадает с предыдущим выпуском. Документация выпуска
читается из того же immutable tag, рабочий план не заменяет контракт этого tag.

Новая модель банка/assignments и минимум Quarto 1.11.5 / CUE 0.17.1 принимаются
по `accepted-next` одновременно с кодом, fixtures, README и выпуском владельца.
Этот индекс сам по себе не включает новый синтаксис. Существующие машинные
дескрипторы/workflow baseline пока сохраняются до соответствующего runtime шага.

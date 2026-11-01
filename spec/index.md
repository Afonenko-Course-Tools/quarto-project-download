---
type: index
component: project-download
status: current
version: 3.3.0
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
Целевой Quarto — 1.11.5; кандидат Download 3.3.0 использует публичный
native TS-договор Core 9 без внешнего валидатора схем. Обычные resources независимы от Core;
точный files inventory и current-run guards принадлежат Core.
Изменения main после выпущенного тега — **unreleased**.
Документация установленного выпуска читается из того же immutable tag, что и код.

## Публичный native runtime B3

Текущая source партия использует [публичный runtime](../docs/public-runtime.md)
через actual `withCurrentNativeOperation`, готовый artifact inventory и публичный
resource inventory и текущий owner release proof. Private NativeRun fallback удалён.
Адресные проверки и открытые integration gates перечислены в документе;
source ref не заявляется установленным или выпущенным автоматически.

## Контекст наблюдения 3.2.2

Канонические фасады сохраняют ABI 1 и передают `attributes.extension_id`.
Необязательный `document_id` сохраняется только при явном контексте одного
документа; ресурсные и пакетные операции не выбирают произвольный документ.
Только при активном контексте агента оба процесса Git получают полный снимок
окружения через `childEnv` и `clearEnv: true`. Identity/off/недоступный режим/
отсутствующий агент сохраняют прежние разрешения и наследование env. Новый общий runtime и полное семантическое покрытие не
вводятся. Историческая ABI-матрица не задаёт текущие component pins.
Текущий CI закрепляет Core946ad61 (9.0.0) и QRCa924b153 (3.2.0);
межкомпонентный installed состав, hosted CI и новый выпуск требуют отдельных проверок.

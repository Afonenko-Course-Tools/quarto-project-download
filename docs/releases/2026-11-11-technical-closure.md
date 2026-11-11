# Техническое завершение Download

Локальная партия поверх `d03c042`, без заявления выпуска или установленного
обновления. Публичные сигнатуры, отбор student/full и одноразовый draft сохранены.

Проверка конфигурации возвращает те же исходные объекты, включая prototype,
`null` и own `undefined`; типы выводятся из фактических проверенных полей.
Проверка numeric path drift продолжает ломать реального потребителя. Отложенные
imports обращаются к тем же публичным модулям соседей и сохраняют их типы.
Разбор callback, определение model kind, защита авторских inputs и адресация
README разделены по своей ответственности; новых обходов или кешей нет.

Долгая подготовка называет документ, exercise ID и kind до обращения к Core.
После успешной подготовки выводится `artifacts=processed/total`; упаковка
называет готовый архив. Планирование, README closure и materialization имеют
отдельные фактические elapsed. Ошибка не увеличивает счётчик; quiet и исходный
объект отказа сохраняются. Heartbeat и предполагаемое время завершения не вводятся.

Некорректный JSON из Quarto inspect даёт `DOWNLOAD.CONFIG_INVALID` с source,
полем `inspect`, подсказкой и исходным `SyntaxError` в cause. Foreign tool
exit/streams/cause и неизвестные ошибки программиста сохраняют прежний договор.

Проверены 13 публичных suites: diagnostics, own-stage-progress, request-contract,
contract-consistency, archive, package-once, package-bytes, ownership,
ordinary-source-guards, public-inventory, public-runtime,
project-contract-consumer и runtime-batch в самостоятельном ordinary режиме.
Полный production quality gate проверяет все 15 собственных TS файлов, unsafe
типы, structural budgets и зависимости без baseline/suppressions.

На зафиксированных Java inputs найден отдельный расход Core README: 428
вызовов `quarto pandoc`, 70,78 с суммарного включающего времени дочерних
процессов. Это часть native render с Download, а не самостоятельная упаковка
ZIP; внутренние Pandoc и родительские Quarto интервалы нельзя суммировать как
независимые затраты. Исправление квалифицированного native Pandoc принадлежит
Core. Согласованный восьмишаговый замер завершён: Java cold/warm 442,12/441,27 с
против 376,38/375,89 с; SP 86,42/83,37 с против 81,68/79,61 с. Это по одному
одинаково инструментированному наблюдению на вариант/состояние, не статистическая
оценка для любой машины. В новом Core исчезли 428/31 startup Quarto, фактические
547/64 Pandoc и 17 inspect каждого курса сохранены. Все 141/27 ZIP совпадают
побайтно; данные и ограничения сохранены в `matched/final-summary.json`
общего evidence кампании. Whole-course профиль — student+preview;
input/profile invalidation и student/full/student проверены отдельными native
матрицами. Полная установленная доставка не выводится из этого замера.

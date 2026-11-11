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
Core. Полный сравнительный замер и эквивалентность готовых bytes оформляются
после согласованного freeze; отдельная эта партия не объявляет ускорение курса.

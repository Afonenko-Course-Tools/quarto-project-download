# Download 3.4.0 — кандидат раннего literal capture

Основа — опубликованный 3.3.1. Core9.1.1, C9.0.1 и публичный ZIP writer не
заменяются. Изменение снимает собственные literal `project-download` reader
Span до Core qualifier, сохраняя строгую границу неизвестных/dynamic shortcodes.

Подключение: `filters: [project-download, course-core]`. Native pre-ast проверяет
собственные reserved Attr до lowering; post-quarto получает actual surviving
requests и сохраняет native Theorem/Proof/ConditionalBlock. Ordinary handler
по-прежнему может работать в Code/Raw/attr и без Core. Вся syntax/default/kind/
resource policy находится в TS, Lua отвечает за native transport и применение
результата. Existing ownership sidecar и v2 receipt не меняются.

Новые shell bridge `native-ts/early-filter.sh` и `late-filter.sh` устанавливаются
с Git executable bit. Runtime profile для grading capture должен связывать
точные новые phase/filter/shortcode/runtime bytes и restrictive env. Сам env-флаг
не даёт authority. Старые source/P capsules не становятся текущими дописыванием hash.

Проверки: actual13 reader Span до Core callback; pure qualifier до/после;
обычные Code/Raw/attr и syntax negatives; настоящий Core HTML/Reveal/author,
late kinds/privacy/raw facts, ошибочный callback без usable completion, bounded
buffer и повтор после ошибки; existing public-runtime/A1/ZIP/currentness guards.
Известная Core M1 recovery после failed render остаётся внешней: только точные
пустые Quarto support dirs удаляются нерекурсивно до нового snapshot, guard не
ослаблен. Это не новая автоматическая cleanup-функция Download.

Измерение на малом matched fixture отдельно считает TS children и AST walks;
ускорение большого курса не заявляется. Hosted CI, immutable release/readback,
Root-only installed course order/profile, новый whole prior P и genuine grading
producer→consumer gate остаются обязательными отдельными этапами.

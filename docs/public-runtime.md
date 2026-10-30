# Публичный native runtime Download

Runtime использует `course-core/public.ts` и `withCurrentNativeOperation`.
Private NativeRun, resolver и filesystem fallback проекта удалены из этого пути.
Один `readProjectContexts` callback получает все затронутые проекты; планы по
project/audience переиспользуются. Native condition проходит QRC и единственный
README writer Core, затем готовый inventory упаковывается один раз.
Повторные ссылки сравнивают имена и bytes inventory, а не повторно созданные ZIP.

Нативный filter передаёт собственную эффективную конфигурацию Download в typed
request. В native режиме runtime не выполняет дополнительный root inspect для
чтения metadata. Public Core catalog задаёт допустимые sources, а operation
проверяет exact root/profiles/output, авторитет condition и текущесть ресурсов.
Выбор обычного resource directory не читает bytes: они приходят из публичного
`resourceInventory`. Самостоятельный режим без активного Core сохраняет обычный
native inspect/config/resource guards и не загружает Core.

Штатный native маршрут подключает Download pre перед Core native-pre и Download
post после Core native-post. Для него применяется
`quarto run .../project-download/entrypoints/post.ts --native`: явная runtime
expectation обязательна для активного Core, включая resource-only документы.
`--native` не нужен отдельному ordinary сценарию без Core. Final output передаёт
Quarto hook environment; конечный URL standalone model README задаётся
`project-download.base-url`. Publisher передаёт фактическое назначение.

`public.ts` предоставляет `prepareDownloads` и `finishDownloads(root, options)`.
Publisher задаёт `native`, `outputDirectory`, `baseUrl`, `referenceCatalog`,
`catalogBaseUrl` и при необходимости `destinationDirectory`. Последний параметр
отделяет проверенный native output от конечного mount, куда записывается ZIP после
успешного final Core fence. Destination проверяется на symlink/foreign collisions.
`observeOperation` передаёт Publisher immutable public catalog для проверки
current output coverage в том же callback без второго loader/source walk.
Нейтральный `submission` может предоставить владелец PL; без PL не выдумываются
имена файлов или транспорт сдачи.

ZIP bytes и receipt facts фиксируются до выхода callback; filesystem публикация
идёт после успешных Core и request-ownership fences. Manifest пишется первым,
receipt последним. Новые receipts имеют schema `project-download-artifacts-v2`,
явные `operation`/`identity` и SHA256 архивов. Они не подменяют Core source proof.
Старые v1 узнаются только как собственные объекты для cleanup/migration;
их NativeRun sourceRunHash не переиспользуется с другим смыслом.

Эта партия квалифицирована на immutable Core
`978c66b89c8e1e23c827336bab3af5828dc27ee9`, Quarto1.11.5, HTML/student.
Full artifact открытой demonstration с поздним публичным решением отличается от
actual full native projection, которая ждёт A4. `conditions`, ресурсы ссылок
Gradle/local Markdown fragments и default kind исчезнувшего native custom Div
дают адресные owner-gates до принятия A4 API. Общее условие не урезается и второй
Markdown/include resolver не создаётся. Это не полный Java/SP выпуск.

Проверки: `tests/public-runtime.ts` (actual hooks, два вида artifact, обычный
resource, конечные URL, incremental resource, source/output/permission/collision
и symlink отказы), `tests/public-inventory.ts` (официальный M2 через настоящий
loader), `tests/package-once.ts` и `tests/runtime-batch.ts no-core-ordinary`.
`CORE` указывает на immutable accepted snapshot, `QRC` — на точный consumer ref.
Старые fixtures private NativeRun/legacy Core не являются приёмкой нового пути;
общий legacy runner не объявляется прошедшим до полного owner rollout.

Native QRC references с общим `#qrc-unresolved` и разными key/style пока не
квалифицированы actual тестом. Их owner-issued уникальные tokens, imported
references и fragment origins переходят вместе с принятым A4 closure API;
B1 проверка supplied imported targets не является доказательством этого runtime.

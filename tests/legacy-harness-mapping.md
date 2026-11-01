# Перенос прежних проверок на публичный native путь

Штатный `tools/check.sh` запускает каждый актуальный suite один раз. Старые
private carrier и legacy hooks не становятся authority нового native-ts API.
Предыдущие исходники сохранены в Git и явно помечены неканоническими; это не
заявление о совместимости нового пути со старым внутренним API.

| Прежняя проверка | Действующая гарантия и контроль |
| --- | --- |
| model-receipts: injected NativeRun → full receipt | Теперь явный отказ без private resolver/ZIP/receipt в model-receipts; настоящий trusted student/full audience — public-runtime и public-inventory |
| native: fabricated resources/publicExercises/current profile | public-runtime: actual operation, profile/projection/document/output bindings, source и generation drift до публикации; public-inventory: owner target/hash/size/audience/resource guards |
| native-installed: selected current docs, privacy и private resources | public-runtime: настоящая временная namespaced установка/native hooks, starter/full/resource ZIP, текущие changed bytes; public-inventory: private/generated resources и exact inventory; ownership: выбранные source requests и empty capture |
| model-installed: metadata/common files, README, origins, deterministic ZIP | public-inventory: actual project metadata, common build files, include-local-base/README, crossdoc/public/import refs, generated resource и exact package bytes; public-runtime: final href/self ZIP, receipt identity и full reference |
| install-context: independent ordinary resources | render/ownership и runtime-batch no-core-ordinary: actual install/hooks/render, профили, resource ZIP без Core/CUE. Модельный native путь namespaced проверяет public-runtime, public-inventory вызывает public DTO consumer |
| runtime-batch default | Alias public-runtime: canonical запускает public-runtime только один раз |

Legacy native materializer Git seed/CLI и старые conditions index.html не
объявляются положительным результатом нового native A1: соответствующие
выпускные gates остаются открытыми; owner Core определяет новые inventory и
README bytes. Обычные ресурсы, public owner provenance и закрытые guards не
ослабляются ради старых fixtures. Полный курс и установленная production
композиция проверяются отдельно.

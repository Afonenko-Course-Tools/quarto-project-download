---@meta

-- Bundled API объявляет корень namespace как безымянную таблицу. Именованный
-- класс связывает её существующие library-поля, не меняя их сигнатуры.
---@class pandoc
---@field json DownloadPandocJson
pandoc = {}

-- JSON API принимает динамические значения; decode сам по себе не даёт
-- полномочий считать результат проверенным Download request.
---@class DownloadPandocJson
---@field encode fun(value: unknown): string
---@field decode fun(value: string): unknown

-- Все Inline имеют native tag t; bundled базовый класс пропускает это поле.
---@class pandoc.Inline
---@field t string

-- Только статические описания существующих native API и wire-полей.
-- run_json_filter возвращает Pandoc по публичному договору Pandoc Lua;
-- bundled utils.lua Quarto 1.11.5 описывает параметры, но пропускает @return.
---@alias DownloadJsonFilter fun(doc: pandoc.Pandoc, filter: string, args?: string[]): pandoc.Pandoc

---@class DownloadNamedArgument
---@field key string
---@field value string

---@class DownloadArgumentList: pandoc.List
---@field [integer] string

---@class DownloadNamedArgumentList: pandoc.List
---@field [integer] DownloadNamedArgument

---@class DownloadInvocationList: pandoc.List
---@field [integer] DownloadRecordedInvocation

---@class DownloadInvocation
---@field positional DownloadArgumentList
---@field named DownloadNamedArgumentList
---@field ordinal? integer
---@field inline? boolean

---@class DownloadRecordedInvocation: DownloadInvocation
---@field ordinal integer
---@field inline boolean

---@class DownloadActiveBuffer
---@field source string
---@field calls DownloadRecordedInvocation[]
---@field bytes integer

---@class DownloadSharedBuffer
---@field active? DownloadActiveBuffer

---@class DownloadTransport
---@field context fun(): {source: string, key: string}
---@field begin fun(source: string)
---@field record fun(value: DownloadInvocation): integer
---@field drain fun(source: string): DownloadRecordedInvocation[]

-- JSON-проекция сохраняет произвольные авторские metadata; их предметные
-- схемы проверяет существующий TS decoder, а не Lua-фильтр.
---@alias DownloadJson boolean|number|string|DownloadJsonTable
---@class DownloadJsonTable
---@field [string|integer] DownloadJson

-- После существующего guard уточняются те же поля того же объекта candidate.
---@class DownloadResolvedLink: DownloadLinkCandidate
---@field ordinal number
---@field href string
---@field text string

---@class DownloadResultCandidate
---@field source unknown
---@field links unknown
---@field request unknown

---@class DownloadLinkCandidate
---@field ordinal unknown
---@field href unknown
---@field text unknown

-- Lua проверяет только source request; остальные поля сохраняются в wire JSON.
---@class DownloadStoredRequest
---@field source string
---@field courseProcessed? unknown

-- Quarto extended Callout остаётся native-узлом: здесь только реально читаемые
-- поля, включая публичный Attr, отсутствующий в bundled callout.lua.
---@class DownloadCallout
---@field content pandoc.Blocks
---@field title? pandoc.Inlines
---@field type string
---@field appearance string
---@field icon? boolean

---@class DownloadCalloutOptions
---@field type 'none'
---@field appearance 'minimal'
---@field attr pandoc.Attr
---@field content pandoc.Blocks

---@alias DownloadCalloutConstructor fun(options: DownloadCalloutOptions): pandoc.RawInline

---@class DownloadAttributed
---@field classes? pandoc.List
---@field attributes? {[string]: string}

---@class DownloadFilter
---@field traverse? 'topdown'|'typewise'
---@field Div? fun(node: pandoc.Div): pandoc.Div|nil
---@field Span? fun(node: pandoc.Span): pandoc.Span|pandoc.Link|nil
---@field Para? fun(node: pandoc.Para): pandoc.RawInline|nil, boolean|nil
---@field Plain? fun(node: pandoc.Plain): pandoc.RawInline|nil, boolean|nil

---@alias DownloadAttributeFilter {[string]: fun(node: DownloadAttributed)}
-- Native Pandoc walk поддерживает traverse, не описанный в bundled map.
---@alias DownloadDocumentWalk fun(self: pandoc.Pandoc, filter: DownloadFilter|DownloadAttributeFilter): pandoc.Pandoc

-- Dynamic dofile загружает тот же закреплённый модуль Performance.
---@class DownloadMetricsBridge
---@field create_metrics fun(extension_id: string, abi_version?: integer): CoursePerfMetrics

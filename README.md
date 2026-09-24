# RGG Inventory (rgg-inv)

Оверлей для [rgg.land](https://rgg.land) — хотбар с игровыми платформами и таймером для стримов/OBS. Позволяет выбирать платформы (по производителям), показывать их в хотбаре и вести отсчёт времени, синхронизируя состояние через локальный Express-сервер.

> English version: [README.en.md](README.en.md) · Участие в проекте: [CONTRIBUTING.md](CONTRIBUTING.md) · стиль кода: [CODESTYLE.md](CODESTYLE.md) · [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## Стек

- **Angular 22** — standalone-компоненты, сигналы (`signal`, `computed`, `input`)
- **@ngrx/signals** — сторы (`signalStore`) для состояния хотбара и настроек
- **Taiga UI 5.x** — UI-кит (кнопки, дропдауны, иконки)
- **Express 5 + cors + express-rate-limit** — локальный бэкенд синхронизации (`backend/server.ts`)
- **Luxon** — работа со временем таймера
- **YAML** — парсинг `public/platforms.yaml` (список платформ и производителей)
- **SCSS** — стили, кастомная тёмная тема Taiga UI в `@app/styles/taiga.scss`
- **Vitest** — юнит-тесты, **ESLint** (@antfu/eslint-config), **Prettier**, **Stylelint**
- Пакетный менеджер: **pnpm** (см. `pnpm-workspace.yaml`, `packageManager` в `package.json`)

## Структура проекта

```
src/
  main.ts                         # точка входа (bootstrapApplication)
  index.html
  styles.scss                     # глобальные стили
  app/
    app.ts / app.html             # корневой компонент
    app.config.ts                 # провайдеры (Taiga UI, HTTP, роутер)
    app.routes.ts
    components/                   # компоненты интерфейса
      hotbar/                     # хотбар: платформы + таймер + настройки
        platform-bar/             # ряд выбранных платформ (слоты)
        timer/                    # таймер (часы/минуты/секунды, старт/пауза/сброс)
      settings/                   # дропдаун настроек
        settings-dropdown/        # список производителей
        platform-maintainer/      # выбор платформ конкретного производителя
    shared/
      components/slot/            # слот платформы + директивы (appPlatformGuard, appSlotIcon)
      helpers/is-overlay.ts       # «прозрачный» режим для оверлея
      services/
        hotbar.service.ts         # HTTP-обёртка над /rgg-sync
        yaml-parser.ts            # парсинг public/platforms.yaml
        platform-bar.ts           # выбор/снятие платформ (через SettingsStore)
    store/
      hotbar.store.ts             # состояние таймера и хотбара, sync с бэкендом
      settings.store.ts           # загруженные платформы из YAML
shared/
  types/                          # общие типы (AppState, TimerState, HotbarState)
@app/styles/                      # кастомная тема Taiga UI + SCSS-миксины
server.ts                         # локальный Express-сервер /rgg-sync
public/
  platforms.yaml                  # справочник платформ и производителей
  icons/platforms/                # SVG-иконки платформ
proxy.conf.json                   # dev-прокси (rgg.land, bot.rgg.land, rgg-sync)
```

## Установка

Требуется Node.js и [pnpm](https://pnpm.io/):

```bash
pnpm install
```

## Запуск

### Dev-сервер Angular

```bash
pnpm start        # или pnpm ng serve
```

Приложение доступно на `http://localhost:4200/` с горячей перезагрузкой. Проксирование внешних хостов настроено в `proxy.conf.json`:

- `/rgg-api` → `https://rgg.land`
- `/rgg-bot` → `https://bot.rgg.land` (включая WebSocket)
- `/rgg-sync` → `http://127.0.0.1:3000` (локальный сервер синхронизации)

### Локальный сервер синхронизации

Хранение состояния (таймер, выбранные платформы) — на локальном Express-сервере:

```bash
node --experimental-strip-types server.ts
```

- `GET /rgg-sync` — получить текущее состояние (`AppState`)
- `POST /rgg-sync` — обновить состояние (частичный merge)
- Сервер слушает `127.0.0.1:3000`, rate-limit 100 запросов/сек

> Запуск сервера обязателен для работы хотбара: `HotbarService` грузит состояние при старте.

## Сборка

```bash
pnpm build                       # production-сборка в dist/
pnpm watch                       # dev-сборка с watch
```

## Тесты

```bash
pnpm test                        # юнит-тесты (Vitest)
```

## Линтеры и форматтеры

```bash
npx eslint .                     # ESLint (@antfu/eslint-config, tabs, single quotes, semicolons)
npx prettier --check .           # Prettier (printWidth: 100)
npx stylelint "**/*.scss"        # Stylelint (.stylelintrc.json)
```

## Как это работает

1. При старте `HotbarStore` загружает состояние через `GET /rgg-sync`.
2. `SettingsStore` парсит `public/platforms.yaml` и группирует платформы по производителям.
3. В настройках выбираются платформы — `PlatformBar.toggleSelected()` обновляет хотбар через `POST /rgg-sync`.
4. Таймер (`Timer`) каждую секунду отправляет текущее время на сервер в режиме `play`/`pause`, поэтому состояние переживает перезагрузку страницы.

## Добавление платформы

1. Добавить SVG-иконку в `public/icons/platforms/`.
2. Добавить запись в `public/platforms.yaml` (имя, код, иконка) внутри нужного производителя.
3. Иконка резолвится из `icons/platforms/<имя-иконки>` (см. `SlotIconDirective` / `TUI_ICON_RESOLVER` в `slot.ts`).

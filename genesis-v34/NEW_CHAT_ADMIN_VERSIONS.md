# SETKA Admin Новый чат

## v1.0 — старт линии

- Base: SETKA Admin Evolution v35.2 (`7e71b6c33baaf6f0fb8bd69b8ef68fbd4007021b`).
- Goal: отдельная экспериментальная линия для социальных механик и Cruise, без изменения Standard v34.10 и основной Evolution v35.x.
- Planned public page: `standalone-admin-new-chat-v1.html`.
- Prototype companion page: `standalone-new-chat-v1.html`.
- Social principle: нет отдельного дешёвого лайка; публичный счётчик ♥ = число уникальных сохранений.
- Public identity: внутренний participant id никогда не показывается; используется отдельный изменяемый nickname/public alias.

### v1.0 scope

1. Public Notes
   - ручная публикация заметки;
   - confirm yes/no before publish;
   - публичный nickname;
   - comments;
   - save = heart = rating;
   - public note can be saved into personal Saved area.

2. Cruise
   - record a visual session as a timeline of pattern/config/action events;
   - replay without manual control;
   - private by default;
   - optional public publishing;
   - save = heart = rating;
   - view/play time, repeats and unique viewers.

3. Behavioral ranking signals
   - unique saves;
   - total watch/use time;
   - average session duration;
   - median session duration;
   - repeat rate;
   - unique users/viewers;
   - save rate;
   - time per user.

4. Automatic semantic comments
   - deterministic rule engine, not free-form AI;
   - compare metrics to library distribution / percentiles;
   - emit one primary human-readable comment and optional secondary signal;
   - admin must show both raw signal codes and the generated public interpretation.

5. Recommended canonical event names
   - `save_pattern_config`
   - `save_note`
   - `save_cruise`
   - `comment_note`
   - `comment_cruise`
   - `play_cruise`
   - `replay_cruise`
   - `publish_note`
   - `publish_cruise`


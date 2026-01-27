# AI Task Manager (MVP) — PostgreSQL (Supabase) DB Plan

> Założenia: Supabase Auth jako źródło tożsamości + rozszerzenie profilu w `public.profiles`, model danych „owner-only”, hard delete z kaskadami.

## 1. Lista tabel z ich kolumnami, typami danych i ograniczeniami

### 1.1 `public.profiles`
Rozszerzenie danych użytkownika ponad `auth.users`.

- `id uuid` **PK**, **FK** → `auth.users(id)` **ON DELETE CASCADE**
- `active_list_id uuid` NULL
- `onboarding_completed_at timestamptz` NULL
- `onboarding_version smallint` NOT NULL DEFAULT 1 CHECK (`onboarding_version` > 0)
- `created_at timestamptz` NOT NULL DEFAULT now()
- `updated_at timestamptz` NOT NULL DEFAULT now()

Ograniczenia:
- **FK właścicielstwa aktywnej listy**: (`active_list_id`, `id`) → `public.lists(id, user_id)` **ON DELETE SET NULL**  
  (wymaga `UNIQUE (id, user_id)` w `public.lists`)

### 1.2 `public.lists`
Lista zadań (wielolistowość).

- `id uuid` **PK** DEFAULT `gen_random_uuid()`
- `user_id uuid` NOT NULL **FK** → `auth.users(id)` **ON DELETE CASCADE**
- `name varchar(100)` NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100)
- `created_at timestamptz` NOT NULL DEFAULT now()
- `updated_at timestamptz` NOT NULL DEFAULT now()

Ograniczenia:
- `UNIQUE (user_id, lower(name))` (zalecane — unika duplikatów nazw list per użytkownik)
- `UNIQUE (id, user_id)` (dla FK z `profiles.active_list_id`)

### 1.3 `public.tasks`
Zadania przypisane do list; status TODO/DONE; priorytet 1–3; kolejność ręczna.

- `id uuid` **PK** DEFAULT `gen_random_uuid()`
- `user_id uuid` NOT NULL
- `list_id uuid` NOT NULL
- `title varchar(200)` NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200)
- `description text` NULL
- `priority smallint` NOT NULL CHECK (priority BETWEEN 1 AND 3)
    - 1 = low, 2 = medium, 3 = high
- `status smallint` NOT NULL DEFAULT 1 CHECK (status IN (1,2))
    - 1 = todo, 2 = done
- `sort_order integer` NOT NULL CHECK (sort_order > 0)
    - UI drag&drop zapisuje kolejność jako 1..N (w MVP dopuszczalny bulk update całej listy).
- `done_at timestamptz` NULL
- `created_at timestamptz` NOT NULL DEFAULT now()
- `updated_at timestamptz` NOT NULL DEFAULT now()
- `search_text text` GENERATED ALWAYS AS (
  trim(both ' ' from (coalesce(title,'') || ' ' || coalesce(description,'')))
  ) STORED

Ograniczenia:
- **Spójność owner-only bez joinów w RLS**:
    - `FOREIGN KEY (list_id, user_id) REFERENCES public.lists(id, user_id) ON DELETE CASCADE`
- Unikalność kolejności w obrębie listy:
    - `UNIQUE (list_id, sort_order)`
- Spójność `done_at`:
    - zalecany trigger: ustaw `done_at = now()` przy przejściu `status` na DONE; wyczyść `done_at` przy powrocie na TODO (patrz „Dodatkowe uwagi”).

### 1.4 `public.ai_interactions`
Historia sugestii AI dla zadania (wiele rekordów na jedno `task_id`), minimalizacja danych (bez pełnych promptów).

- `id uuid` **PK** DEFAULT `gen_random_uuid()`
- `user_id uuid` NOT NULL
- `task_id uuid` NOT NULL
- `model varchar(100)` NOT NULL CHECK (char_length(model) BETWEEN 1 AND 100)
- `suggested_priority smallint` NOT NULL CHECK (suggested_priority BETWEEN 1 AND 3)
- `justification varchar(300)` NULL CHECK (justification IS NULL OR char_length(justification) <= 300)
- `justification_tags jsonb` NULL
- `prompt_hash char(64)` NULL CHECK (prompt_hash ~ '^[0-9a-f]{64}$')  -- sha256 (hex)
- `created_at timestamptz` NOT NULL DEFAULT now()

Decyzja użytkownika (opcjonalna — jeśli user jeszcze nie podjął akcji):
- `decision smallint` NULL CHECK (decision IN (1,2,3))
    - 1 = accepted, 2 = modified, 3 = rejected
- `decided_at timestamptz` NULL
- `final_priority smallint` NULL CHECK (final_priority BETWEEN 1 AND 3)
- `rejected_reason varchar(300)` NULL CHECK (rejected_reason IS NULL OR char_length(rejected_reason) <= 300)

Ograniczenia:
- **Spójność owner-only bez joinów w RLS**:
    - `FOREIGN KEY (task_id, user_id) REFERENCES public.tasks(id, user_id) ON DELETE CASCADE`
- Spójność pól decyzji (zalecane jako constraint + walidacja w aplikacji):
    - jeśli `decision = 2 (modified)` → `final_priority` NOT NULL
    - jeśli `decision = 3 (rejected)` → `rejected_reason` NOT NULL
    - jeśli `decision IS NOT NULL` → `decided_at` NOT NULL

---

## 2. Relacje między tabelami

- `auth.users (1) ── (1) public.profiles`
    - `profiles.id` = `auth.users.id`
- `auth.users (1) ── (N) public.lists`
    - `lists.user_id` → `auth.users.id`
- `public.profiles (1) ── (0..1) public.lists` (aktywna lista)
    - `profiles(active_list_id, id)` → `lists(id, user_id)`
- `public.lists (1) ── (N) public.tasks`
    - `tasks(list_id, user_id)` → `lists(id, user_id)`
- `public.tasks (1) ── (N) public.ai_interactions`
    - `ai_interactions(task_id, user_id)` → `tasks(id, user_id)`

Kardynalności są zgodne z MVP „single-owner” (brak współdzielenia).

---

## 3. Indeksy

### 3.1 Indeksy wspierające listowanie / filtrowanie
- `lists_user_id_idx` on `public.lists(user_id)`
- `tasks_list_id_idx` on `public.tasks(list_id)`
- `tasks_user_id_idx` on `public.tasks(user_id)`
- `ai_interactions_task_id_idx` on `public.ai_interactions(task_id)`
- `ai_interactions_user_id_idx` on `public.ai_interactions(user_id)`

### 3.2 Indeks pod domyślny widok „aktywna lista + TODO” i sortowanie
- `tasks_list_status_priority_sort_idx` on `public.tasks(list_id, status, priority, sort_order)`
    - pokrywa: `WHERE list_id = ? AND status = 1 ORDER BY priority DESC, sort_order ASC`

### 3.3 Indeks pod reordering
- unikalny constraint `UNIQUE(list_id, sort_order)` tworzy indeks unikalny wspierający wykrywanie kolizji kolejności.

### 3.4 Search (ILIKE + pg_trgm)
Wymagane wyszukiwanie „zawiera frazę” z `ILIKE` i filtrem po liście/statusie.

- Extension: `pg_trgm`
- GIN trigram index:
    - `tasks_search_text_trgm_gin` on `public.tasks` using GIN (`search_text` gin_trgm_ops)

> Zapytanie typowe:  
> `... WHERE list_id = :active_list AND status = 1 AND search_text ILIKE '%' || :q || '%'`

---

## 4. Zasady PostgreSQL (RLS)

> Założenie: wszystkie dane w `public.*` są dostępne wyłącznie właścicielowi (`auth.uid()`); AI zapis może iść z frontu (RLS) lub z backendu przez service role / RPC / SECURITY DEFINER (bez zmian schematu). 

### 4.1 RLS – `public.profiles`
- `ENABLE ROW LEVEL SECURITY`
- Policy (SELECT/UPDATE): tylko własny profil
    - `using (id = auth.uid())`
- Policy (INSERT): opcjonalnie blokowane (preferowany trigger/func on signup) albo:
    - `with check (id = auth.uid())`

### 4.2 RLS – `public.lists`
- `ENABLE ROW LEVEL SECURITY`
- Policy for SELECT/INSERT/UPDATE/DELETE:
    - `using (user_id = auth.uid())`
    - `with check (user_id = auth.uid())`

### 4.3 RLS – `public.tasks`
- `ENABLE ROW LEVEL SECURITY`
- Policy for SELECT/INSERT/UPDATE/DELETE:
    - `using (user_id = auth.uid())`
    - `with check (user_id = auth.uid())`
- Ponieważ `tasks` ma FK `(list_id, user_id)` → `lists(id, user_id)`, nie da się przypisać taska do listy innego użytkownika.

### 4.4 RLS – `public.ai_interactions`
- `ENABLE ROW LEVEL SECURITY`
- Policy for SELECT/INSERT/UPDATE/DELETE:
    - `using (user_id = auth.uid())`
    - `with check (user_id = auth.uid())`
- Ponieważ `ai_interactions` ma FK `(task_id, user_id)` → `tasks(id, user_id)`, nie da się dopiąć interakcji do zadania innego użytkownika.

---

## 5. Dodatkowe uwagi i gotowe fragmenty do migracji

### 5.1 Zalecane rozszerzenia (Supabase)
```sql
create extension if not exists pg_trgm;
create extension if not exists pgcrypto; -- gen_random_uuid()
```

### 5.2 CHECK dla spójności decyzji AI (zalecane)
```sql
alter table public.ai_interactions
  add constraint ai_interactions_decision_consistency_chk
  check (
    decision is null
    or (
      decided_at is not null
      and (
        (decision = 1 and final_priority is null and rejected_reason is null) -- accepted
        or (decision = 2 and final_priority is not null and rejected_reason is null) -- modified
        or (decision = 3 and final_priority is null and rejected_reason is not null) -- rejected
      )
    )
  );
```

### 5.3 Trigger na `updated_at` (profiles/lists/tasks)
```sql
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger trg_lists_updated_at
before update on public.lists
for each row execute function public.set_updated_at();

create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();
```

### 5.4 Trigger na `done_at` (status TODO/DONE)
```sql
create or replace function public.tasks_set_done_at()
returns trigger language plpgsql as $$
begin
  if new.status = 2 and (old.status is distinct from new.status) then
    new.done_at = coalesce(new.done_at, now());
  elsif new.status = 1 and (old.status is distinct from new.status) then
    new.done_at = null;
  end if;
  return new;
end; $$;

create trigger trg_tasks_done_at
before update of status on public.tasks
for each row execute function public.tasks_set_done_at();
```

### 5.5 Domyślne sortowanie
W UI rekomendowane sortowanie:
- priorytet malejąco (3 → 2 → 1),
- `sort_order` rosnąco w obrębie listy.

### 5.6 Uwagi o skalowalności (MVP)
- Schemat i indeksy zakładają typowe obciążenie ~1000 użytkowników i listowanie „aktywna lista + TODO” jako hot-path.
- Jeśli w przyszłości pojawią się bardzo duże listy, można rozważyć zmianę strategii reordering (np. „fractional indexing”) bez zmiany relacji tabel.

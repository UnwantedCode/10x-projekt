-- ============================================================================
-- Migration: Initial Schema for AI Task Manager (MVP)
-- ============================================================================
-- Purpose: Create the foundational database schema for the AI Task Manager
--
-- Tables created:
--   - public.profiles     : User profile extension (linked to auth.users)
--   - public.lists        : Task lists (multi-list support per user)
--   - public.tasks        : Tasks with priority, status, and manual ordering
--   - public.ai_interactions : AI suggestion history for tasks
--
-- Features:
--   - Row Level Security (RLS) enabled on all tables
--   - Owner-only access model (no sharing between users)
--   - Hard delete with cascading foreign keys
--   - Automatic updated_at timestamps via triggers
--   - Full-text search support via pg_trgm extension
--
-- Notes:
--   - All tables use uuid primary keys with gen_random_uuid()
--   - Foreign keys include user_id to enable RLS without joins
--   - Status and priority use smallint codes for performance
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
-- pg_trgm: Required for trigram-based full-text search (ILIKE optimization)
create extension if not exists pg_trgm;

-- pgcrypto: Required for gen_random_uuid() function
create extension if not exists pgcrypto;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: set_updated_at
-- Purpose: Automatically updates the updated_at column on row modification
-- Used by: profiles, lists, tasks tables
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Function: tasks_set_done_at
-- Purpose: Manages done_at timestamp based on status transitions
-- Behavior:
--   - Sets done_at to now() when status changes to DONE (2)
--   - Clears done_at when status returns to TODO (1)
create or replace function public.tasks_set_done_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 2 and (old.status is distinct from new.status) then
    -- Task marked as done: set completion timestamp
    new.done_at = coalesce(new.done_at, now());
  elsif new.status = 1 and (old.status is distinct from new.status) then
    -- Task returned to todo: clear completion timestamp
    new.done_at = null;
  end if;
  return new;
end;
$$;

-- ============================================================================
-- TABLE: public.lists
-- ============================================================================
-- Purpose: Stores user task lists (supports multiple lists per user)
-- Note: Created before profiles to satisfy foreign key dependency

create table public.lists (
  -- Primary key: auto-generated UUID
  id uuid primary key default gen_random_uuid(),

  -- Owner reference: links to Supabase Auth user
  -- ON DELETE CASCADE: User deletion removes all their lists
  user_id uuid not null references auth.users(id) on delete cascade,

  -- List name with length validation (1-100 characters)
  name varchar(100) not null
    constraint lists_name_length_chk check (char_length(name) between 1 and 100),

  -- Timestamps for auditing
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Composite unique constraint: prevents duplicate list names per user (case-insensitive)
  constraint lists_user_name_unique unique (user_id, name),

  -- Composite unique constraint: required for foreign key from profiles.active_list_id
  constraint lists_id_user_id_unique unique (id, user_id)
);

-- Index: Optimizes queries filtering by user_id (common in RLS policies)
create index lists_user_id_idx on public.lists(user_id);

-- Trigger: Automatically update updated_at on row modification
create trigger trg_lists_updated_at
  before update on public.lists
  for each row execute function public.set_updated_at();

-- Enable Row Level Security
alter table public.lists enable row level security;

-- ============================================================================
-- RLS POLICIES: public.lists
-- ============================================================================
-- Access model: Owner-only (user can only access their own lists)

-- SELECT policy for authenticated users
-- Purpose: Users can only view their own lists
create policy "lists_select_authenticated"
  on public.lists
  for select
  to authenticated
  using (user_id = auth.uid());

-- INSERT policy for authenticated users
-- Purpose: Users can only create lists owned by themselves
create policy "lists_insert_authenticated"
  on public.lists
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- UPDATE policy for authenticated users
-- Purpose: Users can only modify their own lists
create policy "lists_update_authenticated"
  on public.lists
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- DELETE policy for authenticated users
-- Purpose: Users can only delete their own lists
create policy "lists_delete_authenticated"
  on public.lists
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Anonymous users: No access to lists
-- Note: Explicit deny by not creating any policies for 'anon' role

-- ============================================================================
-- TABLE: public.profiles
-- ============================================================================
-- Purpose: Extends auth.users with application-specific user data
-- Note: Created after lists to reference lists table

create table public.profiles (
  -- Primary key: Must match auth.users.id (1:1 relationship)
  -- ON DELETE CASCADE: Auth user deletion removes profile
  id uuid primary key references auth.users(id) on delete cascade,

  -- Reference to user's currently active list (nullable)
  active_list_id uuid null,

  -- Onboarding tracking
  onboarding_completed_at timestamptz null,
  onboarding_version smallint not null default 1
    constraint profiles_onboarding_version_chk check (onboarding_version > 0),

  -- Timestamps for auditing
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Foreign key: Ensures active_list_id belongs to this user
  -- Uses composite key (active_list_id, id) -> (id, user_id) to verify ownership
  -- ON DELETE SET NULL: List deletion clears the active_list_id reference
  constraint profiles_active_list_fk
    foreign key (active_list_id, id)
    references public.lists(id, user_id)
    on delete set null
);

-- Trigger: Automatically update updated_at on row modification
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- ============================================================================
-- RLS POLICIES: public.profiles
-- ============================================================================
-- Access model: Owner-only (user can only access their own profile)

-- SELECT policy for authenticated users
-- Purpose: Users can only view their own profile
create policy "profiles_select_authenticated"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

-- INSERT policy for authenticated users
-- Purpose: Users can only create their own profile (id must match auth.uid())
-- Note: Profile creation typically happens via trigger on auth.users insert
create policy "profiles_insert_authenticated"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

-- UPDATE policy for authenticated users
-- Purpose: Users can only modify their own profile
create policy "profiles_update_authenticated"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- DELETE policy for authenticated users
-- Purpose: Users can only delete their own profile
-- Note: Typically not used as profile deletion cascades from auth.users
create policy "profiles_delete_authenticated"
  on public.profiles
  for delete
  to authenticated
  using (id = auth.uid());

-- Anonymous users: No access to profiles
-- Note: Explicit deny by not creating any policies for 'anon' role

-- ============================================================================
-- TABLE: public.tasks
-- ============================================================================
-- Purpose: Stores individual tasks with priority, status, and ordering

create table public.tasks (
  -- Primary key: auto-generated UUID
  id uuid primary key default gen_random_uuid(),

  -- Owner reference (denormalized for RLS efficiency)
  user_id uuid not null,

  -- Parent list reference
  list_id uuid not null,

  -- Task title with length validation (1-200 characters)
  title varchar(200) not null
    constraint tasks_title_length_chk check (char_length(title) between 1 and 200),

  -- Optional detailed description (no length limit)
  description text null,

  -- Priority level: 1=low, 2=medium, 3=high
  priority smallint not null
    constraint tasks_priority_chk check (priority between 1 and 3),

  -- Status: 1=todo, 2=done
  status smallint not null default 1
    constraint tasks_status_chk check (status in (1, 2)),

  -- Manual sort order within a list (positive integers, 1-based)
  sort_order integer not null
    constraint tasks_sort_order_chk check (sort_order > 0),

  -- Completion timestamp (managed by trigger)
  done_at timestamptz null,

  -- Timestamps for auditing
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Generated column for full-text search (combines title and description)
  search_text text generated always as (
    trim(both ' ' from (coalesce(title, '') || ' ' || coalesce(description, '')))
  ) stored,

  -- Foreign key: Composite key ensures list belongs to same user (owner-only model)
  -- This prevents assigning tasks to another user's list
  -- ON DELETE CASCADE: List deletion removes all its tasks
  constraint tasks_list_fk
    foreign key (list_id, user_id)
    references public.lists(id, user_id)
    on delete cascade,

  -- Unique constraint: Ensures unique sort_order per list (prevents ordering conflicts)
  constraint tasks_list_sort_order_unique unique (list_id, sort_order),

  -- Composite unique constraint: Required for foreign key from ai_interactions
  constraint tasks_id_user_id_unique unique (id, user_id)
);

-- Index: Optimizes queries filtering by list_id
create index tasks_list_id_idx on public.tasks(list_id);

-- Index: Optimizes RLS policy checks filtering by user_id
create index tasks_user_id_idx on public.tasks(user_id);

-- Index: Optimizes the default view (active list + TODO tasks) with priority sorting
-- Covers query pattern: WHERE list_id = ? AND status = 1 ORDER BY priority DESC, sort_order ASC
create index tasks_list_status_priority_sort_idx
  on public.tasks(list_id, status, priority, sort_order);

-- Index: Trigram GIN index for fast ILIKE searches on search_text
-- Enables efficient substring matching for task search functionality
create index tasks_search_text_trgm_gin
  on public.tasks
  using gin (search_text gin_trgm_ops);

-- Trigger: Automatically update updated_at on row modification
create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- Trigger: Automatically manage done_at based on status changes
create trigger trg_tasks_done_at
  before update of status on public.tasks
  for each row execute function public.tasks_set_done_at();

-- Enable Row Level Security
alter table public.tasks enable row level security;

-- ============================================================================
-- RLS POLICIES: public.tasks
-- ============================================================================
-- Access model: Owner-only (user can only access tasks in their own lists)
-- Note: Foreign key (list_id, user_id) -> lists(id, user_id) provides additional
--       integrity guarantee that tasks can only belong to user's own lists

-- SELECT policy for authenticated users
-- Purpose: Users can only view their own tasks
create policy "tasks_select_authenticated"
  on public.tasks
  for select
  to authenticated
  using (user_id = auth.uid());

-- INSERT policy for authenticated users
-- Purpose: Users can only create tasks owned by themselves
-- Note: FK constraint additionally ensures list ownership
create policy "tasks_insert_authenticated"
  on public.tasks
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- UPDATE policy for authenticated users
-- Purpose: Users can only modify their own tasks
create policy "tasks_update_authenticated"
  on public.tasks
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- DELETE policy for authenticated users
-- Purpose: Users can only delete their own tasks
create policy "tasks_delete_authenticated"
  on public.tasks
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Anonymous users: No access to tasks
-- Note: Explicit deny by not creating any policies for 'anon' role

-- ============================================================================
-- TABLE: public.ai_interactions
-- ============================================================================
-- Purpose: Records AI priority suggestions and user decisions
-- Design: Minimizes stored data (no full prompts, only hash for deduplication)

create table public.ai_interactions (
  -- Primary key: auto-generated UUID
  id uuid primary key default gen_random_uuid(),

  -- Owner reference (denormalized for RLS efficiency)
  user_id uuid not null,

  -- Parent task reference
  task_id uuid not null,

  -- AI model identifier (e.g., "gpt-4", "claude-3-opus")
  model varchar(100) not null
    constraint ai_interactions_model_length_chk check (char_length(model) between 1 and 100),

  -- AI suggested priority: 1=low, 2=medium, 3=high
  suggested_priority smallint not null
    constraint ai_interactions_suggested_priority_chk check (suggested_priority between 1 and 3),

  -- Optional brief justification for the suggestion (max 300 chars)
  justification varchar(300) null
    constraint ai_interactions_justification_length_chk
    check (justification is null or char_length(justification) <= 300),

  -- Optional structured tags for categorization (JSONB for flexibility)
  justification_tags jsonb null,

  -- SHA-256 hash of the prompt (for deduplication without storing full prompts)
  prompt_hash char(64) null
    constraint ai_interactions_prompt_hash_format_chk
    check (prompt_hash ~ '^[0-9a-f]{64}$'),

  -- Creation timestamp (no updated_at as these records are typically immutable)
  created_at timestamptz not null default now(),

  -- ============================================================================
  -- User decision fields (nullable until user takes action)
  -- ============================================================================

  -- Decision type: 1=accepted, 2=modified, 3=rejected (null if pending)
  decision smallint null
    constraint ai_interactions_decision_chk check (decision in (1, 2, 3)),

  -- Timestamp when user made the decision
  decided_at timestamptz null,

  -- Final priority if user modified the suggestion (required for decision=2)
  final_priority smallint null
    constraint ai_interactions_final_priority_chk
    check (final_priority is null or final_priority between 1 and 3),

  -- Reason for rejection (required for decision=3)
  rejected_reason varchar(300) null
    constraint ai_interactions_rejected_reason_length_chk
    check (rejected_reason is null or char_length(rejected_reason) <= 300),

  -- Foreign key: Composite key ensures task belongs to same user (owner-only model)
  -- ON DELETE CASCADE: Task deletion removes all its AI interactions
  constraint ai_interactions_task_fk
    foreign key (task_id, user_id)
    references public.tasks(id, user_id)
    on delete cascade,

  -- Consistency check for decision-related fields
  -- Ensures proper combination of decision, decided_at, final_priority, rejected_reason
  constraint ai_interactions_decision_consistency_chk check (
    decision is null
    or (
      decided_at is not null
      and (
        -- accepted: no final_priority, no rejected_reason
        (decision = 1 and final_priority is null and rejected_reason is null)
        -- modified: final_priority required, no rejected_reason
        or (decision = 2 and final_priority is not null and rejected_reason is null)
        -- rejected: no final_priority, rejected_reason required
        or (decision = 3 and final_priority is null and rejected_reason is not null)
      )
    )
  )
);

-- Index: Optimizes queries filtering by task_id (fetching interactions for a task)
create index ai_interactions_task_id_idx on public.ai_interactions(task_id);

-- Index: Optimizes RLS policy checks filtering by user_id
create index ai_interactions_user_id_idx on public.ai_interactions(user_id);

-- Enable Row Level Security
alter table public.ai_interactions enable row level security;

-- ============================================================================
-- RLS POLICIES: public.ai_interactions
-- ============================================================================
-- Access model: Owner-only (user can only access interactions for their own tasks)
-- Note: Foreign key (task_id, user_id) -> tasks(id, user_id) provides additional
--       integrity guarantee that interactions can only belong to user's own tasks

-- SELECT policy for authenticated users
-- Purpose: Users can only view AI interactions for their own tasks
create policy "ai_interactions_select_authenticated"
  on public.ai_interactions
  for select
  to authenticated
  using (user_id = auth.uid());

-- INSERT policy for authenticated users
-- Purpose: Users can only create AI interactions for their own tasks
-- Note: FK constraint additionally ensures task ownership
create policy "ai_interactions_insert_authenticated"
  on public.ai_interactions
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- UPDATE policy for authenticated users
-- Purpose: Users can only modify AI interactions for their own tasks
-- Typical use: Recording user decision (accept/modify/reject)
create policy "ai_interactions_update_authenticated"
  on public.ai_interactions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- DELETE policy for authenticated users
-- Purpose: Users can only delete AI interactions for their own tasks
create policy "ai_interactions_delete_authenticated"
  on public.ai_interactions
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Anonymous users: No access to AI interactions
-- Note: Explicit deny by not creating any policies for 'anon' role

-- ============================================================================
-- FUNCTION: Auto-create profile on user signup
-- ============================================================================
-- Purpose: Automatically creates a profile row when a new user signs up
-- This ensures every auth.users row has a corresponding profiles row

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

-- Trigger: Create profile when new user is created in auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
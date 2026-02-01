-- ============================================================================
-- Migration: Fix profiles FK so list delete only nulls active_list_id
-- ============================================================================
-- Problem: Composite FK (active_list_id, id) -> lists(id, user_id) ON DELETE SET NULL
--          sets BOTH columns to NULL, violating NOT NULL on profiles.id.
-- Solution: Split into two FKs:
--   1. active_list_id -> lists(id) ON DELETE SET NULL (only nulls active_list_id)
--   2. (active_list_id, id) -> lists(id, user_id) NO ACTION (ownership check)
-- ============================================================================

-- 1. Drop the composite FK that uses ON DELETE SET NULL
alter table public.profiles
  drop constraint if exists profiles_active_list_fk;

-- 2. Add simple FK: only active_list_id is set to null when list is deleted
alter table public.profiles
  add constraint profiles_active_list_fk
    foreign key (active_list_id)
    references public.lists(id)
    on delete set null;

-- 3. Add composite FK for ownership: (active_list_id, id) must match lists(id, user_id)
--    Rows with active_list_id IS NULL skip this check; no delete action.
alter table public.profiles
  add constraint profiles_active_list_owner_fk
    foreign key (active_list_id, id)
    references public.lists(id, user_id);

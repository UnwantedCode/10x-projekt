---
# no paths => applies globally
---

# AI Rules for AI Task Manager

## Main Problem

Users struggle to determine which tasks are most important, which leads to inefficient management of their to-do lists.

## Minimum Feature Set

- User registration and login to access personal tasks
- Adding, editing, deleting, and viewing a task list
- Assigning basic task details such as title, description, and priority
- An AI feature that analyzes a task description and suggests its priority
- Displaying tasks in a simple list with the ability to sort by priority

## Out of Scope for the MVP

- Sharing tasks with other users
- Calendar features, schedules, and time-based reminders
- Automatic priority changes by AI without user approval
- Advanced planning mechanisms such as splitting work into stages or subtasks
- A mobile app, since the project assumes a web-only version

## Success Criteria

- 80% of users consider AI suggestions helpful for organizing tasks
- 75% of users create one or more task lists per week

## Tech Stack

- Astro 5
- TypeScript 5
- React 19
- Tailwind 4
- Shadcn/ui

## Naming Conventions

- Use camelCase for variables, functions, and file names
- Write all code and comments in English
- Use English for all identifiers and documentation

## Project Structure

When introducing changes to the project, always follow the directory structure below:

- `./src` - source code
- `./src/layouts` - Astro layouts
- `./src/pages` - Astro pages
- `./src/pages/api` - API endpoints
- `./src/middleware/index.ts` - Astro middleware
- `./src/db` - Supabase clients and types
- `./src/types.ts` - Shared types for backend and frontend (Entities, DTOs)
- `./src/components` - Client-side components written in Astro (static) and React (dynamic)
- `./src/components/ui` - Client-side components from Shadcn/ui
- `./src/lib` - Services and helpers
- `./src/assets` - static internal assets
- `./public` - public assets

When modifying the directory structure, always update this section.

## Coding practices

### Guidelines for clean code

- Use feedback from linters to improve the code when making changes.
- Prioritize error handling and edge cases.
- Handle errors and edge cases at the beginning of functions.
- Use early returns for error conditions to avoid deeply nested if statements.
- Place the happy path last in the function for improved readability.
- Avoid unnecessary else statements; use if-return pattern instead.
- Use guard clauses to handle preconditions and invalid states early.
- Implement proper error logging and user-friendly error messages.
- Consider using custom error types or error factories for consistent error handling.

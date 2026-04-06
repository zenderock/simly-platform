# Bulk Requeue for Messages

## Summary
- Add a manual action on the Messages page to requeue queued messages in bulk.
- Let the user optionally scope that action by `start date`, `end date`, and `campaign`.
- Also add automatic backend recovery so stale `queued` messages are re-enqueued without manual action.

## Key Changes
- Extend `GET /api/messages` to support `campaign_id`, `start_date`, and `end_date`, using `created_at` as the date basis.
- Add `POST /api/messages/requeue` for protected dashboard users.
- Scope both endpoints to the active organization, and to the active application when `application_id` is present.
- Bulk requeue must target only messages with status `queued`; it must not touch `pending`, `scheduled`, `sent`, `delivered`, or `failed`.
- Add a shared backend service/store path to:
  - fetch queued messages by org + optional app + optional campaign + optional date range
  - enqueue each eligible message back into Asynq
  - update `updated_at` after requeue so the same message is not immediately picked up again by the watchdog
- Add an automatic watchdog task in backend startup that periodically re-enqueues stale `queued` messages older than the configured threshold, using `updated_at` for stale detection.
- Do not rely on the dormant `DispatcherService` as-is; reuse its intent, but wire the watchdog explicitly into the running server flow so the recovery actually runs.

## Frontend Changes
- Update the Messages toolbar in [messages-table.tsx](/d:/Zenderock_Devlopment/simly-platform/frontend/components/dashboard/messages-table.tsx) with:
  - a campaign dropdown populated from existing campaigns
  - a start date field
  - an end date field
  - a bulk action button such as `Retry queued messages`
- The bulk action should work even with no campaign/date filters, which means “all queued messages for the current org/app scope”.
- Show a confirmation dialog before retrying, with a clear summary of the selected scope.
- After success, invalidate/refetch messages and campaigns-related queries and show a toast with the number of messages requeued.
- Update `useMessages` so the table itself reflects the selected campaign/date range, while existing search/status/device filters can remain local display filters.
- Add `campaign_id` to the frontend `Message` type so message records can keep campaign context in the page state.

## API / Interface Changes
- `GET /api/messages?application_id=&campaign_id=&start_date=&end_date=`
- `POST /api/messages/requeue`
- Request body:
  - `campaign_id?: number`
  - `start_date?: string` (ISO date/datetime)
  - `end_date?: string` (ISO date/datetime)
- Response body:
  - `matched_count: number`
  - `requeued_count: number`

## Test Plan
- Listing messages with date-only filters returns only messages in the selected `created_at` range.
- Listing messages with campaign-only filters returns only that campaign’s messages.
- Combining campaign + period returns the expected subset.
- Bulk requeue with no filters requeues all eligible `queued` messages in the current org/app scope.
- Bulk requeue with campaign/date filters requeues only matching `queued` messages.
- Non-queued statuses are ignored by the bulk action.
- Cross-org and cross-app messages cannot be requeued.
- Automatic watchdog re-enqueues stale `queued` messages after the threshold and does not keep reprocessing the same row every tick.
- Frontend action shows disabled/loading states correctly and refreshes the table after completion.

## Assumptions
- The retry scope is `queued` only.
- Automatic recovery is included in addition to the manual page action.
- The period filter is based on `created_at`, not `scheduled_at` or `updated_at`.
- UI copy stays in English to match the current dashboard language.

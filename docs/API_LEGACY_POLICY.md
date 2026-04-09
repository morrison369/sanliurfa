# API Legacy Policy

## Purpose
Legacy API paths are supported only as a migration bridge. They must emit deprecation metadata and route clients to successor endpoints.

## Active Legacy Endpoints
- `/api/legacy/search` -> `/api/search`
- `/api/legacy/trending` -> `/api/trending`

## Required Headers
- `Deprecation: true`
- `Sunset: <RFC-1123 date>`
- `Link: <successor>; rel="successor-version"`
- `X-Legacy-Endpoint: true`

## Runtime Behavior
- Return `301` with a JSON response body and preserved query string.
- Keep route active until sunset date.
- After sunset, move to `410 Gone` unless a formal extension is approved.

## Change Control
- Any new legacy endpoint requires:
- PR with migration reason
- successor route
- sunset date
- test coverage for headers and query passthrough

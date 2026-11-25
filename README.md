# college-support

Ticket form and live status board for college application support (DCAC/EAOP).

- `index.html`: the website. A form pops up on visit; after submitting, students see the status board (In progress on the left, Completed on the right, newest first). It refreshes every 20 seconds.
- `apps-script/Code.gs`: the backend, a Google Apps Script web app bound to the ticket spreadsheet.

## How it uses the sheet

Tickets start on row 3 (rows 1-2 are headers).

| Column | Filled by | Value |
|---|---|---|
| A | website | Time created (set automatically) |
| B | website | Name |
| C | website | Support type |
| D | website | Requesting support from |
| E | website | Location |
| F | advisers | Ticket Status dropdown |
| G | advisers | Notes (never shown on the board) |

When an adviser changes the dropdown in column F, the board picks it up on its next refresh. A status containing "complete", "done", "resolved", "closed" or "finished" goes in the Completed column; anything else, including blank, shows as In progress. Edit `COMPLETED_PATTERN` in `Code.gs` to change that.

The board shows first name and last initial only.

## Setup

1. Open the spreadsheet, then **Extensions > Apps Script**.
2. Replace the contents of `Code.gs` with `apps-script/Code.gs` from this repo and save.
3. **Deploy > New deployment**, type **Web app**, Execute as **Me**, Who has access **Anyone**. Approve the permissions prompt.
4. Copy the web app URL (ends in `/exec`) into `SCRIPT_URL` near the bottom of `index.html`.
5. Host `index.html`, for example with GitHub Pages (**Settings > Pages**, deploy from the `main` branch).

After editing `Code.gs` later, use **Deploy > Manage deployments > Edit > New version** so the same URL picks up the change.

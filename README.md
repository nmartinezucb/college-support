# college-support

Ticket form and live status board for college application support (DCAC/EAOP).

- `index.html`: the website's page structure and script. A form pops up on visit; after submitting, students see the status board (In progress on the left, Completed on the right, newest first). It refreshes every 5 seconds while open (every minute when the tab is in the background).
- `styles.css`: all of the site's styling (DCAC/EAOP branding: navy header, gold accent, Inter for body text, Source Serif for headings).
- `logo/`: white DCAC and EAOP logos for the navy header.
- `type/`: the Inter and Source Serif 4 font files, which are both under the SIL Open Font License.
- `apps-script/Code.gs`: the backend, a Google Apps Script web app bound to the ticket spreadsheet.

## How it uses the sheet

Tickets start on row 3 (rows 1-2 are headers).

| Column | Filled by | Value |
|---|---|---|
| A | website | Time created (set automatically) |
| B | website | Name |
| C | website | Support type (free response) |
| D | website | Requesting support from: "Mr. Martinez", "Ms. Alanna", or "Mr. Martinez, Ms. Alanna" |
| E | website | Location |
| F | website, then advisers | Ticket Status dropdown: set to "Waiting for help" on submit; advisers change it to In-progress, Completed or Cancelled |
| G | advisers | Notes (never shown on the board) |

When an adviser changes the dropdown in column F, the board picks it up on its next refresh. Waiting for help and In-progress tickets show on the left. Completed and Cancelled tickets show on the right. A blank status shows as Waiting for help. Edit `CLOSED_STATUSES` in `Code.gs` to change that.

The board shows first name and last initial only.

## Setup

1. Open the spreadsheet, then **Extensions > Apps Script**.
2. Replace the contents of `Code.gs` with `apps-script/Code.gs` from this repo and save.
3. **Deploy > New deployment**, type **Web app**, Execute as **Me**, Who has access **Anyone**. Approve the permissions prompt.
4. Copy the web app URL (ends in `/exec`) into `SCRIPT_URL` near the bottom of `index.html`.
5. Host `index.html`, for example with GitHub Pages (**Settings > Pages**, deploy from the `main` branch).

After editing `Code.gs` later, use **Deploy > Manage deployments > Edit > New version** so the same URL picks up the change.

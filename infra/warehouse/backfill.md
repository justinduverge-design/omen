# Omen Football Warehouse Backfill Procedure

This document outlines the procedure to populate the local Omen Football Warehouse with data from `nflverse` (covering the 1999-2026 seasons).

## Important: CC BY 4.0 Attribution
The data sourced from `nflverse` is licensed under the [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/) license.

**Requirement:** The Omen application must carry clear attribution to `nflverse` wherever this data is presented or leveraged. A standard footer link or a prominent mention in the "About/Data Sources" section of the app is required.

## Procedure

The backfill is automated via the `backfill.sh` script.

### Prerequisites

- The `omen_football_warehouse` Docker container must be running.
- You must have `curl` or `wget` installed on the host executing the script to download the CSV data.
- The `psql` client (or ability to execute `psql` within the container via `docker exec`) must be available.

### Execution

1. Ensure the container is up:
   ```bash
   docker-compose up -d
   ```

2. Run the backfill script:
   ```bash
   ./backfill.sh
   ```

The script will:
- Download the raw CSV data for teams, rosters (players), games, weekly stats, and play-by-play data from the nflverse GitHub repository.
- Load the data directly into the Postgres container using the `\copy` command.
- Clean up the downloaded CSV files after a successful load.

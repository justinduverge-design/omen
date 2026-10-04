#!/usr/bin/env bash
set -euo pipefail

# Warehouse Data Backfill Script
# Loads nflverse data (1999-2026) into the local Postgres container.
# Attribution: Data provided by nflverse (CC BY 4.0).

# Use local testing mode if an argument is passed
IS_TESTING=${1:-false}
PG_USER="postgres"
CONTAINER_NAME="omen_football_warehouse"
DATA_DIR="/tmp/nflverse_backfill"

mkdir -p "$DATA_DIR"

echo "Starting nflverse data download..."

if [ "$IS_TESTING" = "true" ]; then
    echo "Running in TEST mode: Creating minimal mock data instead of downloading."

    # Mock teams
    cat <<MOCKEOF > "$DATA_DIR/teams.csv"
team_abbr,team_name,team_conf,team_division,team_color,team_color2,team_logo_url
ARI,Arizona Cardinals,NFC,West,#97233F,#000000,https://a.espncdn.com/i/teamlogos/nfl/500/ari.png
ATL,Atlanta Falcons,NFC,South,#A71930,#000000,https://a.espncdn.com/i/teamlogos/nfl/500/atl.png
MOCKEOF

    # Mock players
    cat <<MOCKEOF > "$DATA_DIR/players.csv"
gsis_id,first_name,last_name,position,team,birth_date,weight,height,college
00-0036900,Kyler,Murray,QB,ARI,1997-08-07,207,5-10,Oklahoma
00-0034796,Lamar,Jackson,QB,ATL,1997-01-07,212,6-2,Louisville
MOCKEOF

    # Mock games
    cat <<MOCKEOF > "$DATA_DIR/games.csv"
game_id,season,game_type,week,gameday,weekday,gametime,away_team,home_team,away_score,home_score,stadium
2023_01_ARI_ATL,2023,REG,1,2023-09-10,Sunday,13:00,ARI,ATL,10,20,Mercedes-Benz Stadium
MOCKEOF

    # Mock weekly stats
    cat <<MOCKEOF > "$DATA_DIR/weekly_stats.csv"
player_id,season,week,completions,attempts,passing_yards,passing_tds,interceptions,carries,rushing_yards,rushing_tds,receptions,targets,receiving_yards,receiving_tds,fumbles_lost,fantasy_points,fantasy_points_ppr
00-0036900,2023,1,21,32,210,1,1,5,45,0,0,0,0,0,0,14.9,14.9
MOCKEOF

    # Mock play-by-play
    cat <<MOCKEOF > "$DATA_DIR/play_by_play.csv"
play_id,game_id,home_team,away_team,posteam,posteam_type,defteam,yardline_100,quarter,half_seconds_remaining,game_seconds_remaining,drive,qtr,down,ydstogo,play_type,yards_gained,passer_player_id,receiver_player_id,rusher_player_id,desc
1,2023_01_ARI_ATL,ATL,ARI,ARI,away,ATL,75,1,1800,3600,1,1,1,10,pass,15,00-0036900,,,Pass complete to WR for 15 yards.
MOCKEOF

else
    echo "Downloading full dataset from nflverse..."
    # nflverse release URLs for CSV files

    curl -sL "https://github.com/nflverse/nflverse-data/releases/download/teams/teams.csv" -o "$DATA_DIR/teams.csv"
    curl -sL "https://github.com/nflverse/nflverse-data/releases/download/rosters/rosters_1999_2026.csv" -o "$DATA_DIR/players.csv"
    curl -sL "https://github.com/nflverse/nflverse-data/releases/download/games/games.csv" -o "$DATA_DIR/games.csv"
    curl -sL "https://github.com/nflverse/nflverse-data/releases/download/player_stats/player_stats_1999_2026.csv" -o "$DATA_DIR/weekly_stats.csv"
    curl -sL "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_1999_2026.csv" -o "$DATA_DIR/play_by_play.csv"
fi

echo "Copying data files to container..."
docker cp "$DATA_DIR/teams.csv" "$CONTAINER_NAME:/tmp/teams.csv"
docker cp "$DATA_DIR/players.csv" "$CONTAINER_NAME:/tmp/players.csv"
docker cp "$DATA_DIR/games.csv" "$CONTAINER_NAME:/tmp/games.csv"
docker cp "$DATA_DIR/weekly_stats.csv" "$CONTAINER_NAME:/tmp/weekly_stats.csv"
docker cp "$DATA_DIR/play_by_play.csv" "$CONTAINER_NAME:/tmp/play_by_play.csv"

echo "Loading data into Postgres..."

# Use psql \copy for efficient loading from CSV
# Using ON_ERROR_STOP=1 as per guidelines
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d postgres -c "\copy teams FROM '/tmp/teams.csv' DELIMITER ',' CSV HEADER;"
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d postgres -c "\copy players FROM '/tmp/players.csv' DELIMITER ',' CSV HEADER;"
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d postgres -c "\copy games FROM '/tmp/games.csv' DELIMITER ',' CSV HEADER;"
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d postgres -c "\copy weekly_stats FROM '/tmp/weekly_stats.csv' DELIMITER ',' CSV HEADER;"
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d postgres -c "\copy play_by_play FROM '/tmp/play_by_play.csv' DELIMITER ',' CSV HEADER;"

echo "Cleaning up container temporary files..."
docker exec -i "$CONTAINER_NAME" rm /tmp/teams.csv /tmp/players.csv /tmp/games.csv /tmp/weekly_stats.csv /tmp/play_by_play.csv

echo "Cleaning up host temporary files..."
rm -rf "$DATA_DIR"

echo "Backfill complete!"

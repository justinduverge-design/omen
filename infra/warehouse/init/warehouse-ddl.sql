-- Warehouse DDL for nflverse data
-- Rebuildable from nflverse. Never holds user data.

CREATE TABLE teams (
    team_abbr VARCHAR(10) PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    team_conf VARCHAR(10),
    team_division VARCHAR(20),
    team_color VARCHAR(10),
    team_color2 VARCHAR(10),
    team_logo_url TEXT
);

CREATE TABLE players (
    gsis_id VARCHAR(50) PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    position VARCHAR(20),
    team VARCHAR(10) REFERENCES teams(team_abbr),
    birth_date DATE,
    weight INT,
    height VARCHAR(10),
    college VARCHAR(100)
);

-- Index for player name search
CREATE INDEX idx_players_name ON players(last_name, first_name);
CREATE INDEX idx_players_team ON players(team);

CREATE TABLE games (
    game_id VARCHAR(50) PRIMARY KEY,
    season INT NOT NULL,
    game_type VARCHAR(10) NOT NULL, -- REG, POST
    week INT NOT NULL,
    gameday DATE NOT NULL,
    weekday VARCHAR(10),
    gametime VARCHAR(10),
    away_team VARCHAR(10) REFERENCES teams(team_abbr),
    home_team VARCHAR(10) REFERENCES teams(team_abbr),
    away_score INT,
    home_score INT,
    stadium VARCHAR(100)
);

CREATE INDEX idx_games_season_week ON games(season, week);
CREATE INDEX idx_games_teams ON games(home_team, away_team);

CREATE TABLE weekly_stats (
    player_id VARCHAR(50) REFERENCES players(gsis_id),
    season INT NOT NULL,
    week INT NOT NULL,
    completions INT,
    attempts INT,
    passing_yards INT,
    passing_tds INT,
    interceptions INT,
    carries INT,
    rushing_yards INT,
    rushing_tds INT,
    receptions INT,
    targets INT,
    receiving_yards INT,
    receiving_tds INT,
    fumbles_lost INT,
    fantasy_points NUMERIC,
    fantasy_points_ppr NUMERIC,
    PRIMARY KEY (player_id, season, week)
);

CREATE INDEX idx_weekly_stats_season_week ON weekly_stats(season, week);

CREATE TABLE play_by_play (
    play_id BIGINT,
    game_id VARCHAR(50) REFERENCES games(game_id),
    home_team VARCHAR(10),
    away_team VARCHAR(10),
    posteam VARCHAR(10),
    posteam_type VARCHAR(10),
    defteam VARCHAR(10),
    yardline_100 INT,
    quarter INT,
    half_seconds_remaining INT,
    game_seconds_remaining INT,
    drive INT,
    qtr INT,
    down INT,
    ydstogo INT,
    play_type VARCHAR(50),
    yards_gained INT,
    passer_player_id VARCHAR(50),
    receiver_player_id VARCHAR(50),
    rusher_player_id VARCHAR(50),
    description TEXT,
    epa NUMERIC,
    wpa NUMERIC,
    air_epa NUMERIC,
    yac_epa NUMERIC,
    cpoe NUMERIC,
    success NUMERIC,
    PRIMARY KEY (game_id, play_id)
);

CREATE INDEX idx_pbp_game_id ON play_by_play(game_id);
CREATE INDEX idx_pbp_posteam ON play_by_play(posteam);
CREATE INDEX idx_pbp_play_type ON play_by_play(play_type);
CREATE INDEX idx_pbp_players ON play_by_play(passer_player_id, receiver_player_id, rusher_player_id);

"""Fixture tests: the Polars reader rejects what the Node adapter rejects.

Run: uv run --no-project --with "polars>=1.30" --with numpy python -I -m unittest discover -s infra/warehouse/polars
(Not in python-quality.yml: Polars is not a project dependency until the worker image adopts it.)
"""

import os
import sys
import tempfile
import unittest

import polars as pl

sys.path.insert(0, os.path.dirname(__file__))
import pbp_polars as P  # noqa: E402

TEAMS = {"ATL": "omen:team:atl", "NO": "omen:team:no"}
GSIS = {"00-1": "omen:player:a"}


def frame(**overrides):
    row = {
        "season": 2026,
        "week": 4,
        "game_id": "2026_04_ATL_NO",
        "play_id": 40.0,
        "posteam": "ATL",
        "defteam": "NO",
        "passer_player_id": "00-1",
        "rusher_player_id": None,
        "receiver_player_id": None,
        "play_type": "pass",
        "desc": " Pass short ",
        "epa": -0.35269966581836343,
        "wpa": None,
        "cpoe": None,
        "air_epa": None,
        "yac_epa": None,
        "success": 0.0,
    }
    row.update(overrides)
    schema = {
        "season": pl.Int32,
        "week": pl.Int32,
        "play_id": pl.Float64,
        "epa": pl.Float64,
        "wpa": pl.Float64,
        "cpoe": pl.Float64,
        "air_epa": pl.Float64,
        "yac_epa": pl.Float64,
    }
    df = pl.DataFrame([row], schema_overrides=schema)
    if isinstance(row["success"], str):
        df = df.with_columns(pl.col("success").cast(pl.String))
    path = os.path.join(tempfile.mkdtemp(), "f.parquet")
    df.write_parquet(path)
    return path


class Reader(unittest.TestCase):
    def build(self, **overrides):
        return P.build(frame(**overrides), 2026, GSIS, TEAMS)

    def test_happy_row(self):
        rows, unmatched, _ = self.build()
        self.assertEqual((rows.height, unmatched), (1, 0))
        r = rows.row(0, named=True)
        self.assertEqual(
            (r["play_id"], r["passer_player_id"], r["desc_text"], r["success"]),
            (40, "omen:player:a", "Pass short", False),
        )

    def test_rejections_match_node(self):
        for overrides in (
            {"season": None},
            {"season": 2025},
            {"week": 0},
            {"week": 24},
            {"week": None},
            {"game_id": ""},
            {"play_id": 40.5},
            {"play_id": -1.0},
            {"posteam": "XXX"},
            {"success": "maybe"},
        ):
            with self.subTest(overrides=overrides), self.assertRaises(ValueError):
                self.build(**overrides)

    def test_unknown_participant_skips_the_row(self):
        rows, unmatched, _ = self.build(passer_player_id="00-9")
        self.assertEqual((rows.height, unmatched), (0, 1))

    def test_na_and_spacing_are_missing_like_node(self):
        rows, _, _ = self.build(passer_player_id="NA", play_type="  ", success="true")
        r = rows.row(0, named=True)
        self.assertEqual((r["passer_player_id"], r["play_type"], r["success"]), (None, None, True))


if __name__ == "__main__":
    unittest.main()

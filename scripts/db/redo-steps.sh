# shellcheck shell=bash
# The 2026-10-01 redo steps in production order. Sourced by rehearse-redo.sh and rehearse-pending.sh,
# so the order lives in one place (STANDARDS rule 4).
# shellcheck disable=SC2034  # used by the sourcing script
# 10 before 09, as in production: step 10's rollback refuses while 09 is applied (Codex review, #534).
steps=(01_identity_link 02_connection_credentials 03_leagues_memberships 04_players_crosswalk 05_ledger 06_projections_shadow 07_close_client_writes 08_retire_unscoped_moves 10_account_erasure 09_beta_reports 11_league_scoring_rules 12_saved_trades 13_football_intelligence_signals 14_nflverse_weekly_stats 15_nflverse_full_lines 16_projection_fk_indexes 17_connection_invalidate 18_decision_horizon_grades)
# Steps in the list above that production never got (README: step 15 retired 2026-10-04). The redo
# rehearsal still runs them; the pending rehearsal skips them so its baseline is production as it is.
retired_for_production=(15_nflverse_full_lines)

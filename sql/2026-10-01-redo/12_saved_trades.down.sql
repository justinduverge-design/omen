-- REVIEW ONLY. Rollback for step 12. Lossless until the server writes the first saved trade. After that,
-- rolling back deletes every user's saved trades: export the table first and keep the file with the
-- rollback record, and move the server back to its previous store in the same change.
begin;
drop table if exists public.saved_trades;
drop function if exists public.saved_trades_check_update();
commit;

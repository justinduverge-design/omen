"use strict";
const { createClient } = require("@supabase/supabase-js");
const config = require("../src/config");
const { getAuthenticatedEspnCredentials } = require("../src/services/espnAuth");
const espn = require("../src/adapters/espn");
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey,{auth:{persistSession:false}});
(async()=>{
 const {data:c,error}=await supabase.from("platform_connections").select("user_id,league_id").eq("platform","espn").eq("league_id","13338821").eq("is_active",true).limit(1).single();
 if(error) throw error;
 const creds=await getAuthenticatedEspnCredentials(c.user_id);
 for(const week of [1,2]){
  const data=await espn.fetchEspnApi(c.league_id,creds.espn_s2,creds.swid,["mTeam","mMatchup","mMatchupScore"],week,{seasonId:2026});
  const games=(data.schedule||[]).filter(g=>Number(g.matchupPeriodId??g.scoringPeriodId)===week);
  const safe=games.map(g=>({id:g.id,winner:g.winner,home:{teamId:g.home?.teamId,totalPoints:g.home?.totalPoints,points:g.home?.points},away:{teamId:g.away?.teamId,totalPoints:g.away?.totalPoints,points:g.away?.points}}));
  console.log("[league-office-diagnose]",JSON.stringify({week,games:safe}));
 }
})().catch(e=>{console.error("[league-office-diagnose] failed",e.message);process.exit(1)});

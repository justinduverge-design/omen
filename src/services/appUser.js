"use strict";

const { createClient } = require("@supabase/supabase-js");
const config = require("../config");

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

function appUserError(message, status = 422) {
  return Object.assign(new Error(message), { status });
}

async function ensureAppUser(authUser) {
  const userId = String(authUser?.id || "").trim();
  const email = String(authUser?.email || "").trim().toLowerCase();

  if (!userId) {
    throw appUserError("Authenticated user id is required", 401);
  }
  if (!email) {
    throw appUserError("Authenticated user email is required");
  }

  const { error } = await supabase
    .from("users")
    .upsert({
      id: userId,
      email,
    }, { onConflict: "id" });

  if (error) throw new Error(`app user bootstrap failed: ${error.message}`);
  return { id: userId, email };
}

module.exports = { ensureAppUser };

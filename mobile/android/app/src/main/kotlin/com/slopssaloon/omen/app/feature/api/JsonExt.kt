package com.slopssaloon.omen.app.feature.api

import org.json.JSONObject

/**
 * Reads a nullable JSON string, treating absent, JSON `null`, and blank as absent.
 *
 * Android's `org.json` returns the **literal string `"null"`** from `optString` when the value
 * is JSON `null` — not an empty string, and not Kotlin's null. So every bare
 * `optString(k)` and every `optString(k).takeIf { it.isNotEmpty() }` in this package let the
 * word "null" through as if it were real data, and it reached the screen: the Command Center
 * rendered a connected league whose subtitle was literally "null", under the team name, on the
 * founder's own device.
 *
 * Three files had already grown their own private copy of this function, and the rest had
 * nothing — the guard existed wherever the bug had previously been noticed and nowhere else.
 * `isNull` is the precise check (a league honestly named "null" survives it); string-comparing
 * against "null" is not.
 */
fun JSONObject.optStringOrNull(key: String): String? =
    if (isNull(key)) null else optString(key).takeIf { it.isNotBlank() }


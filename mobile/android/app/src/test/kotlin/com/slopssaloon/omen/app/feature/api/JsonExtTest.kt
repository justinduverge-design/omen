package com.slopssaloon.omen.app.feature.api

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Android's `org.json` returns the literal string "null" from `optString` when the value is
 * JSON null. The Command Center rendered exactly that under a connected league's name on the
 * founder's own device: "The Titans of Slopsilonia" with the subtitle "null".
 */
class JsonExtTest {

    @Test
    fun `a JSON null does not become the string null`() {
        val json = JSONObject("""{"league_name": null}""")

        assertNull(json.optStringOrNull("league_name"))
    }

    @Test
    fun `an absent key is absent`() {
        assertNull(JSONObject("{}").optStringOrNull("league_name"))
    }

    @Test
    fun `empty and whitespace are absent`() {
        assertNull(JSONObject("""{"a": "", "b": "   "}""").optStringOrNull("a"))
        assertNull(JSONObject("""{"a": "", "b": "   "}""").optStringOrNull("b"))
    }

    @Test
    fun `a real value survives`() {
        assertEquals(
            "The Titans of Slopsilonia",
            JSONObject("""{"league_name": "The Titans of Slopsilonia"}""").optStringOrNull("league_name"),
        )
    }

    /**
     * `isNull` is the precise check. String-comparing against "null" would drop a league
     * genuinely, if unwisely, named "null".
     */
    @Test
    fun `a league honestly named null survives`() {
        assertEquals("null", JSONObject("""{"league_name": "null"}""").optStringOrNull("league_name"))
    }
}

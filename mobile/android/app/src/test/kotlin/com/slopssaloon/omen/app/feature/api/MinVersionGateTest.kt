package com.slopssaloon.omen.app.feature.api

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * O7 — forced-update gate: below-minimum, at-minimum, and check-unavailable.
 * Swift twin: `MinVersionGateTests.swift`.
 */
class MinVersionGateTest {

    private fun client(status: Int?, body: String = ""): MinVersionGateClient =
        MinVersionGateClient("https://example.invalid") { _, _, _, _ ->
            status?.let { it to body }
        }

    @Test
    fun `below minimum returns update required`() = runBlocking {
        val body = """{"status":"update_required","update_required":true,"minimum_version":"1.2.0"}"""
        val result = client(200, body).check("android", "1.1.0")

        assertEquals(MinVersionGateResult.UpdateRequired("1.2.0"), result)
    }

    @Test
    fun `at minimum returns ok`() = runBlocking {
        val body = """{"status":"ok","update_required":false,"minimum_version":"1.2.0"}"""
        val result = client(200, body).check("android", "1.2.0")

        assertEquals(MinVersionGateResult.Ok, result)
    }

    @Test
    fun `network failure fails open`() = runBlocking {
        assertEquals(MinVersionGateResult.Unavailable, client(null).check("android", "1.1.0"))
    }

    @Test
    fun `server error fails open`() = runBlocking {
        assertEquals(MinVersionGateResult.Unavailable, client(500).check("android", "1.1.0"))
    }

    @Test
    fun `undecodable payload fails open`() = runBlocking {
        assertEquals(MinVersionGateResult.Unavailable, client(200, "not json").check("android", "1.1.0"))
    }

    /**
     * The gate runs unconditionally at launch, before sign-in. `OkHttpFetcher` catches only
     * `IOException` and builds its `Request` outside that try, so a malformed base URL raises
     * `IllegalArgumentException` — which would crash the app rather than fail open. The gate
     * must absorb any throwable, matching the iOS twin's catch-all.
     */
    @Test
    fun `a throwing fetcher fails open instead of propagating`() = runBlocking {
        val throwing = MinVersionGateClient("https://example.invalid") { _, _, _, _ ->
            throw IllegalArgumentException("Expected URL scheme 'http' or 'https'")
        }

        assertEquals(MinVersionGateResult.Unavailable, throwing.check("android", "1.0.0"))
    }

    @Test
    fun `view model blocks on update required`() = runBlocking {
        val viewModel = UpdateGateViewModel(
            client = { _, _ -> MinVersionGateResult.UpdateRequired("2.0.0") },
            currentVersion = "1.0.0",
        )
        viewModel.check()

        assertEquals(UpdateGateState.Blocked("2.0.0"), viewModel.state)
    }

    @Test
    fun `view model passes through when the check is unavailable`() = runBlocking {
        val viewModel = UpdateGateViewModel(
            client = { _, _ -> MinVersionGateResult.Unavailable },
            currentVersion = "1.0.0",
        )
        viewModel.check()

        assertEquals(UpdateGateState.Passed, viewModel.state)
    }

    @Test
    fun `view model passes through on ok`() = runBlocking {
        val viewModel = UpdateGateViewModel(
            client = { _, _ -> MinVersionGateResult.Ok },
            currentVersion = "1.0.0",
        )
        viewModel.check()

        assertEquals(UpdateGateState.Passed, viewModel.state)
    }
}

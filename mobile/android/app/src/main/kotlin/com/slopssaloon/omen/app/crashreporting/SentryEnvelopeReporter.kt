package com.slopssaloon.omen.app.crashreporting

import android.util.Log
import java.net.URI
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import java.util.concurrent.TimeUnit
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * Hand-rolled Sentry envelope sender for O6 — no Sentry SDK dependency, the same "direct HTTP
 * integration over a new package.json/build dependency" choice O8 made for the backend half.
 * Posts `application/x-sentry-envelope` to the DSN's `/envelope/` endpoint, authenticating via
 * the DSN embedded in the envelope header — the legacy `/store/` + `X-Sentry-Auth` shape O1b
 * proved against GlitchTip is documented as deprecated for direct Sentry SaaS ingestion.
 *
 * Runs synchronously on the crashing thread by design: `report()` must complete (or time out)
 * before the caller hands off to the previous uncaught-exception handler, or the process may be
 * gone before the network call finishes.
 */
class SentryEnvelopeReporter(
    private val dsn: String,
    private val httpClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(3, TimeUnit.SECONDS)
        .writeTimeout(3, TimeUnit.SECONDS)
        .readTimeout(3, TimeUnit.SECONDS)
        .build(),
) {
    fun report(throwable: Throwable) {
        if (dsn.isBlank()) return
        // An uncaught exception on the main thread is handled ON the main thread, and Android's
        // StrictMode forbids a synchronous network call there (NetworkOnMainThreadException) —
        // confirmed by a real on-device crash during development, not assumed. The network call
        // itself must run on a genuinely different thread; report() still blocks the caller via
        // join() so the process isn't torn down before that thread gets a chance to finish.
        val networkThread = Thread {
            try {
                val request = Request.Builder()
                    .url(ingestUrl(dsn))
                    .post(buildEnvelope(throwable, dsn).toRequestBody(ENVELOPE_MEDIA_TYPE))
                    .build()
                httpClient.newCall(request).execute().use { response ->
                    Log.i(TAG, "Reported crash to Sentry, response code ${response.code}")
                }
            } catch (e: Exception) {
                // A reporting failure must never mask or delay the real crash.
                Log.w(TAG, "Failed to report crash to Sentry", e)
            }
        }
        networkThread.start()
        networkThread.join(REPORT_TIMEOUT_MS)
    }

    companion object {
        private const val TAG = "SentryEnvelopeReporter"
        private const val REPORT_TIMEOUT_MS = 5000L
        private val ENVELOPE_MEDIA_TYPE = "application/x-sentry-envelope".toMediaType()

        internal fun ingestUrl(dsn: String): String {
            val uri = URI(dsn)
            val projectId = uri.path.trimStart('/')
            return "https://${uri.host}/api/$projectId/envelope/"
        }

        internal fun buildEnvelope(throwable: Throwable, dsn: String): String {
            val eventPayload = buildEventPayload(throwable)
            val eventBytes = eventPayload.toByteArray(Charsets.UTF_8)
            val header = """{"dsn":"$dsn","sent_at":"${isoTimestamp()}"}"""
            val itemHeader =
                """{"type":"event","length":${eventBytes.size},"content_type":"application/json"}"""
            return "$header\n$itemHeader\n$eventPayload"
        }

        internal fun buildEventPayload(throwable: Throwable): String {
            // No user data, provider token, or league identifier ever belongs in a crash
            // payload (O6's own boundary) — only code structure: class/method/line, never a
            // value the app touched.
            val frames = throwable.stackTrace.reversed().joinToString(",") { frame ->
                """{"filename":${jsonString(frame.fileName ?: "")},"function":${jsonString(frame.methodName)},"module":${jsonString(frame.className)},"lineno":${frame.lineNumber}}"""
            }
            val eventId = UUID.randomUUID().toString().replace("-", "")
            return """{"event_id":"$eventId","timestamp":"${isoTimestamp()}","platform":"android","level":"fatal","exception":{"values":[{"type":${jsonString(throwable.javaClass.name)},"value":${jsonString(throwable.message ?: "")},"stacktrace":{"frames":[$frames]}}]}}"""
        }

        private fun jsonString(value: String): String {
            val escaped = value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t")
            return "\"$escaped\""
        }

        private fun isoTimestamp(): String {
            val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            format.timeZone = TimeZone.getTimeZone("UTC")
            return format.format(Date())
        }
    }
}

package com.slopssaloon.omen.core.auth

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AccountDeletionTest {

    @Test fun confirmsOnlyExactPhrase() {
        assertTrue(AccountDeletion.isConfirmed("delete"))
    }

    @Test fun rejectsNearMisses() {
        assertFalse(AccountDeletion.isConfirmed("delete my omen data"))
        // Trimmed and case-insensitive since 2026-09-03 — autocapitalize makes "Delete" the
        // likeliest thing a phone user types. A different word must still fail.
        assertTrue(AccountDeletion.isConfirmed(" Delete "))
        assertTrue(AccountDeletion.isConfirmed("DELETE"))
        assertFalse(AccountDeletion.isConfirmed(""))
        assertFalse(AccountDeletion.isConfirmed("del"))
        assertFalse(AccountDeletion.isConfirmed("delete my account"))
        assertFalse(AccountDeletion.isConfirmed("DELETE MY DATA"))
        assertFalse(AccountDeletion.isConfirmed(""))
    }

    @Test fun statusMapping() {
        assertEquals(AccountDeletionOutcome.Deleted, mapDeleteStatus(200))
        assertEquals(AccountDeletionOutcome.InvalidConfirmation, mapDeleteStatus(400))
        assertEquals(AccountDeletionOutcome.Unauthorized, mapDeleteStatus(401))
        assertEquals(AccountDeletionOutcome.RetryableError(RetryableCode.SERVER), mapDeleteStatus(503))
        assertEquals(AccountDeletionOutcome.RetryableError(RetryableCode.TIMEOUT), mapDeleteStatus(504))
    }
}

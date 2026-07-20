package com.slopssaloon.omen.core.auth

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AccountDeletionTest {

    @Test fun confirmsOnlyExactPhrase() {
        assertTrue(AccountDeletion.isConfirmed("DELETE MY OMEN DATA"))
    }

    @Test fun rejectsNearMisses() {
        assertFalse(AccountDeletion.isConfirmed("delete my omen data"))
        assertFalse(AccountDeletion.isConfirmed("DELETE MY OMEN DATA "))
        assertFalse(AccountDeletion.isConfirmed(" DELETE MY OMEN DATA"))
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

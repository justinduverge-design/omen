package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.getBoundsInRoot
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.unit.dp
import org.junit.Assert.fail

/**
 * Fails when a node is being cut off by an ancestor.
 *
 * Compose reports two rectangles for every node: where it *would* be if nothing constrained
 * it ([getUnclippedBoundsInRoot]) and where it is actually allowed to paint
 * ([getBoundsInRoot]). When an ancestor pins a height the content has outgrown, the first is
 * taller than the second, and the difference is exactly the pixels the user never sees.
 *
 * This is the assertion Omen did not have. Three shipped bugs were this shape and all three
 * were found by a human looking at a screen instead:
 *
 *   - the league carousel pager pinned to 270, slicing the platform badge in half;
 *   - `OmenMatchupHero` floored at 220 by a greedy `GeometryReader`, so the card could not
 *     shrink and its content could not grow;
 *   - the iOS OTP field's 60pt frame that did not extend the 25pt touch target.
 *
 * A tolerance of 0.5dp absorbs sub-pixel rounding; anything above that is real clipping.
 */
fun SemanticsNodeInteraction.assertNotClipped(what: String) {
    val clipped = getBoundsInRoot()
    val unclipped = getUnclippedBoundsInRoot()
    val tolerance = 0.5.dp

    val lostBelow = unclipped.bottom - clipped.bottom
    val lostAbove = clipped.top - unclipped.top
    val lostRight = unclipped.right - clipped.right

    if (lostBelow > tolerance || lostAbove > tolerance || lostRight > tolerance) {
        fail(
            buildString {
                append("$what is clipped by an ancestor.\n")
                append("  painted:  $clipped\n")
                append("  needed:   $unclipped\n")
                if (lostAbove > tolerance) append("  cut off above: $lostAbove\n")
                if (lostBelow > tolerance) append("  cut off below: $lostBelow\n")
                if (lostRight > tolerance) append("  cut off right: $lostRight\n")
                append("A fixed height an ancestor cannot grow past is the usual cause.")
            }
        )
    }
}

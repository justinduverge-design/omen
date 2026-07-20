package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import com.slopssaloon.omen.core.designsystem.token.OmenMinTouchTarget
import com.slopssaloon.omen.core.designsystem.token.omenFocusRing

/** Registry §3.1 select control, using Material3's native exposed-dropdown behavior. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OmenPicker(
    label: String,
    selectedOption: String,
    options: List<String>,
    onOptionSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isError: Boolean = false,
) {
    val colors = OmenTheme.color
    var expanded by remember { mutableStateOf(false) }
    val interactionSource = remember { MutableInteractionSource() }
    val focused by interactionSource.collectIsFocusedAsState()

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { if (enabled) expanded = !expanded },
        modifier = modifier,
    ) {
        OutlinedTextField(
            value = selectedOption,
            onValueChange = {},
            readOnly = true,
            enabled = enabled,
            isError = isError,
            label = { androidx.compose.material3.Text(label, style = OmenTheme.typography.label.toTextStyle()) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            interactionSource = interactionSource,
            modifier = Modifier
                .menuAnchor(MenuAnchorType.PrimaryNotEditable, enabled)
                .fillMaxWidth()
                .heightIn(min = OmenMinTouchTarget)
                .omenFocusRing(
                    focused = focused,
                    color = colors.focusRing,
                    haloColor = colors.focusRingHalo,
                    cornerRadius = 8.dp,
                )
                .then(if (isError) Modifier.semantics { stateDescription = "Error" } else Modifier),
            textStyle = OmenTheme.typography.body.toTextStyle(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = colors.textPrimary,
                unfocusedTextColor = colors.textPrimary,
                disabledTextColor = colors.textTertiary,
                focusedBorderColor = colors.focusRing,
                unfocusedBorderColor = colors.border,
                errorBorderColor = colors.data.riskHigh,
                disabledBorderColor = colors.border,
                focusedLabelColor = colors.textPrimary,
                unfocusedLabelColor = colors.textSecondary,
                errorLabelColor = colors.data.riskHigh,
            ),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { option ->
                DropdownMenuItem(
                    text = { androidx.compose.material3.Text(option, style = OmenTheme.typography.body.toTextStyle()) },
                    onClick = {
                        onOptionSelected(option)
                        expanded = false
                    },
                )
            }
        }
    }
}

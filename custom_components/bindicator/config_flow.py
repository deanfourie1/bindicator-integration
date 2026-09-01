"""Config flow for Bindicator."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers.selector import EntitySelector, EntitySelectorConfig

from .const import CONF_SOURCE_LIGHT, DOMAIN


def _is_effect_light(hass: HomeAssistant, entity_id: str) -> bool:
    """Return True when the selected light exposes WLED-style effects."""
    state = hass.states.get(entity_id)
    if state is None:
        return False

    effect_list = state.attributes.get("effect_list")
    return isinstance(effect_list, list) and len(effect_list) > 0


class BindicatorConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Bindicator."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the initial setup step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            source_light = user_input[CONF_SOURCE_LIGHT]

            if not _is_effect_light(self.hass, source_light):
                errors["base"] = "no_effects"
            else:
                await self.async_set_unique_id(source_light)
                self._abort_if_unique_id_configured()

                state = self.hass.states.get(source_light)
                title = state.name if state is not None else source_light

                return self.async_create_entry(
                    title=title,
                    data={CONF_SOURCE_LIGHT: source_light},
                )

        schema = vol.Schema(
            {
                vol.Required(CONF_SOURCE_LIGHT): EntitySelector(
                    EntitySelectorConfig(domain="light")
                )
            }
        )

        return self.async_show_form(
            step_id="user",
            data_schema=schema,
            errors=errors,
        )

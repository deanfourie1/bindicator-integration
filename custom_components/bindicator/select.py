"""Effect select platform for Bindicator."""

from __future__ import annotations

from collections.abc import Callable
import re

from homeassistant.components.light import ATTR_EFFECT, DOMAIN as LIGHT_DOMAIN, SERVICE_TURN_ON
from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_ENTITY_ID, STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import Event, EventStateChangedData, HomeAssistant, State, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_track_state_change_event

from .const import CONF_SOURCE_LIGHT


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the Bindicator effect select."""
    source_light = entry.data[CONF_SOURCE_LIGHT]
    async_add_entities([BindicatorEffectSelect(source_light, entry.entry_id)])


class BindicatorEffectSelect(SelectEntity):
    """Select entity which mirrors and controls a light's effect."""

    _attr_icon = "mdi:creation"
    _attr_should_poll = False

    def __init__(self, source_light: str, entry_id: str) -> None:
        """Initialize the effect select."""
        self._source_light = source_light
        self._entry_id = entry_id
        self._attr_unique_id = f"{source_light}_effect"
        self._attr_current_option: str | None = None
        self._attr_options: list[str] = []
        self._attr_available = False

    async def async_added_to_hass(self) -> None:
        """Subscribe to source-light state updates."""
        await super().async_added_to_hass()

        self._sync_from_state(self.hass.states.get(self._source_light))

        self.async_on_remove(
            async_track_state_change_event(
                self.hass,
                [self._source_light],
                self._async_source_changed,
            )
        )

    @callback
    def _async_source_changed(
        self, event: Event[EventStateChangedData]
    ) -> None:
        """Handle a state update from the source light."""
        self._sync_from_state(event.data["new_state"])
        self.async_write_ha_state()

    @callback
    def _sync_from_state(self, state: State | None) -> None:
        """Copy current effect data from the source light state."""
        if state is None or state.state in (STATE_UNKNOWN, STATE_UNAVAILABLE):
            self._attr_available = False
            self._attr_options = []
            self._attr_current_option = None
            return

        raw_options = state.attributes.get("effect_list")
        options = (
            [str(option) for option in raw_options]
            if isinstance(raw_options, list)
            else []
        )

        current = state.attributes.get("effect")
        current_str = str(current) if current is not None else None

        # Some WLED states can briefly report no effect while still exposing
        # the effect list. Keep "Solid" selected when it is a valid option.
        if current_str not in options:
            current_str = "Solid" if "Solid" in options else (options[0] if options else None)

        self._attr_options = options
        self._attr_current_option = current_str
        self._attr_available = bool(options)

        # Give the generated entity a predictable default object ID:
        # light.wled_camper -> select.bindicator_wled_camper_effect
        if self.entity_id is None:
            object_id = self._source_light.split(".", 1)[1]
            safe_object_id = re.sub(r"[^a-z0-9_]+", "_", object_id.lower()).strip("_")
            self.entity_id = f"select.bindicator_{safe_object_id}_effect"

        source_name = state.name
        self._attr_name = f"Bindicator {source_name} Effect"

    async def async_select_option(self, option: str) -> None:
        """Apply the selected effect to the source light."""
        if option not in self._attr_options:
            return

        await self.hass.services.async_call(
            LIGHT_DOMAIN,
            SERVICE_TURN_ON,
            {
                ATTR_ENTITY_ID: self._source_light,
                ATTR_EFFECT: option,
            },
            blocking=True,
            context=self._context,
        )

        # Optimistically reflect the user's selection. The source light's
        # next state event will confirm/correct it.
        self._attr_current_option = option
        self.async_write_ha_state()

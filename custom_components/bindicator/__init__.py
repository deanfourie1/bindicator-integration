"""Bindicator integration."""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import CARD_URL, PLATFORMS

_LOGGER = logging.getLogger(__name__)
_FRONTEND_FILE = Path(__file__).parent / "frontend" / "bindicator-card.js"
_FRONTEND_REGISTERED = "bindicator_frontend_registered"


async def _async_register_frontend(hass: HomeAssistant) -> None:
    """Serve and automatically load the Bindicator dashboard card."""
    if hass.data.get(_FRONTEND_REGISTERED):
        return

    if not _FRONTEND_FILE.exists():
        _LOGGER.warning(
            "Bindicator frontend file was not found at %s; "
            "the backend integration will continue without the dashboard card",
            _FRONTEND_FILE,
        )
        return

    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                CARD_URL,
                str(_FRONTEND_FILE),
                False,
            )
        ]
    )

    # Automatically load the card in the Home Assistant frontend. This removes
    # the need for a separate HACS Dashboard repository/resource entry.
    add_extra_js_url(hass, CARD_URL)
    hass.data[_FRONTEND_REGISTERED] = True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Bindicator from a config entry."""
    await _async_register_frontend(hass)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a Bindicator config entry."""
    # Keep the static frontend registration in place. Home Assistant's HTTP
    # route remains valid for the lifetime of the process and other Bindicator
    # entries may still use the card.
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

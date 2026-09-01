"""Bindicator integration."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_call_later

from .const import CARD_PATH, CARD_URL, PLATFORMS

_LOGGER = logging.getLogger(__name__)

_FRONTEND_FILE = Path(__file__).parent / "frontend" / "bindicator-card.js"
_FRONTEND_STATIC_REGISTERED = "bindicator_frontend_static_registered"
_FRONTEND_RESOURCE_REGISTERED = "bindicator_frontend_resource_registered"
_RESOURCE_RETRY_COUNT = "bindicator_frontend_resource_retry_count"
_MAX_RESOURCE_RETRIES = 12


async def _async_register_static_frontend(hass: HomeAssistant) -> bool:
    """Serve the bundled dashboard card."""
    if hass.data.get(_FRONTEND_STATIC_REGISTERED):
        return True

    if not _FRONTEND_FILE.exists():
        _LOGGER.error("Bindicator frontend file was not found at %s", _FRONTEND_FILE)
        return False

    await hass.http.async_register_static_paths(
        [StaticPathConfig(CARD_PATH, str(_FRONTEND_FILE), False)]
    )
    hass.data[_FRONTEND_STATIC_REGISTERED] = True
    return True


async def _async_register_lovelace_resource(hass: HomeAssistant) -> bool:
    """Register the card as a Lovelace module resource."""
    if hass.data.get(_FRONTEND_RESOURCE_REGISTERED):
        return True

    lovelace: Any = hass.data.get("lovelace")
    if lovelace is None:
        return False

    resources = (
        lovelace.resources
        if hasattr(lovelace, "resources")
        else lovelace.get("resources")
        if isinstance(lovelace, dict)
        else None
    )

    if resources is not None and hasattr(resources, "async_get_info"):
        await resources.async_get_info()

        existing = None
        for item in resources.async_items():
            if str(item.get("url", "")).startswith(CARD_PATH):
                existing = item
                break

        if existing is None:
            if hasattr(resources, "async_create_item"):
                await resources.async_create_item(
                    {"res_type": "module", "url": CARD_URL}
                )
                _LOGGER.debug("Registered Bindicator Lovelace resource: %s", CARD_URL)
            else:
                add_extra_js_url(hass, CARD_URL)
        else:
            current_url = str(existing.get("url", ""))
            current_type = existing.get("res_type")

            if (
                current_url != CARD_URL or current_type != "module"
            ) and hasattr(resources, "async_update_item"):
                await resources.async_update_item(
                    existing["id"],
                    {"res_type": "module", "url": CARD_URL},
                )
                _LOGGER.debug("Updated Bindicator Lovelace resource: %s", CARD_URL)

        hass.data[_FRONTEND_RESOURCE_REGISTERED] = True
        return True

    add_extra_js_url(hass, CARD_URL)
    hass.data[_FRONTEND_RESOURCE_REGISTERED] = True
    return True


@callback
def _schedule_resource_retry(hass: HomeAssistant) -> None:
    """Retry frontend resource registration until Lovelace is ready."""
    retries = int(hass.data.get(_RESOURCE_RETRY_COUNT, 0))
    if retries >= _MAX_RESOURCE_RETRIES:
        _LOGGER.warning(
            "Could not register Bindicator as a Lovelace resource after %s attempts; "
            "the card is still available at %s",
            _MAX_RESOURCE_RETRIES,
            CARD_URL,
        )
        return

    hass.data[_RESOURCE_RETRY_COUNT] = retries + 1

    async def _retry(_now) -> None:
        try:
            if await _async_register_lovelace_resource(hass):
                hass.data[_RESOURCE_RETRY_COUNT] = 0
                return
        except Exception:
            _LOGGER.exception("Error while registering Bindicator Lovelace resource")
        _schedule_resource_retry(hass)

    async_call_later(hass, 5, _retry)


async def _async_register_frontend(hass: HomeAssistant) -> None:
    """Serve and register the bundled dashboard card."""
    if not await _async_register_static_frontend(hass):
        return

    try:
        if not await _async_register_lovelace_resource(hass):
            _schedule_resource_retry(hass)
    except Exception:
        _LOGGER.exception(
            "Failed to register Bindicator Lovelace resource; scheduling retry"
        )
        _schedule_resource_retry(hass)


async def async_setup(hass: HomeAssistant, config: dict[str, Any]) -> bool:
    """Set up Bindicator before config entries are loaded."""
    await _async_register_frontend(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Bindicator from a config entry."""
    await _async_register_frontend(hass)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a Bindicator config entry."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

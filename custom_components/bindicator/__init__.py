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

from .const import CARD_PATH, CARD_URL, DOMAIN, PLATFORMS

_LOGGER = logging.getLogger(__name__)

_FRONTEND_FILE = Path(__file__).parent / "frontend" / "bindicator-card.js"
_FRONTEND_STATIC_REGISTERED = "bindicator_frontend_static_registered"
_FRONTEND_RESOURCE_REGISTERED = "bindicator_frontend_resource_registered"
_RESOURCE_RETRY_COUNT = "bindicator_frontend_resource_retry_count"
_MAX_RESOURCE_RETRIES = 12


def _get_lovelace_resources(hass: HomeAssistant):
    """Return the Lovelace resource collection when available."""
    lovelace: Any = hass.data.get("lovelace")
    if lovelace is None:
        return None

    if hasattr(lovelace, "resources"):
        return lovelace.resources

    if isinstance(lovelace, dict):
        return lovelace.get("resources")

    return None


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

    resources = _get_lovelace_resources(hass)
    if resources is None:
        return False

    if hasattr(resources, "async_get_info"):
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

    # YAML-mode dashboards do not have mutable resource storage.
    add_extra_js_url(hass, CARD_URL)
    hass.data[_FRONTEND_RESOURCE_REGISTERED] = True
    return True


async def _async_remove_lovelace_resource(hass: HomeAssistant) -> None:
    """Remove the Bindicator Lovelace resource from storage-mode dashboards."""
    resources = _get_lovelace_resources(hass)
    if resources is None or not hasattr(resources, "async_get_info"):
        # There is no mutable storage resource collection to clean up.
        hass.data.pop(_FRONTEND_RESOURCE_REGISTERED, None)
        return

    await resources.async_get_info()

    to_remove = [
        item
        for item in resources.async_items()
        if str(item.get("url", "")).startswith(CARD_PATH)
    ]

    for item in to_remove:
        if hasattr(resources, "async_delete_item"):
            await resources.async_delete_item(item["id"])
            _LOGGER.debug(
                "Removed Bindicator Lovelace resource: %s",
                item.get("url", CARD_PATH),
            )
        else:
            _LOGGER.warning(
                "Bindicator resource %s could not be removed automatically "
                "because this Home Assistant resource collection does not "
                "support deletion",
                item.get("url", CARD_PATH),
            )

    hass.data.pop(_FRONTEND_RESOURCE_REGISTERED, None)


def _other_bindicator_entries_exist(
    hass: HomeAssistant, unloading_entry: ConfigEntry
) -> bool:
    """Return True when another Bindicator config entry remains loaded/configured."""
    return any(
        entry.entry_id != unloading_entry.entry_id
        for entry in hass.config_entries.async_entries(DOMAIN)
    )


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
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

    if unloaded and not _other_bindicator_entries_exist(hass, entry):
        try:
            await _async_remove_lovelace_resource(hass)
        except Exception:
            _LOGGER.exception("Failed to remove Bindicator Lovelace resource")

    return unloaded


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Clean up shared frontend resources when the last Bindicator entry is removed."""
    if not _other_bindicator_entries_exist(hass, entry):
        try:
            await _async_remove_lovelace_resource(hass)
        except Exception:
            _LOGGER.exception(
                "Failed to remove Bindicator Lovelace resource while deleting entry"
            )

# Bindicator

Bindicator is a Home Assistant custom integration **and** dashboard card in one HACS repository.

It provides:

- the `custom:bindicator-card` dashboard card
- a visual card editor
- automatic WLED effect `select` entities
- no separate Dashboard HACS repository
- no manual Template YAML for WLED effects

## Installation with HACS

Add this repository to HACS as an **Integration** repository, install **Bindicator**, then restart Home Assistant.

After restart:

1. Go to **Settings → Devices & services → Add Integration**.
2. Search for **Bindicator**.
3. Select the WLED light you want to use.
4. Bindicator creates an effect select automatically.
5. Edit a dashboard and choose **Bindicator Card** from the card picker.

For example:

`light.wled_camper` → `select.bindicator_wled_camper_effect`

The card automatically detects that generated select entity when no manual Effect select entity is configured.

## Existing Template YAML

Once the Bindicator integration is installed and its generated effect select is working, the old manual template select is no longer required.

## Frontend

The card JavaScript is bundled at:

`custom_components/bindicator/frontend/bindicator-card.js`

The integration serves and loads it automatically, so there is no separate Lovelace resource or HACS Dashboard repository to install.

## Current image paths

The current card build keeps the existing configurable image defaults:

- `/local/images/bin_base.png`
- `/local/images/bin_glow_mask.png`

These can still be changed in the visual editor. Bundling the bin artwork inside the integration can be added as the next packaging step.


## v0.3.1

The frontend loader now registers `bindicator-card.js` as a real Lovelace
**module resource** when Home Assistant is using storage-mode dashboards.

The card URL is versioned as `/bindicator/bindicator-card.js?v=0.3.1` so
upgrades do not keep an old cached copy. YAML-mode dashboards still fall back
to Home Assistant's extra-JavaScript loader.


## v0.3.2

- Fixed the Bindicator card tile getting stuck on a loading spinner in Home Assistant's **Add card** picker.
- Disabled the unsupported live picker preview path; the card now opens the normal visual editor when selected.
- `getStubConfig()` now uses an available light entity when Home Assistant supplies state context.


## v0.3.3

- Added automatic cleanup of the Bindicator Lovelace resource.
- Removing the **last** Bindicator config entry now removes `/bindicator/bindicator-card.js?...` from **Settings → Dashboards → Resources**.
- Removing one Bindicator/WLED entry does **not** remove the shared frontend resource while other Bindicator entries still exist.
- The backend entities are unloaded before the shared frontend resource is cleaned up.


## v0.3.4

- Changed Home Assistant `integration_type` from `helper` to `device`.
- Bindicator should now appear as a normal integration under **Settings → Devices & services → Integrations** after it is configured.
- Keeps the unified frontend card, automatic WLED effect select, Lovelace resource registration, and resource cleanup behavior from previous versions.

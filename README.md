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

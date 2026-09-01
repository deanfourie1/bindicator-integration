

<div align="center">

# 🗑️ Bindicator

### A WLED-powered wheelie-bin indicator for Home Assistant

Turn a normal Home Assistant WLED light into a compact, animated bin-status card with direct brightness, colour and effect controls.

<br>

![Home Assistant](https://img.shields.io/badge/Home%20Assistant-Custom%20Integration-41BDF5?logo=homeassistant&logoColor=white)
![HACS](https://img.shields.io/badge/HACS-Custom%20Repository-41BDF5)
![Version](https://img.shields.io/badge/version-v0.3.4-orange)
![License](https://img.shields.io/badge/license-MIT-green)

**Animated effects · Visual editor · Automatic WLED effect helper · One HACS integration**

</div>

---

## 🎬 Demo

<img width="800" height="443" alt="bindicator-demo-ezgif com-video-to-gif-converter" src="https://github.com/user-attachments/assets/361e3772-f27a-41b0-b6c8-7e8e4f003c1f" />

More information and purchase can be found at https://deanfourie.me/product/bindicator/

---

## 🚀 Installation

### 1. Install with HACS

Add this repository to HACS as a **Custom Repository** using the **Integration** category:

```text
https://github.com/deanfourie1/bindicator-integration
```

Install **Bindicator**, then restart Home Assistant.

### 2. Add the Bindicator integration

Go to:

**Settings → Devices & services → Add Integration → Bindicator**

Select the WLED light you want Bindicator to use.

For example:

```text
light.wled_house
```

Bindicator automatically creates an effect entity such as:

```text
select.bindicator_wled_house_effect
```

No manual Template YAML is required.

### 3. Add the dashboard card

Edit a Home Assistant dashboard:

**Add card → Bindicator Card**

Choose your WLED light and the create WLED effects entity created when adding the integration.

When adding the device in Devices & Services, this creates a helper for your WLED light entity to change effects easily.

---

## 🎨 Dashboard Card

The card provides a compact bin display with controls alongside it.

### Controls

- **Brightness** — adjust WLED brightness directly.
- **Colour** — choose or drag across the colour control.
- **Effect** — select from the WLED effect list.
- **Power** — tap/click the bin itself to toggle the light.

When the light is off, the controls are visually dimmed and the bin glow is disabled.

---

## 🌈 Effects & Animation

Bindicator visually approximates common WLED effects using CSS animation.

Animation behaviour can respond to:

- power state
- brightness
- selected colour
- effect name
- WLED speed

> Home Assistant does not expose the live colour of every individual WLED pixel through the light entity, so animated effects are visual approximations rather than a frame-for-frame representation of the LEDs.

---

## ⚙️ Automatic Effect Entity

When Bindicator is configured for a WLED light, it creates a dedicated effect entity.

Example:

```text
light.wled_house
```

becomes:

```text
select.bindicator_wled_house_effect
```

The card detects this entity automatically.

Selecting an effect from the Bindicator card calls the underlying WLED light with the selected effect.

This replaces the older manual Template YAML approach.

---

## 🖼️ Images

The current card supports configurable bin artwork.

Default paths:

```text
/local/images/bin_base.png
/local/images/bin_glow_mask.png
```

Home Assistant exposes:

```text
/config/www/
```

as:

```text
/local/
```

The image paths can be changed from the Bindicator visual editor.

---

## 🛠️ Frontend

The dashboard card is bundled directly inside the integration:

```text
custom_components/bindicator/frontend/bindicator-card.js
```

Bindicator serves the card through:

```text
/bindicator/bindicator-card.js
```

and automatically registers it as a Home Assistant Lovelace module resource.

There is **no separate Bindicator dashboard HACS repository** to install.

---

## 🧹 Automatic Resource Cleanup

Bindicator manages its frontend resource automatically.

```text
Install / configure Bindicator
        │
        ▼
Register Bindicator Lovelace resource

Remove one Bindicator entry
        │
        ├── Other Bindicator entries exist → resource stays
        │
        └── Last Bindicator entry removed → resource removed
```

This prevents stale Bindicator JavaScript resources remaining in Home Assistant after the integration has been removed.

---

## 🧩 Example Card YAML

Normally the visual editor is all you need, but the card can also be configured manually:

```yaml
type: custom:bindicator-card
entity: light.wled_house
name: Bindicator
show_header: true
theme_mode: bindicator
```

The generated Bindicator effect entity is detected automatically when available.

---

## 🎨 Themes

Bindicator includes three appearance modes:

| Theme | Description |
|---|---|
| **Bindicator** | Original Bindicator orange/blue styling |
| **System / Home Assistant** | Follows the active Home Assistant theme |
| **Custom** | Configure accent, secondary accent, control background and text colours |

The default is **Bindicator**.

---

## 📦 Repository Layout

```text
bindicator-integration/
├── README.md
├── hacs.json
├── assets/
│   └── bindicator-demo.mov
└── custom_components/
    └── bindicator/
        ├── __init__.py
        ├── config_flow.py
        ├── const.py
        ├── manifest.json
        ├── select.py
        ├── strings.json
        ├── translations/
        │   └── en.json
        └── frontend/
            └── bindicator-card.js
```

---

## 🔄 Updating

Update Bindicator through HACS and restart Home Assistant when requested.

The frontend resource URL is versioned so Home Assistant does not continue using an old cached copy of the card after an update.

---

<details>
<summary><strong>📋 Version history</strong></summary>

### v0.3.4

- Changed Home Assistant `integration_type` from `helper` to `device`.
- Bindicator appears as a normal integration under **Settings → Devices & services → Integrations**.
- Automatic WLED effect helper remains unchanged.

### v0.3.3

- Added automatic Lovelace resource cleanup.
- Removing the last Bindicator config entry removes the Bindicator frontend resource.
- The shared resource remains while another Bindicator entry still exists.

### v0.3.2

- Fixed the Bindicator card tile getting stuck on a loading spinner in the Home Assistant card picker.
- Disabled the problematic live picker preview.
- Improved default card configuration.

### v0.3.1

- Bindicator now registers its bundled frontend as a real Lovelace module resource.
- Added versioned frontend URLs to prevent stale browser caching.

</details>

---

## 🐛 Issues & Feature Requests

Found a problem or have an idea for Bindicator?

Use the repository's **Issues** section to report bugs or suggest improvements.

---

## 📄 License

MIT

---

<div align="center">

### Built for Home Assistant + WLED

**Bindicator**

</div>

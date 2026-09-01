/*
 * Bindicator Card
 * Animated WLED wheelie-bin card for Home Assistant.
 * Version: 0.2.2
 * License: MIT
 */

const BINDICATOR_VERSION = "0.3.3";

const DEFAULT_CONFIG = {
  name: "Bindicator",
  show_header: true,
  theme_mode: "bindicator",
  custom_accent: "#ff9800",
  custom_secondary_accent: "#2196f3",
  custom_control_background: "#e9eef6",
  custom_text_color: "",
  size: "medium",
  custom_size: 180,
  controls_position: "right",
  show_controls: true,
  show_brightness: true,
  show_color: true,
  show_effect: true,
  animations: true,
  bin_image: "/local/images/bin_base.png",
  bin_mask: "/local/images/bin_glow_mask.png",
};

const SIZE_MAP = {
  small: 120,
  medium: 180,
  large: 240,
  xlarge: 320,
};

class BindicatorCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = null;
    this._lastSignature = "";
  }

  static getConfigElement() {
    return document.createElement("bindicator-card-editor");
  }

  static getStubConfig(hass) {
    const firstLight = hass
      ? Object.keys(hass.states || {}).find((entityId) => entityId.startsWith("light."))
      : undefined;

    return {
      ...DEFAULT_CONFIG,
      entity: firstLight || "",
    };
  }

  static getCardSize() {
    return 4;
  }

  _effectMenuOpen = false;
  _pendingRender = false;

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("Bindicator Card requires a light entity.");
    }

    this._config = { ...DEFAULT_CONFIG, ...config };
    this._render(true);
  }

  set hass(hass) {
    this._hass = hass;

    // Do not destroy/recreate the <ha-select> while its popup is open.
    // WLED/HA state updates can arrive frequently; replacing shadowRoot
    // closes the dropdown immediately.
    if (this._effectMenuOpen) {
      this._pendingRender = true;
      return;
    }

    this._render(false);
  }

  getCardSize() {
    return 4;
  }

  _state(entityId) {
    return entityId && this._hass ? this._hass.states[entityId] : undefined;
  }

  _resolvedEffectEntity() {
    const configured = String(this._config?.effect_entity || "").trim();
    if (configured && this._state(configured)) return configured;

    const lightEntity = String(this._config?.entity || "").trim();
    if (!lightEntity.includes(".")) return configured;

    const objectId = lightEntity
      .split(".", 2)[1]
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const generated = `select.bindicator_${objectId}_effect`;
    if (this._state(generated)) return generated;

    return configured;
  }

  _sizePx() {
    const size = this._config?.size ?? "medium";
    if (size === "custom") {
      const custom = Number(this._config?.custom_size ?? 180);
      return Math.max(80, Math.min(600, Number.isFinite(custom) ? custom : 180));
    }
    return SIZE_MAP[size] ?? SIZE_MAP.medium;
  }

  _effectName(light) {
    const effectState = this._state(this._resolvedEffectEntity());
    return (effectState?.state || light?.attributes?.effect || "Solid").toLowerCase();
  }

  _speedValue() {
    const speedState = this._state(this._config.speed_entity);
    const raw = Number(speedState?.state ?? 128);
    return Math.max(0, Math.min(255, Number.isFinite(raw) ? raw : 128));
  }

  _visualState(light) {
    const on = light?.state === "on";
    const rgb = light?.attributes?.rgb_color || [255, 128, 0];
    const color = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    const brightness = Number(light?.attributes?.brightness ?? 255);
    const brightnessPct = Math.max(0, Math.min(1, brightness / 255));
    const fillOpacity = on ? 0.12 + brightnessPct * 0.68 : 0;
    const speed = this._speedValue();
    const speedPct = speed / 255;
    const duration = 8 - speedPct * 7.65;
    const durationFast = Math.max(0.12, duration * 0.45);
    const durationMedium = Math.max(0.18, duration * 0.7);
    const durationSlow = Math.max(0.25, duration);
    const effect = this._effectName(light);

    let background = color;
    let backgroundSize = "100% 100%";
    let animation = "none";

    const rainbow = "linear-gradient(90deg,#ff0000 0%,#ff8800 12%,#ffff00 25%,#00ff00 38%,#00ffff 50%,#0088ff 62%,#5500ff 75%,#ff00ff 88%,#ff0000 100%)";

    if (effect.includes("rainbow") || effect.includes("colorloop")) {
      background = rainbow;
      backgroundSize = "400% 100%";
      animation = `bindicatorRainbow ${durationSlow}s linear infinite`;
    } else if (effect.includes("fire")) {
      background = "linear-gradient(0deg,#aa0000 0%,#ff2200 20%,#ff6600 45%,#ffaa00 70%,#ffff66 100%)";
      backgroundSize = "100% 220%";
      animation = `bindicatorFire ${durationMedium}s ease-in-out infinite`;
    } else if (effect.includes("breathe") || effect.includes("breath") || effect.includes("pulse") || effect.includes("fade")) {
      animation = `bindicatorBreathe ${durationSlow}s ease-in-out infinite`;
    } else if (effect.includes("blink")) {
      animation = `bindicatorBlink ${durationMedium}s step-end infinite`;
    } else if (effect.includes("strobe")) {
      animation = `bindicatorStrobe ${durationFast}s step-end infinite`;
    } else if (effect.includes("chase")) {
      background = "linear-gradient(90deg,transparent 0%,#ff0000 10%,#ff8800 18%,#ffff00 26%,#00ff00 34%,#00ffff 42%,#0088ff 50%,#5500ff 58%,#ff00ff 66%,transparent 76%)";
      backgroundSize = "300% 100%";
      animation = `bindicatorChase ${durationMedium}s linear infinite`;
    } else if (effect.includes("running")) {
      background = rainbow;
      backgroundSize = "300% 100%";
      animation = `bindicatorRunning ${durationMedium}s linear infinite`;
    } else if (effect.includes("wipe")) {
      background = "linear-gradient(90deg,transparent 0%,#ff0000 20%,#ffff00 32%,#00ff00 44%,#00ffff 56%,#0000ff 68%,#ff00ff 80%,transparent 100%)";
      backgroundSize = "300% 100%";
      animation = `bindicatorWipe ${durationMedium}s linear infinite`;
    } else if (effect.includes("twinkle") || effect.includes("sparkle") || effect.includes("glitter")) {
      background = "radial-gradient(circle at 15% 20%,#ffff00 0%,transparent 7%),radial-gradient(circle at 70% 25%,#00ffff 0%,transparent 7%),radial-gradient(circle at 35% 55%,#ff00ff 0%,transparent 6%),radial-gradient(circle at 75% 75%,#00ff00 0%,transparent 7%),radial-gradient(circle at 25% 80%,#ff5500 0%,transparent 6%),linear-gradient(135deg,#ff0000,#0000ff)";
      animation = `bindicatorTwinkle ${durationFast}s ease-in-out infinite`;
    } else if (effect.includes("candle")) {
      background = "linear-gradient(0deg,#ff4400,#ff8800,#ffcc44,#fff0aa)";
      animation = `bindicatorCandle ${durationFast}s ease-in-out infinite`;
    } else if (effect.includes("scan") || effect.includes("larson")) {
      background = "linear-gradient(90deg,transparent 0%,transparent 30%,#ff0000 36%,#ffff00 42%,#00ff00 46%,#ffffff 50%,#00ffff 54%,#0000ff 58%,#ff00ff 64%,transparent 70%,transparent 100%)";
      backgroundSize = "250% 100%";
      animation = `bindicatorScan ${durationMedium}s ease-in-out infinite alternate`;
    } else if (effect.includes("colorful") || effect.includes("colourful") || effect.includes("multi")) {
      background = rainbow;
      backgroundSize = "350% 100%";
      animation = `bindicatorRainbow ${durationSlow}s linear infinite`;
    }

    if (!this._config.animations || !on) animation = "none";

    return { on, color, fillOpacity, background, backgroundSize, animation, effect, speed };
  }

  _signature(light) {
    const cfg = this._config || {};
    const effectState = this._state(this._resolvedEffectEntity());
    const speedState = this._state(cfg.speed_entity);
    return JSON.stringify({
      cfg,
      light: light ? {
        state: light.state,
        brightness: light.attributes?.brightness,
        rgb: light.attributes?.rgb_color,
        effect: light.attributes?.effect,
        effects: light.attributes?.effect_list,
      } : null,
      effect: effectState?.state,
      effectOptions: effectState?.attributes?.options,
      speed: speedState?.state,
    });
  }

  _render(force) {
    if (!this.shadowRoot || !this._config) return;

    const light = this._state(this._config.entity);
    if (!this._hass) {
      this.shadowRoot.innerHTML = this._shell("Waiting for Home Assistant…");
      return;
    }
    if (!light) {
      this.shadowRoot.innerHTML = this._shell(`Entity not found: ${this._config.entity}`);
      return;
    }

    const signature = this._signature(light);
    if (!force && signature === this._lastSignature) return;
    this._lastSignature = signature;

    const visual = this._visualState(light);
    const size = this._sizePx();
    const maskUrl = this._absoluteAssetUrl(this._config.bin_mask);
    const position = this._config.controls_position === "below" ? "below" : "right";
    const layoutClass = position === "below" ? "layout below" : "layout right";
    const brightness = Math.max(0, Math.min(255, Number(light.attributes?.brightness ?? 255)));
    const effectState = this._state(this._resolvedEffectEntity());
    const effectOptions = effectState?.attributes?.options || light.attributes?.effect_list || [];
    const currentEffect = effectState?.state || light.attributes?.effect || "Solid";
    const isOn = light.state === "on";
    const brightnessPct = isOn
      ? Math.max(0, Math.min(100, Math.round((brightness / 255) * 100)))
      : 0;
    const speedValue = this._config.speed_entity
      ? (this._state(this._config.speed_entity)?.state ?? "–")
      : "–";
    const hue = Math.max(0, Math.min(360, Number(light.attributes?.hs_color?.[0] ?? 0)));
    const huePct = (hue / 360) * 100;

    const themeMode = this._config.theme_mode || "bindicator";
    const themeVars = themeMode === "system"
      ? `
        --bindicator-accent:var(--primary-color);
        --bindicator-secondary-accent:var(--info-color,var(--primary-color));
        --bindicator-control-bg:var(--secondary-background-color,rgba(127,127,127,.12));
        --bindicator-text:var(--primary-text-color);
        --bindicator-secondary-text:var(--secondary-text-color);
      `
      : themeMode === "custom"
        ? `
          --bindicator-accent:${this._escapeAttr(this._config.custom_accent || "#ff9800")};
          --bindicator-secondary-accent:${this._escapeAttr(this._config.custom_secondary_accent || "#2196f3")};
          --bindicator-control-bg:${this._escapeAttr(this._config.custom_control_background || "#e9eef6")};
          --bindicator-text:${this._escapeAttr(this._config.custom_text_color || "var(--primary-text-color)")};
          --bindicator-secondary-text:${this._escapeAttr(this._config.custom_text_color || "var(--secondary-text-color)")};
        `
        : `
          --bindicator-accent:#ff9800;
          --bindicator-secondary-accent:#2196f3;
          --bindicator-control-bg:#e9eef6;
          --bindicator-text:var(--primary-text-color);
          --bindicator-secondary-text:var(--secondary-text-color);
        `;

    this.shadowRoot.innerHTML = `
      <style>${this._styles()}${this._animationStyles(visual.fillOpacity)}</style>
      <ha-card class="${isOn ? "is-on" : "is-off"}" style="${themeVars}">
        ${this._config.show_header !== false ? `
          <div class="header">
            <div class="title">${this._escape(this._config.name || "Bindicator")}</div>
            <div class="status">
              <span><ha-icon icon="mdi:brightness-6"></ha-icon>${brightnessPct}%</span>
              <span><ha-icon icon="mdi:creation"></ha-icon>${this._escape(currentEffect)}</span>
              <span><ha-icon icon="mdi:speedometer"></ha-icon>${this._escape(speedValue)}</span>
            </div>
          </div>
        ` : ""}

        <div class="${layoutClass}">
          <button class="bin-button" type="button" title="Toggle ${this._escape(light.attributes?.friendly_name || this._config.entity)}" aria-label="Toggle ${this._escape(light.attributes?.friendly_name || this._config.entity)}">
            <div class="bin" style="width:${size}px;max-width:100%;">
              <img class="bin-base" src="${this._escapeAttr(this._config.bin_image)}" alt="Wheelie bin">
              <div class="bin-overlay" style="
                background:${visual.background};
                background-size:${visual.backgroundSize};
                background-position:center;

                animation:${visual.on ? visual.animation : "none"};

                -webkit-mask-image:url('${this._escapeCssUrl(maskUrl)}');
                -webkit-mask-repeat:no-repeat;
                -webkit-mask-position:center;
                -webkit-mask-size:contain;

                -webkit-mask:
                  url('${this._escapeCssUrl(maskUrl)}')
                  center
                  center
                  / contain
                  no-repeat;

                mask-image:url('${this._escapeCssUrl(maskUrl)}');
                mask-repeat:no-repeat;
                mask-position:center;
                mask-size:contain;

                mask:
                  url('${this._escapeCssUrl(maskUrl)}')
                  center
                  center
                  / contain
                  no-repeat;

                opacity:${visual.fillOpacity};

                -webkit-transform:translateZ(0);
                transform:translateZ(0);

                -webkit-backface-visibility:hidden;
                backface-visibility:hidden;

                will-change:
                  opacity,
                  background-position,
                  filter;

                pointer-events:none;
              "></div>
            </div>
          </button>

          ${this._config.show_controls ? `
            <div class="controls">
              ${this._config.show_brightness ? `
                <div class="control-row brightness-row" title="Brightness">
                  <span class="icon-bubble orange"><ha-icon icon="mdi:brightness-6"></ha-icon></span>
                  <input id="brightness" type="range" min="1" max="255" value="${brightness}" style="--brightness-pct:${brightnessPct}%;" aria-label="Brightness">
                </div>
              ` : ""}

              ${this._config.show_color ? `
                <div class="control-row color-row" title="Colour">
                  <button id="color_info" class="icon-bubble orange icon-button" type="button" title="Open colour controls" aria-label="Open colour controls">
                    <ha-icon icon="mdi:palette"></ha-icon>
                  </button>
                  <div id="color_picker" class="color-preview" role="slider" aria-label="Colour" aria-valuemin="0" aria-valuemax="360" aria-valuenow="${Math.round(hue)}" tabindex="0">
                    <span class="color-marker" style="left:${huePct}%"></span>
                  </div>
                </div>
              ` : ""}

              ${this._config.show_effect ? `
                <div class="control-row effect-row" title="Effect">
                  <span class="icon-bubble blue"><ha-icon icon="mdi:creation"></ha-icon></span>
                  <select id="effect" class="effect-select" aria-label="Effect" ${effectOptions.length ? "" : "disabled"}>
                    ${effectOptions.length
                      ? effectOptions.map(option => `<option value="${this._escapeAttr(option)}" ${option === currentEffect ? "selected" : ""}>${this._escape(option)}</option>`).join("")
                      : `<option value="${this._escapeAttr(currentEffect)}">${this._escape(currentEffect)}</option>`}
                  </select>
                </div>
              ` : ""}
            </div>
          ` : ""}
        </div>
      </ha-card>
    `;

    this._bindEvents();
  }

  _shell(message) {
    return `<ha-card><div style="padding:16px">${this._escape(message)}</div></ha-card>`;
  }

  _styles() {
    return `
      :host { display:block; }
      ha-card {
        overflow:visible;
        background:transparent;
        border:none;
        box-shadow:none;
        padding:12px 14px 10px;
      }

      .header {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin-bottom:8px;
        min-width:0;
      }
      .title {
        font-size:14px;
        line-height:1.2;
        font-weight:700;
        color:var(--bindicator-text,var(--primary-text-color));
        white-space:nowrap;
      }
      .status {
        display:flex;
        align-items:center;
        justify-content:flex-end;
        gap:8px;
        min-width:0;
        font-size:12px;
        color:var(--bindicator-secondary-text,var(--secondary-text-color));
        white-space:nowrap;
      }
      .status span {
        display:inline-flex;
        align-items:center;
        gap:3px;
        min-width:0;
      }
      .status ha-icon { --mdc-icon-size:13px; }

      .layout { display:grid; align-items:center; gap:12px; }
      .layout.right { grid-template-columns:minmax(0,47%) minmax(0,53%); }
      .layout.below { grid-template-columns:1fr; justify-items:center; }

      .bin-button {
        appearance:none;
        border:0;
        padding:0;
        margin:0;
        background:transparent;
        cursor:pointer;
        width:100%;
        display:flex;
        justify-content:center;
        align-items:center;
      }
      .bin { position:relative; }
      .bin-base { width:100%; height:auto; display:block; position:relative; z-index:1; }
      .bin-overlay {
        position:absolute;
        inset:0;
        z-index:2;
        background-position:center;
        -webkit-mask-repeat:no-repeat;
        mask-repeat:no-repeat;
        -webkit-mask-size:contain;
        mask-size:contain;
        -webkit-mask-position:center;
        mask-position:center;
        pointer-events:none;
      }

      .controls {
        width:100%;
        display:flex;
        flex-direction:column;
        gap:7px;
        min-width:0;
        position:relative;
        z-index:10;
        overflow:visible;
      }
      .control-row {
        min-height:42px;
        box-sizing:border-box;
        display:grid;
        grid-template-columns:34px minmax(0,1fr);
        align-items:center;
        gap:6px;
        padding:3px 7px 3px 5px;
        border-radius:999px;
        background:var(--bindicator-control-bg,var(--secondary-background-color,rgba(127,127,127,.12)));
        border:0;
        color:var(--bindicator-text,var(--primary-text-color));
      }
      .button-row {
        width:100%;
        font:inherit;
        cursor:pointer;
        text-align:left;
      }
      .icon-button {
        appearance:none;
        border:0;
        padding:0;
        cursor:pointer;
        font:inherit;
      }
      .icon-bubble {
        width:30px;
        height:30px;
        border-radius:50%;
        display:grid;
        place-items:center;
        justify-self:center;
      }
      .icon-bubble ha-icon { --mdc-icon-size:18px; }
      .icon-bubble.orange {
        background:color-mix(in srgb, var(--bindicator-accent,#ff9800) 16%, transparent);
        color:var(--bindicator-accent,#ff9800);
      }
      .icon-bubble.blue {
        background:color-mix(in srgb, var(--bindicator-secondary-accent,#2196f3) 16%, transparent);
        color:var(--bindicator-secondary-accent,#2196f3);
      }

      input[type="range"] {
        -webkit-appearance:none;
        appearance:none;
        width:100%;
        min-width:0;
        height:30px;
        margin:0;
        border-radius:999px;
        outline:none;
        background:
          linear-gradient(
            to right,
            var(--bindicator-accent,#ff9800) 0%,
            var(--bindicator-accent,#ff9800) var(--brightness-pct),
            color-mix(in srgb, var(--bindicator-accent,#ff9800) 26%, transparent) var(--brightness-pct),
            color-mix(in srgb, var(--bindicator-accent,#ff9800) 26%, transparent) 100%
          );
        cursor:pointer;
      }
      input[type="range"]::-webkit-slider-runnable-track {
        height:30px;
        border-radius:999px;
        background:transparent;
      }
      input[type="range"]::-moz-range-track {
        height:30px;
        border-radius:999px;
        background:transparent;
      }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance:none;
        appearance:none;
        width:1px;
        height:30px;
        background:transparent;
        border:0;
      }
      input[type="range"]::-moz-range-thumb {
        width:1px;
        height:30px;
        background:transparent;
        border:0;
      }

      .color-preview {
        position:relative;
        display:block;
        cursor:crosshair;
        touch-action:none;
        height:30px;
        border-radius:999px;
        overflow:visible;
        background:linear-gradient(
          90deg,
          #ff0000 0%,
          #ffff00 16.6%,
          #00ff00 33.3%,
          #00ffff 50%,
          #0000ff 66.6%,
          #ff00ff 83.3%,
          #ff0000 100%
        );
        border:1px solid rgba(127,127,127,.18);
      }
      .color-marker {
        position:absolute;
        top:-2px;
        bottom:-2px;
        width:8px;
        transform:translateX(-50%);
        border-radius:4px;
        background:#fff;
        border:1px solid rgba(0,0,0,.22);
        box-shadow:0 1px 2px rgba(0,0,0,.22);
        pointer-events:none;
      }

      .effect-select {
        width:100%;
        min-width:0;
        height:30px;
        min-height:30px;
        box-sizing:border-box;
        padding:0 28px 0 10px;
        border:0;
        border-radius:7px;
        outline:0;
        background:var(--card-background-color,#fff);
        color:var(--bindicator-text,var(--primary-text-color));
        font:inherit;
        font-size:13px;
        line-height:30px;
        cursor:pointer;
      }
      .effect-select:focus {
        outline:1px solid color-mix(in srgb, var(--bindicator-accent,#ff9800) 45%, transparent);
      }

      /* OFF state: keep controls available but make them clearly inactive. */
      ha-card.is-off .icon-bubble {
        background:rgba(127,127,127,.12) !important;
        color:var(--disabled-text-color,var(--secondary-text-color)) !important;
      }
      ha-card.is-off input[type="range"] {
        background:rgba(127,127,127,.18);
      }
      ha-card.is-off .color-preview {
        filter:grayscale(1);
        opacity:.28;
      }
      ha-card.is-off .color-marker {
        opacity:.45;
      }
      ha-card.is-off .effect-select {
        color:var(--disabled-text-color,var(--secondary-text-color));
        background:color-mix(in srgb, var(--card-background-color,#fff) 72%, var(--disabled-color,#888) 28%);
      }
      ha-card.is-off .control-row {
        color:var(--disabled-text-color,var(--secondary-text-color));
      }

      @media (max-width:430px) {
        ha-card { padding:10px; }
        .header { gap:6px; }
        .status { gap:5px; font-size:11px; }
        .layout.right { grid-template-columns:minmax(0,46%) minmax(0,54%); gap:6px; }
        .control-row { padding-right:6px; }
      }

    `;
  }

  _bindEvents() {
    const bin = this.shadowRoot.querySelector(".bin-button");
    bin?.addEventListener("click", () => {
      this._hass.callService("light", "toggle", { entity_id: this._config.entity });
    });

    const brightness = this.shadowRoot.getElementById("brightness");
    brightness?.addEventListener("change", (ev) => {
      const value = Math.max(1, Math.min(255, Number(ev.target.value)));
      this._hass.callService("light", "turn_on", { entity_id: this._config.entity, brightness: value });
    });

    const colorInfo = this.shadowRoot.getElementById("color_info");
    colorInfo?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this._fireMoreInfo(this._config.entity);
    });

    const colorPicker = this.shadowRoot.getElementById("color_picker");
    if (colorPicker) {
      let dragging = false;
      let lastHue = null;
      let lastSentAt = 0;

      const sendHue = (hue, force = false) => {
        const now = performance.now();
        const rounded = Math.max(0, Math.min(360, Math.round(hue)));

        // Update the marker immediately for responsive dragging.
        const marker = colorPicker.querySelector(".color-marker");
        if (marker) marker.style.left = `${(rounded / 360) * 100}%`;
        colorPicker.setAttribute("aria-valuenow", String(rounded));

        // Throttle service calls while dragging, but always send the final value.
        if (!force && lastHue === rounded) return;
        if (!force && now - lastSentAt < 60) return;

        lastHue = rounded;
        lastSentAt = now;

        this._hass.callService("light", "turn_on", {
          entity_id: this._config.entity,
          hs_color: [rounded, 100],
        });
      };

      const hueFromPointer = (ev) => {
        const rect = colorPicker.getBoundingClientRect();
        if (!rect.width) return 0;
        const x = Math.max(0, Math.min(rect.width, ev.clientX - rect.left));
        return (x / rect.width) * 360;
      };

      colorPicker.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        dragging = true;
        colorPicker.setPointerCapture?.(ev.pointerId);
        sendHue(hueFromPointer(ev), true);
      });

      colorPicker.addEventListener("pointermove", (ev) => {
        if (!dragging) return;
        ev.preventDefault();
        ev.stopPropagation();
        sendHue(hueFromPointer(ev));
      });

      const finishDrag = (ev) => {
        if (!dragging) return;
        ev.preventDefault();
        ev.stopPropagation();
        dragging = false;
        sendHue(hueFromPointer(ev), true);
        try {
          colorPicker.releasePointerCapture?.(ev.pointerId);
        } catch (_err) {}
      };

      colorPicker.addEventListener("pointerup", finishDrag);
      colorPicker.addEventListener("pointercancel", (ev) => {
        ev.stopPropagation();
        dragging = false;
      });

      colorPicker.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
      });

      colorPicker.addEventListener("keydown", (ev) => {
        if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
        ev.preventDefault();
        ev.stopPropagation();

        const current = Number(colorPicker.getAttribute("aria-valuenow") || 0);
        const next = current + (ev.key === "ArrowRight" ? 5 : -5);
        sendHue(next, true);
      });
    }

    const effect = this.shadowRoot.getElementById("effect");

    if (effect) {
      const beginInteraction = (ev) => {
        ev.stopPropagation();
        this._effectMenuOpen = true;
      };

      effect.addEventListener("pointerdown", beginInteraction);
      effect.addEventListener("mousedown", beginInteraction);
      effect.addEventListener("focus", () => {
        this._effectMenuOpen = true;
      });

      effect.addEventListener("change", (ev) => {
        ev.stopPropagation();
        const option = ev.target.value;
        if (!option) return;

        const effectEntity = this._resolvedEffectEntity();
        if (effectEntity) {
          this._hass.callService("select", "select_option", {
            entity_id: effectEntity,
            option,
          });
        } else {
          this._hass.callService("light", "turn_on", {
            entity_id: this._config.entity,
            effect: option,
          });
        }

        this._effectMenuOpen = false;
        if (this._pendingRender) {
          this._pendingRender = false;
          requestAnimationFrame(() => this._render(false));
        }
      });

      effect.addEventListener("blur", () => {
        this._effectMenuOpen = false;
        if (this._pendingRender) {
          this._pendingRender = false;
          requestAnimationFrame(() => this._render(false));
        }
      });
    }
  }

  _fireMoreInfo(entityId) {
    const event = new CustomEvent("hass-more-info", {
      detail: { entityId },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  _escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
  }

  _escapeAttr(value) {
    return this._escape(value);
  }

  _escapeCssUrl(value) {
    return String(value ?? "").replace(/['\\]/g, "\\$&");
  }

  _absoluteAssetUrl(value) {
    const url = String(value ?? "");
    if (!url) return "";
    try {
      return new URL(url, window.location.origin).href;
    } catch (_err) {
      return url;
    }
  }

  _animationStyles(fillOpacity) {
    const o = Number(fillOpacity || 0);
    return `
      @keyframes bindicatorRainbow {
        0% { background-position: 0% 50%; }
        100% { background-position: 400% 50%; }
      }

      @keyframes bindicatorFire {
        0% { background-position: 50% 100%; filter: brightness(0.85); }
        25% { background-position: 50% 65%; filter: brightness(1.2); }
        55% { background-position: 50% 90%; filter: brightness(0.95); }
        80% { background-position: 50% 45%; filter: brightness(1.25); }
        100% { background-position: 50% 100%; filter: brightness(1.05); }
      }

      @keyframes bindicatorBreathe {
        0% { opacity: ${o * 0.25}; }
        50% { opacity: ${o}; }
        100% { opacity: ${o * 0.25}; }
      }

      @keyframes bindicatorBlink {
        0%, 49% { opacity: ${o}; }
        50%, 100% { opacity: 0.02; }
      }

      @keyframes bindicatorStrobe {
        0%, 20% { opacity: ${o}; }
        21%, 100% { opacity: 0.01; }
      }

      @keyframes bindicatorChase {
        0% { background-position: 300% 50%; }
        100% { background-position: -300% 50%; }
      }

      @keyframes bindicatorRunning {
        0% { background-position: 300% 50%; }
        100% { background-position: -300% 50%; }
      }

      @keyframes bindicatorWipe {
        0% { background-position: 300% 50%; }
        100% { background-position: -300% 50%; }
      }

      @keyframes bindicatorTwinkle {
        0% { opacity: ${o * 0.55}; filter: brightness(0.8); }
        20% { opacity: ${o}; filter: brightness(1.45); }
        45% { opacity: ${o * 0.65}; filter: brightness(0.95); }
        70% { opacity: ${o}; filter: brightness(1.3); }
        100% { opacity: ${o * 0.7}; filter: brightness(1); }
      }

      @keyframes bindicatorCandle {
        0% { opacity: ${o * 0.72}; filter: brightness(0.85); }
        20% { opacity: ${o}; filter: brightness(1.15); }
        45% { opacity: ${o * 0.78}; filter: brightness(0.92); }
        65% { opacity: ${o}; filter: brightness(1.22); }
        85% { opacity: ${o * 0.82}; filter: brightness(0.95); }
        100% { opacity: ${o * 0.75}; filter: brightness(1.05); }
      }

      @keyframes bindicatorScan {
        0% { background-position: 200% 50%; }
        100% { background-position: -200% 50%; }
      }
    `;
  }
}

class BindicatorCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = null;
  }

  setConfig(config) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;

    // Home Assistant assigns `hass` very frequently. Rebuilding the entire
    // editor on every assignment destroys dropdowns and switches while the
    // user is interacting with them.
    if (!this.shadowRoot || !this.shadowRoot.querySelector(".editor")) {
      this._render();
      return;
    }

    this.shadowRoot.querySelector(".editor")?.addEventListener("pointerdown", (ev) => {
      ev.stopPropagation();
    });

    for (const id of ["entity", "effect_entity", "speed_entity"]) {
      const picker = this.shadowRoot.getElementById(id);
      if (picker) picker.hass = hass;
    }
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        .editor { display:grid; gap:16px; padding:8px 0; }
        .section { display:grid; gap:12px; }
        .section-title { font-weight:600; color:var(--bindicator-text,var(--primary-text-color)); }
        .row { display:grid; gap:8px; }
        .two { grid-template-columns:repeat(2,minmax(0,1fr)); }
        .switch-row { display:flex; align-items:center; justify-content:space-between; gap:16px; min-height:40px; }
        label { color:var(--primary-text-color); }
        .field { display:grid; gap:6px; }
        .field-label { font-size:12px; color:var(--secondary-text-color); }
        .text-input {
          width:100%;
          box-sizing:border-box;
          min-height:44px;
          padding:0 12px;
          border:1px solid var(--divider-color,rgba(127,127,127,.35));
          border-radius:8px;
          outline:none;
          background:var(--card-background-color,#fff);
          color:var(--primary-text-color);
          font:inherit;
        }
        .text-input:focus { border-color:var(--primary-color); }
        .hidden { display:none !important; }
        ha-textfield, ha-select, ha-entity-picker { width:100%; }
        @media (max-width:520px) { .two { grid-template-columns:1fr; } }
      </style>
      <div class="editor">
        <div class="section">
          <div class="section-title">Entities</div>
          <ha-entity-picker id="entity" label="Light entity" value="${this._escapeAttr(this._config.entity || "")}" include-domains='["light"]' allow-custom-entity></ha-entity-picker>
          <ha-entity-picker id="effect_entity" label="Effect select entity (optional)" value="${this._escapeAttr(this._config.effect_entity || "")}" include-domains='["select"]' allow-custom-entity></ha-entity-picker>
          <ha-entity-picker id="speed_entity" label="WLED speed entity (optional)" value="${this._escapeAttr(this._config.speed_entity || "")}" include-domains='["number"]' allow-custom-entity></ha-entity-picker>
        </div>

        <div class="section">
          <div class="section-title">Appearance</div>
          <div class="field">
            <label class="field-label" for="name">Card title</label>
            <input
              id="name"
              class="text-input"
              type="text"
              value="${this._escapeAttr(this._config.name || "Bindicator")}"
              placeholder="Bindicator"
              autocomplete="off"
            >
          </div>
          ${this._switch("show_header", "Show title / heading bar")}
          <ha-select id="theme_mode" label="Theme"></ha-select>
          <div id="custom_theme_fields" class="${(this._config.theme_mode || "bindicator") === "custom" ? "" : "hidden"}">
            <div class="row two">
              <ha-textfield id="custom_accent" label="Accent colour" value="${this._escapeAttr(this._config.custom_accent || "#ff9800")}"></ha-textfield>
              <ha-textfield id="custom_secondary_accent" label="Secondary accent" value="${this._escapeAttr(this._config.custom_secondary_accent || "#2196f3")}"></ha-textfield>
            </div>
            <div class="row two">
              <ha-textfield id="custom_control_background" label="Control background" value="${this._escapeAttr(this._config.custom_control_background || "#e9eef6")}"></ha-textfield>
              <ha-textfield id="custom_text_color" label="Text colour (optional)" value="${this._escapeAttr(this._config.custom_text_color || "")}"></ha-textfield>
            </div>
          </div>
          <div class="row two">
            <ha-select id="size" label="Bin size"></ha-select>
            ${this._config.size === "custom" ? `<ha-textfield id="custom_size" label="Custom width (px)" type="number" min="80" max="600" value="${Number(this._config.custom_size || 180)}"></ha-textfield>` : ""}
          </div>
          <ha-select id="controls_position" label="Controls position"></ha-select>
          <ha-textfield id="bin_image" label="Bin image URL" value="${this._escapeAttr(this._config.bin_image)}"></ha-textfield>
          <ha-textfield id="bin_mask" label="Glow mask URL" value="${this._escapeAttr(this._config.bin_mask)}"></ha-textfield>
        </div>

        <div class="section">
          <div class="section-title">Controls</div>
          ${this._switch("show_controls", "Show controls")}
          ${this._switch("show_brightness", "Show brightness")}
          ${this._switch("show_color", "Show colour")}
          ${this._switch("show_effect", "Show effect")}
          ${this._switch("animations", "Enable animations")}
        </div>
      </div>
    `;

    for (const id of ["entity", "effect_entity", "speed_entity"]) {
      const el = this.shadowRoot.getElementById(id);
      if (!el) continue;
      el.hass = this._hass;
      el.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._setValue(id, ev.detail?.value ?? ev.target.value);
      });
    }

    const sizeSelect = this.shadowRoot.getElementById("size");
    if (sizeSelect) {
      sizeSelect.options = [
        { value: "small", label: "Small" },
        { value: "medium", label: "Medium" },
        { value: "large", label: "Large" },
        { value: "xlarge", label: "Extra large" },
        { value: "custom", label: "Custom" },
      ];
      sizeSelect.value = this._config.size || "medium";
      sizeSelect.addEventListener("selected", (ev) => {
        ev.stopPropagation();
        this._setValue("size", ev.detail?.value ?? ev.target.value);
      });
    }

    const themeSelect = this.shadowRoot.getElementById("theme_mode");
    if (themeSelect) {
      themeSelect.options = [
        { value: "bindicator", label: "Bindicator" },
        { value: "system", label: "System / Home Assistant" },
        { value: "custom", label: "Custom" },
      ];
      themeSelect.value = this._config.theme_mode || "bindicator";
      themeSelect.addEventListener("selected", (ev) => {
        ev.stopPropagation();
        this._setValue("theme_mode", ev.detail?.value ?? ev.target.value);
      });
    }

    const positionSelect = this.shadowRoot.getElementById("controls_position");
    if (positionSelect) {
      positionSelect.options = [
        { value: "right", label: "Right" },
        { value: "below", label: "Below" },
      ];
      positionSelect.value = this._config.controls_position || "right";
      positionSelect.addEventListener("selected", (ev) => {
        ev.stopPropagation();
        this._setValue("controls_position", ev.detail?.value ?? ev.target.value);
      });
    }

    for (const id of ["name", "custom_accent", "custom_secondary_accent", "custom_control_background", "custom_text_color", "bin_image", "bin_mask", "custom_size"]) {
      const el = this.shadowRoot.getElementById(id);
      if (!el) continue;

      const commit = (ev) => {
        ev.stopPropagation();
        this._setValue(id, ev.detail?.value ?? ev.target.value);
      };

      // Commit text fields only when editing is finished.
      // Emitting config-changed on every keystroke causes Home Assistant
      // to rebuild the editor and steal focus from the input.
      el.addEventListener("change", commit);
    }

    for (const id of ["show_header", "show_controls", "show_brightness", "show_color", "show_effect", "animations"]) {
      const el = this.shadowRoot.getElementById(id);
      el?.addEventListener("change", (ev) => {
        ev.stopPropagation();
        this._setValue(id, Boolean(ev.target.checked));
      });
    }
  }

  _switch(id, label) {
    return `<div class="switch-row"><label for="${id}">${label}</label><ha-switch id="${id}" ${this._config[id] ? "checked" : ""}></ha-switch></div>`;
  }

  _setValue(key, value) {
    if (!this._config) return;
    let nextValue = value;
    if (key === "custom_size") nextValue = Math.max(80, Math.min(600, Number(value || 180)));
    const newConfig = { ...this._config, [key]: nextValue };
    this._config = newConfig;

    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    }));

    if (["size", "theme_mode"].includes(key)) this._render();
  }

  _escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
  }

  _escapeAttr(value) {
    return this._escape(value);
  }
}

if (!customElements.get("bindicator-card")) {
  customElements.define("bindicator-card", BindicatorCard);
}
if (!customElements.get("bindicator-card-editor")) {
  customElements.define("bindicator-card-editor", BindicatorCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.some(card => card.type === "bindicator-card")) {
  window.customCards.push({
    type: "bindicator-card",
    name: "Bindicator Card",
    description: "Animated WLED wheelie-bin indicator card with a visual editor.",
    preview: false,
    documentationURL: "https://github.com/deanfourie1/bindicator-card",
  });
}

console.info(`%c BINDICATOR-CARD %c v${BINDICATOR_VERSION} `, "color:white;background:#3f51b5;font-weight:700", "color:#3f51b5;background:#e8eaf6;font-weight:700");

window.__ModuleLoader__.load({
  id: "dsh-rhine-splash",
  factory: (require) => {
    const module = { exports: {} };
    const React = require("react");
    const { createPortal } = require("react-dom");
    const { jsx, jsxs } = require("react/jsx-runtime");
    const P = require("@deepseek-ai/dsh-client-ui-primitives");
    const NS = "rhineSplash";
    const CONFIG = globalThis.__RHINE_SPLASH__ || {};
    const BRAND = globalThis.__RHINE_BRAND__ || {};
    const exits = ["random", "doors", "decode", "glitch", "iris"];
    const themes = ["auto", "light", "dark"];
    const logos = ["plate", "cell"];
    const switches = ["enabled", "skippable", "replayOnReload", "uiTheme", "brand", "effortSlider"];
    const texts = ["title", "subtitle", "code"];
    const zh = {
      summary: "设置莱茵开屏、界面主题和品牌。", command: "开屏", commandDescription: "预览开屏或更改开屏设置。",
      splash: "开屏", text: "文字", interface: "界面", actions: "操作", exit: "退场", theme: "主题",
      enabled: "开屏动画", skippable: "允许跳过", replayOnReload: "刷新时重播", uiTheme: "界面主题", brand: "品牌替换",
      logo: "Logo 方案", plate: "模块铭牌", cell: "开放细胞", logoPlate: "Logo：模块铭牌", logoCell: "Logo：开放细胞",
      duration: "显示时长（ms）", title: "主标题", subtitle: "副标题", code: "角落编号",
      random: "随机", doors: "舱门", decode: "代码消散", glitch: "故障撕裂", iris: "六边形光圈",
      auto: "跟随", light: "浅色", dark: "深色", on: "开启", off: "关闭",
      uiThemeOn: "界面主题 开", uiThemeOff: "界面主题 关", brandOn: "品牌替换 开", brandOff: "品牌替换 关",
      effortSlider: "推理强度滑块", effortSliderOn: "推理强度滑块 开", effortSliderOff: "推理强度滑块 关",
      effTitle: "推理强度", effFaster: "更快", effDeeper: "更深", effDefault: "默认", effHelp: "推理强度越高，模型思考越充分，回复也越慢。",
      effort_off: "关闭", effort_low: "低", effort_medium: "中", effort_high: "高", effort_xhigh: "超高", effort_max: "最高",
      preview: "预览开屏", previewNow: "立即预览开屏", restart: "修改会立即保存，重启 DeepSeek Harness 后生效；预览按当前设置立即播放。",
      resetAll: "恢复默认", unavailable: "该插件当前未加载，暂时无法配置。",
      readOnly: "本部署的设置为只读。", saveFailed: "保存失败，已保留修改供你重试。",
      invalidNumber: "请输入 0–15000 的数字。", search: "搜索开屏操作…", empty: "暂无操作。", noResults: "没有匹配的操作。"
    };
    const en = {
      summary: "Configure the Rhine splash, interface theme and branding.", command: "Splash", commandDescription: "Preview the splash or change its settings.",
      splash: "Splash", text: "Text", interface: "Interface", actions: "Actions", exit: "Exit", theme: "Theme",
      enabled: "Splash animation", skippable: "Allow skipping", replayOnReload: "Replay on reload", uiTheme: "Interface theme", brand: "Brand replacement",
      logo: "Logo scheme", plate: "Plate", cell: "Cell", logoPlate: "Logo: Plate", logoCell: "Logo: Cell",
      duration: "Duration (ms)", title: "Title", subtitle: "Subtitle", code: "Corner identifier",
      random: "Random", doors: "Doors", decode: "Code dissolve", glitch: "Glitch tear", iris: "Hexagonal iris",
      auto: "Follow system", light: "Light", dark: "Dark", on: "Enable", off: "Disable",
      uiThemeOn: "Interface theme on", uiThemeOff: "Interface theme off", brandOn: "Brand replacement on", brandOff: "Brand replacement off",
      effortSlider: "Effort slider", effortSliderOn: "Effort slider on", effortSliderOff: "Effort slider off",
      effTitle: "Reasoning effort", effFaster: "Faster", effDeeper: "Deeper", effDefault: "Default", effHelp: "Higher effort thinks longer and answers more slowly.",
      effort_off: "Off", effort_low: "Low", effort_medium: "Medium", effort_high: "High", effort_xhigh: "Extra high", effort_max: "Max",
      preview: "Preview splash", previewNow: "Preview splash now", restart: "Changes save immediately and apply after restarting DeepSeek Harness; preview plays the current settings now.",
      resetAll: "Reset to defaults", unavailable: "This plugin is not loaded and cannot be configured.",
      readOnly: "This deployment stores settings read-only.", saveFailed: "Saving failed; your edits were kept for retry.",
      invalidNumber: "Enter a number between 0 and 15000.", search: "Search splash actions…", empty: "No actions available.", noResults: "No matching actions."
    };

    // Brand sizing plus the config page's row layout, built on the app's own
    // design tokens so it matches the official forms with or without the theme.
    const CSS = [
      ".rl-brand-mark>svg,.rl-brand-hero>svg{width:100%;height:100%;display:block}",
      ".rl-brand-name{display:inline-flex;align-items:center}",
      ".rl-cfg-section{margin:0 0 22px}",
      ".rl-cfg-h{margin:0 0 4px;padding-bottom:8px;border-bottom:1px solid var(--dsw-alias-border-l2);font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cfg-row{display:flex;align-items:center;gap:16px;min-height:44px;padding:6px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}",
      ".rl-cfg-label{flex:1;min-width:0;font-size:13px;color:var(--dsw-alias-label-primary)}",
      ".rl-cfg-note{margin:0 0 12px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cfg-note[role=alert]{margin:8px 0 0;color:var(--dsw-alias-state-error-primary)}",
      ".rl-cfg-actions{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin:4px 0 8px}",
      ".rl-cfg-preview{display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 12px;border:1px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);background:transparent;font:500 13px/1 var(--dsw-font-family);color:var(--dsw-alias-label-primary);cursor:pointer}",
      ".rl-cfg-preview:hover{background:var(--dsw-alias-interactive-bg-hover)}",
      ".rl-cfg-preview>i{width:7px;height:7px;background:var(--dsw-static-deepseek-500)}",
      ".rl-cfg-reset{height:30px;padding:0 12px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;font:500 13px/1 var(--dsw-font-family);color:var(--dsw-alias-label-secondary);cursor:pointer}",
      ".rl-cfg-reset:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
      ".rl-cfg-reset:disabled{opacity:.4;cursor:default}",
      ".rl-cfg-hint{margin:0;font-size:12px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-eff,.rl-eff-pop{--rl-eff-accent:var(--dsw-static-deepseek-500);--rl-eff-ease:cubic-bezier(.16,1,.3,1)}",
      ".rl-eff{display:inline-flex;min-width:0}",
      ".rl-eff-trigger{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border:0;border-radius:var(--dsw-radius-md);outline:none;background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);font:inherit;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);white-space:nowrap;cursor:pointer}",
      ".rl-eff-trigger:hover,.rl-eff[data-open] .rl-eff-trigger{background:color-mix(in srgb,var(--dsw-alias-label-primary) 11%,transparent);color:var(--dsw-alias-label-primary)}",
      ".rl-eff-pips{display:inline-flex;align-items:flex-end;gap:1.5px;height:11px}",
      ".rl-eff-pips>i{width:2.5px;height:calc(3px + var(--k) * 2.6px);background:currentColor;opacity:.3}",
      ".rl-eff-pips>i[data-on]{opacity:1}",
      ".rl-eff-trigger:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}",
      ".rl-eff[data-max] .rl-eff-trigger,.rl-eff-pop[data-max] .rl-eff-value{color:var(--rl-eff-accent);--dsw-alias-label-shimmer:color-mix(in srgb,var(--rl-eff-accent) 45%,#fff)}",
      ".rl-eff-pop{position:fixed;z-index:1100;box-sizing:border-box;width:280px;padding:14px 18px 10px;--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);box-shadow:var(--dsw-elevation-prominent);font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);user-select:none}",
      ".rl-eff-head{display:flex;align-items:center;gap:8px}",
      ".rl-eff-title{color:var(--dsw-alias-label-tertiary)}",
      ".rl-eff-value{font-weight:500}",
      ".rl-eff-help{display:inline-flex;margin-left:auto;color:var(--dsw-alias-label-tertiary);cursor:help}",
      ".rl-eff-help>svg{width:16px;height:16px}",
      ".rl-eff-ends{display:flex;justify-content:space-between;margin-top:16px;line-height:18px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-eff-track{position:relative;height:24px;margin-top:8px;border-radius:var(--dsw-radius-md);outline:none;cursor:pointer;touch-action:none}",
      ".rl-eff-track:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}",
      ".rl-eff-rail{position:absolute;left:10px;right:10px;top:0;bottom:0}",
      ".rl-eff-rail::before{content:\"\";position:absolute;inset:0 -10px;border-radius:var(--dsw-radius-md);background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent)}",
      ".rl-eff-fill{position:absolute;left:-10px;top:0;bottom:0;width:calc(var(--rl-eff-p) * 100% + 20px);overflow:hidden;border-radius:var(--dsw-radius-md);background:linear-gradient(90deg,color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent),color-mix(in srgb,var(--dsw-alias-label-primary) 40%,transparent));transition:width .24s var(--rl-eff-ease)}",
      ".rl-eff-pop[data-max] .rl-eff-fill{background:color-mix(in srgb,var(--rl-eff-accent) 6%,transparent)}",
      ".rl-eff-matrix{position:absolute;inset:0;width:100%;height:100%;color:var(--rl-eff-accent);outline:0 none var(--dsw-alias-label-primary)}",
      ".rl-eff-stop{position:absolute;left:calc(var(--k) * 100%);top:50%;width:4px;height:4px;margin:-2px 0 0 -2px;border-radius:50%;corner-shape:round;background:color-mix(in srgb,var(--dsw-alias-label-primary) 28%,transparent)}",
      ".rl-eff-stop[data-default]{width:2px;height:10px;margin:-5px 0 0 -1px;border-radius:1px}",
      ".rl-eff-stop[data-on]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 55%,transparent)}",
      ".rl-eff-thumb{position:absolute;left:calc(var(--rl-eff-p) * 100%);top:0;bottom:0;width:20px;margin-left:-10px;border-radius:var(--dsw-radius-md);background:#fbfaf7;box-shadow:0 1px 3px #00000040,0 0 0 .5px #00000014;transition:left .24s var(--rl-eff-ease)}",
      ".rl-eff-pop[data-dragging] .rl-eff-fill,.rl-eff-pop[data-dragging] .rl-eff-thumb{transition-duration:.12s}",
      ".rl-eff-pop[data-pending] .rl-eff-thumb{animation:rl-eff-blink .5s steps(2) infinite}",
      ".rl-eff-scale{position:relative;height:18px;margin:8px 10px 0}",
      ".rl-eff-scale>span{position:absolute;left:calc(var(--k) * 100%);transform:translateX(-50%);line-height:18px;white-space:nowrap;color:var(--dsw-alias-label-tertiary)}",
      "@keyframes rl-eff-blink{50%{opacity:.25}}",
      "@media (prefers-reduced-motion:reduce){.rl-eff-pop *{animation:none!important;transition:none!important}}",
    ].join("");

    function specs() {
      const number = P.settingsNumberField("duration");
      return [
        ...switches.map((field) => ({ field,
          format: (value) => String(typeof value === "boolean" ? value : CONFIG[field] ?? true),
          parse: (text) => ["true", "false"].includes(text) ? { kind: "set", value: text === "true" } : undefined
        })),
        ...[ ["exit", exits], ["theme", themes], ["logo", logos] ].map(([field, choices]) => ({ field,
          format: (value) => value ?? CONFIG[field] ?? choices[0],
          parse: (text) => choices.includes(text) ? { kind: "set", value: text } : undefined
        })),
        { ...number, parse: (text) => {
          const parsed = number.parse(text);
          return parsed?.kind === "set" && (parsed.value < 0 || parsed.value > 15000) ? undefined : parsed;
        } },
        ...texts.map(P.settingsTextField)
      ];
    }

    function Mark({ size }) {
      return CONFIG.brand !== false && BRAND.mark ? jsx("span", {
        className: "rl-brand rl-brand-mark", style: { display: "inline-flex", width: size, height: size },
        dangerouslySetInnerHTML: { __html: BRAND.mark }
      }) : jsx(P.FishLogo, { size });
    }
    function Name() {
      return CONFIG.brand !== false && BRAND.name ? jsx("span", {
        className: "rl-brand rl-brand-name", dangerouslySetInnerHTML: { __html: BRAND.name }
      }) : jsx(P.BrandWordmark, { includeMark: false });
    }
    function Hero({ size, className }) {
      return jsx("span", { className: `${className || ""} rl-brand rl-brand-hero`,
        style: { display: "inline-flex", width: size, height: size }, dangerouslySetInnerHTML: { __html: BRAND.hero }
      });
    }

    function Card(props) {
      const { t } = props;
      const state = props.useRhineSplash((snapshot) => snapshot);
      React.useEffect(() => {
        if (props.view !== "summary") return () => props.scheduleSave(0);
      }, []);
      if (props.view === "summary") return t("summary");
      if (!state.available) return jsx("p", { className: "rl-cfg-note", role: "status", children: t("unavailable") });
      const disabled = !state.writable;
      const overriddenKeys = Object.keys(state.fields).filter((key) => state.fields[key].overridden);
      const field = (key) => {
        const value = state.fields[key];
        const id = `rhine-splash-${key}`;
        const onEdit = (text) => props.edit(key, text);
        if (switches.includes(key) || key === "exit" || key === "theme" || key === "logo") {
          // SettingsValueField has a fixed text input and no control/children slot.
          // Keep its staged-value/reset semantics with the confirmed controls.
          return jsxs("div", { className: "rl-cfg-row", children: [
            jsx("span", { className: "rl-cfg-label", children: t(key) }),
            switches.includes(key) ? jsx(P.Switch, { checked: value.text === "true", label: t(key), disabled,
              onChange: (checked) => { onEdit(String(checked)); props.scheduleSave(0); }
            }) : jsx(P.SegmentedControl, { id, value: value.text, label: t(key), disabled,
              options: (key === "exit" ? exits : key === "logo" ? logos : themes).map((choice) => ({ value: choice, label: t(choice) })),
              onChange: (text) => { onEdit(text); props.scheduleSave(0); }
            })
          ] }, key);
        }
        return jsx("div", { className: "rl-cfg-field", onBlur: () => props.scheduleSave(0),
          onKeyDown: (event) => { if (event.key === "Enter") props.scheduleSave(0); },
          children: jsx(P.SettingsValueField, { id, label: t(key), disabled, ...value, overridden: false,
            numeric: key === "duration",
            invalidLabel: t("invalidNumber"), onEdit
          })
        }, key);
      };
      const group = (title, keys) => jsxs("section", { className: "rl-cfg-section", children: [jsx("h3", { className: "rl-cfg-h", children: t(title) }), ...keys.map(field)] }, title);
      return jsxs("div", { className: "rl-cfg", children: [
        !state.writable && jsx("p", { className: "rl-cfg-note", children: t("readOnly") }),
        group("splash", ["enabled", "exit", "theme", "duration", "skippable", "replayOnReload"]),
        group("text", texts), group("interface", ["uiTheme", "brand", "logo", "effortSlider"]),
        jsxs("div", { className: "rl-cfg-actions", children: [
          jsxs("button", { type: "button", className: "rl-cfg-preview", onClick: () => props.preview(), children: [jsx("i", {}), t("preview")] }),
          jsx("button", { type: "button", className: "rl-cfg-reset", disabled: !state.writable || !overriddenKeys.length,
            onClick: () => { overriddenKeys.forEach((key) => props.resetField(key)); props.scheduleSave(0); }, children: t("resetAll") }),
          jsx("p", { className: "rl-cfg-hint", children: t("restart") })
        ] }),
        state.failed && jsx("p", { className: "rl-cfg-note", role: "alert", children: t("saveFailed") })
      ] });
    }

    // The top level's fill: a dot matrix that thickens and brightens toward the
    // thumb. Every dot stays put and breathes: half its pulse is a shared
    // two-beat breath that starts later the farther the dot is from the thumb,
    // so the light swells outward, away from the thumb; the other half is the
    // dot's own breath at its own pace, which keeps it a field of twinkles
    // rather than a sweeping band. Dots far from the thumb are a sparse neutral
    // grey; nearer it they turn to the accent, and the brightest lean toward
    // white on dark surfaces. Columns count from the thumb so the pattern holds
    // while the fill width animates; reduced motion draws a still.
    function Matrix() {
      const ref = React.useRef(null);
      React.useEffect(() => {
        const canvas = ref.current;
        const g = canvas?.getContext("2d");
        if (!g) return undefined;
        const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
        const PITCH = 4, DOT = 2.5, BREATH = 2.4, SPAN = 56;
        const hash = (a, b) => { let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
        const rgbOf = (value, fallback) => (value.match(/[\d.]+/g) || fallback).slice(0, 3).map(Number);
        let cells = [], width = 0, height = 0, accent = [228, 111, 36], neutral = [160, 160, 160], frame = 0, glow = 0.55;
        const layout = () => {
          const rect = canvas.getBoundingClientRect();
          const dpr = devicePixelRatio || 1;
          width = rect.width; height = rect.height;
          canvas.width = Math.max(1, Math.round(width * dpr)); canvas.height = Math.max(1, Math.round(height * dpr));
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          const style = getComputedStyle(canvas);
          accent = rgbOf(style.color, accent);
          neutral = rgbOf(style.outlineColor, neutral);
          // Bright dots lean toward white on dark surfaces only; on light ones they would wash out.
          glow = document.body.hasAttribute("data-ds-dark-theme") ? 0.35 : 0;
          const cols = Math.floor(width / PITCH), rows = Math.floor(height / PITCH);
          const ox = (width - (cols - 1) * PITCH - DOT) / 2, oy = (height - (rows - 1) * PITCH - DOT) / 2;
          cells = [];
          for (let c = 0; c < cols; c++) {
            const k = cols - 1 - c;
            const base = Math.max(0, 1 - (k * PITCH) / Math.max(width, 1)) ** 1.3;
            const tint = base ** 0.7;
            for (let r = 0; r < rows; r++) {
              const color = neutral.map((v, i) => v + (accent[i] - v) * tint);
              cells.push({ x: ox + c * PITCH, y: oy + r * PITCH, k, base, color, gain: 0.55 + 0.45 * hash(k + 31, r), jitter: (hash(k + 57, r) - 0.5) * 0.2,
                own: BREATH * (0.8 + 0.5 * hash(k + 83, r)), phase: hash(k + 97, r) });
            }
          }
        };
        const draw = (time) => {
          g.clearRect(0, 0, width, height);
          const s = still ? 0 : time / 1000;
          for (const cell of cells) {
            const wave = 0.5 - 0.5 * Math.cos((s / BREATH - cell.k / SPAN + cell.jitter) * 6.283);
            const own = 0.5 - 0.5 * Math.cos((s / cell.own + cell.phase) * 6.283);
            const breath = 0.55 * wave + 0.45 * own;
            const threshold = 0.7 - 0.66 * cell.base;
            const pulse = Math.min(1, Math.max(0, (breath * cell.gain - threshold) / (1 - threshold)));
            const floor = 0.35 * cell.base * cell.base;
            const alpha = floor + (1 - floor) * pulse * (0.3 + 0.7 * cell.base);
            if (alpha < 0.02) continue;
            const lift = glow * cell.base * pulse * pulse;
            const [r, gr, b] = cell.color.map((v) => Math.round(v + (255 - v) * lift));
            g.fillStyle = `rgba(${r},${gr},${b},${alpha.toFixed(3)})`;
            g.fillRect(cell.x, cell.y, DOT, DOT);
          }
        };
        const loop = (time) => { draw(time); frame = requestAnimationFrame(loop); };
        layout();
        if (still) draw(0); else frame = requestAnimationFrame(loop);
        const observer = new ResizeObserver(() => { layout(); if (still) draw(0); });
        observer.observe(canvas);
        return () => { cancelAnimationFrame(frame); observer.disconnect(); };
      }, []);
      return jsx("canvas", { className: "rl-eff-matrix", ref, "aria-hidden": "true" });
    }

    function EffortControl({ available, directory, load, select, t }) {
      const state = React.useSyncExternalStore((fn) => directory.subscribe(fn), () => directory.getSnapshot());
      React.useEffect(() => { load(); }, []);
      const current = state.current;
      const model = state.groups.find((group) => group.id === current?.provider)?.models.find((item) => item.id === current?.model);
      const efforts = model?.reasoning?.efforts || [];
      const n = efforts.length;
      const effective = current?.reasoningEffort ?? model?.reasoning?.defaultEffort;
      const currentIndex = efforts.findIndex((effort) => effort.id === effective);
      const defaultIndex = efforts.findIndex((effort) => effort.id === model?.reasoning?.defaultEffort);
      const targetIndex = state.status === "selecting" && state.pending?.provider === current?.provider && state.pending?.model === current?.model
        ? efforts.findIndex((effort) => effort.id === state.pending?.reasoningEffort) : currentIndex;
      const [open, setOpen] = React.useState(false);
      const [drag, setDrag] = React.useState(null);
      const dragRef = React.useRef(null);
      const lastIndexRef = React.useRef(null);
      const rootRef = React.useRef(null);
      const triggerRef = React.useRef(null);
      const panelRef = React.useRef(null);
      const trackRef = React.useRef(null);
      const railRef = React.useRef(null);
      const nearest = drag !== null ? Math.round(drag * (n - 1)) : targetIndex;
      const p = drag !== null ? nearest / (n - 1) : (targetIndex < 0 ? 0 : targetIndex / (n - 1));
      const visible = available && !!current && !!model?.reasoning && n >= 2;
      const position = P.useAnchoredPosition({ open, anchorRef: triggerRef, panelRef, side: "top", align: "end", gap: 8, margin: 8 });
      P.useDismissOnOutsidePointer(rootRef, open, setOpen, panelRef);
      React.useEffect(() => {
        dragRef.current = null;
        lastIndexRef.current = null;
        setDrag(null);
        if (open) trackRef.current?.focus();
      }, [open]);
      React.useEffect(() => {
        if (!visible) {
          setOpen(false);
          setDrag(null);
          dragRef.current = null;
        }
      }, [visible]);
      if (!visible) return null;

      const labelOf = (level) => ["off", "low", "medium", "high", "xhigh", "max"].includes(level.id) ? t("effort_" + level.id) : level.name;
      const label = nearest >= 0 ? labelOf(efforts[nearest]) : "";
      const max = nearest === n - 1;
      // At the top level the label shimmers like dsh's own thinking label.
      const shimmer = jsx(P.TextShimmer, { active: max, children: label });
      const flags = {
        "data-level": nearest,
        "data-max": max ? "true" : undefined,
        "data-dragging": drag !== null ? "true" : undefined,
        "data-pending": state.status === "selecting" ? "true" : undefined,
        "data-open": open ? "true" : undefined
      };
      const commit = (index) => {
        index = Math.max(0, Math.min(n - 1, index));
        const snap = directory.getSnapshot();
        const now = snap.status === "selecting" && snap.pending ? snap.pending.reasoningEffort : (snap.current?.reasoningEffort ?? model.reasoning.defaultEffort);
        if (efforts[index].id !== now) select({ provider: current.provider, model: current.model, reasoningEffort: efforts[index].id }).catch(() => {});
      };
      const updateDrag = (event) => {
        const rect = railRef.current.getBoundingClientRect();
        const fraction = rect.width > 0 ? Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) : 0;
        dragRef.current = fraction;
        setDrag(fraction);
        const index = Math.round(fraction * (n - 1));
        if (index !== lastIndexRef.current) {
          lastIndexRef.current = index;
          commit(index);
        }
      };
      const endDrag = () => { dragRef.current = null; lastIndexRef.current = null; setDrag(null); };
      return jsxs("div", { className: "rl-eff", ref: rootRef, ...flags, style: { "--rl-eff-n": String(n) }, children: [
        jsxs("button", { type: "button", className: "rl-eff-trigger", ref: triggerRef,
          "aria-haspopup": "dialog", "aria-expanded": open, "aria-label": `${t("effTitle")} ${label}`,
          onClick: () => setOpen((value) => !value), children: [
            jsx("span", { className: "rl-eff-pips", "aria-hidden": "true", children: efforts.map((effort, k) => jsx("i", {
              "data-on": k <= nearest ? "true" : undefined, style: { "--k": String(k) }
            }, effort.id)) }),
            jsx("span", { className: "rl-eff-label", children: shimmer })
          ]
        }),
        open && createPortal(jsxs(P.MenuSurface, { className: "rl-eff-pop", ref: panelRef, role: "dialog", "aria-label": t("effTitle"), ...flags,
          style: { left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? "visible" : "hidden" },
          onKeyDown: (event) => {
            if (event.key === "Escape") {
              setOpen(false);
              triggerRef.current?.focus();
            }
          }, children: [
            jsxs("div", { className: "rl-eff-head", children: [
              jsx("span", { className: "rl-eff-title", children: t("effTitle") }),
              jsx("span", { className: "rl-eff-value", children: shimmer }),
              jsx("span", { className: "rl-eff-help", title: t("effHelp"), children: jsx(P.IconQuestionOutlineRegular, {}) })
            ] }),
            jsxs("div", { className: "rl-eff-ends", children: [
              jsx("span", { children: t("effFaster") }), jsx("span", { children: t("effDeeper") })
            ] }),
            jsx("div", { className: "rl-eff-track", ref: trackRef, role: "slider", tabIndex: 0,
              "aria-label": t("effTitle"), "aria-valuemin": 0, "aria-valuemax": n - 1,
              "aria-valuenow": Math.max(0, nearest), "aria-valuetext": label, style: { "--rl-eff-p": String(p) },
              onPointerDown: (event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                trackRef.current.setPointerCapture(event.pointerId);
                lastIndexRef.current = null;
                updateDrag(event);
              },
              onPointerMove: (event) => {
                if (dragRef.current === null) return;
                if ((event.buttons & 1) === 0) { endDrag(); return; }
                updateDrag(event);
              },
              onPointerUp: () => { endDrag(); },
              onPointerCancel: () => { endDrag(); },
              onLostPointerCapture: () => { if (dragRef.current !== null) endDrag(); },
              onKeyDown: (event) => {
                const base = Math.max(0, targetIndex);
                let index;
                if (["ArrowLeft", "ArrowDown", "PageDown"].includes(event.key)) index = base - 1;
                else if (["ArrowRight", "ArrowUp", "PageUp"].includes(event.key)) index = base + 1;
                else if (event.key === "Home") index = 0;
                else if (event.key === "End") index = n - 1;
                else return;
                event.preventDefault();
                commit(index);
              }, children: jsxs("div", { className: "rl-eff-rail", ref: railRef, children: [
                jsx("i", { className: "rl-eff-fill", children: max ? jsx(Matrix, {}) : null }),
                ...efforts.map((effort, k) => jsx("i", { className: "rl-eff-stop", "data-on": k <= nearest ? "true" : undefined,
                  "data-default": k === defaultIndex ? "true" : undefined, style: { "--k": String(k / (n - 1)) }
                }, effort.id)),
                jsx("i", { className: "rl-eff-thumb" })
              ] })
            }),
            // As in the Claude Code effort picker: only the default level is captioned.
            jsx("div", { className: "rl-eff-scale", "aria-hidden": "true", children: defaultIndex < 0 ? null : jsx("span", {
              style: { "--k": String(defaultIndex / (n - 1)) }, children: t("effDefault")
            }) })
          ]
        }), document.body)
      ] });
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }));
      const t = ctx.locale.bind(NS);
      ctx.effect(() => {
        const style = document.createElement("style");
        style.textContent = CSS;
        document.head.append(style);
        return () => style.remove();
      });
      ctx.slots.inject("sidebar.brand.mark", () => ctx.slots.inject("sidebar.brand.name", function* () {
        yield ctx.slots.register({ name: "sidebar.brand.mark" }, Mark);
        yield ctx.slots.register({ name: "sidebar.brand.name" }, Name);
      }));
      if (CONFIG.brand !== false && BRAND.hero) ctx.slots.inject("conversation.hero.brand.mark", function* () {
        yield ctx.slots.register({ name: "conversation.hero.brand.mark" }, Hero);
      });
      if (CONFIG.effortSlider !== false) ctx.inject(["slots", "modelDirectories", "sessions"], (scope) => {
        const models = scope.modelDirectories;
        const sessions = scope.sessions;
        scope.slots.inject("conversation.input.right", () => scope.slots.register({
          name: "conversation.input.right", id: "rhine-effort", order: 0, locale: NS,
          inject: (sessionId) => {
            const directory = models.directoryFor(sessionId);
            const available = sessions.subagentAddress(sessionId) === undefined;
            return { available, directory: directory.store,
              load: () => { if (available) directory.load().catch(() => {}); },
              select: (selection) => available ? directory.select(selection) : Promise.resolve(undefined)
            };
          }
        }, EffortControl));
      });

      const scope = ctx.configForms.get("rhine-splash");
      const form = new P.SettingsFormModel(scope, specs());
      let saveTimer = 0;
      const autoSave = () => {
        clearTimeout(saveTimer);
        const shell = form.shell();
        if (shell.available && shell.writable && shell.dirty && !shell.invalid && !shell.saving && !shell.failed) form.save();
      };
      const scheduleSave = (delay = 0) => { clearTimeout(saveTimer); saveTimer = setTimeout(autoSave, delay); };
      // Preview what the page shows, including text typed but not yet saved.
      const previewSplash = () => {
        const value = { ...CONFIG, ...(scope.getSnapshot().value || {}) };
        for (const spec of specs()) {
          const write = spec.parse(form.field(spec.field).text);
          if (write?.kind === "set") value[spec.field] = write.value;
        }
        globalThis.__rhineSplash?.replay({ ...value, enabled: true });
      };
      const fields = specs().map((spec) => spec.field);
      const store = form.bind(() => ({ ...form.shell(), fields: Object.fromEntries(fields.map((key) => [key, form.field(key)])) }));
      // Only catch up after a save settles (an edit made while it was in
      // flight); typing in a text field must not save per keystroke.
      let wasSaving = false;
      ctx.effect(() => store.subscribe(() => {
        const shell = form.shell();
        if (wasSaving && !shell.saving && shell.dirty && !shell.failed) scheduleSave(0);
        wasSaving = shell.saving;
      }));
      ctx.effect(() => () => clearTimeout(saveTimer));
      ctx.effect(() => () => form.dispose());
      ctx.effect(() => ctx.configForms.whileServed(["rhine-splash"], () => ctx.slots.inject("plugins.row.config", () => ctx.slots.register({
        name: "plugins.row.config", key: "dsh-rhine-splash#rhine-splash", locale: NS,
        inject: () => ({ hooks: { rhineSplash: store }, ...form.actions(), scheduleSave, preview: () => previewSplash() })
      }, Card))));

      const current = (field) => scope.getSnapshot().value?.[field] ?? CONFIG[field];
      const option = (id, label, group, field, value) => ({ id, label: t(label),
        group: { name: group, label: t(group) },
        ...(field ? { active: current(field) === value } : {}), detail: t("restart")
      });
      ctx.effect(() => ctx.commandUi.register({
        name: "splash", label: () => t("command"), description: () => t("commandDescription"), icon: P.IconPlayOutlineRegular,
        ui: { kind: "popupSelect", searchMode: "fuzzy-label",
          searchLabels: () => ({ placeholder: t("search"), empty: t("empty"), noResults: t("noResults") }),
          options: async () => {
            const rows = [option("preview", "previewNow", "actions")];
            if (scope.getSnapshot().status !== "ready" || !scope.getSnapshot().writable) return rows;
            rows.push(option("enabled:true", "on", "splash", "enabled", true), option("enabled:false", "off", "splash", "enabled", false));
            for (const exit of exits) rows.push(option(`exit:${exit}`, exit, "exit", "exit", exit));
            for (const field of ["uiTheme", "brand", "effortSlider"]) for (const value of [true, false]) rows.push(option(`${field}:${value}`, `${field}${value ? "On" : "Off"}`, "interface", field, value));
            for (const logo of logos) rows.push(option(`logo:${logo}`, logo === "plate" ? "logoPlate" : "logoCell", "interface", "logo", logo));
            return rows;
          },
          onSelect: async (selected) => {
            if (selected.id === "preview") { previewSplash(); return; }
            const [field, raw] = selected.id.split(":");
            if (!(field === "exit" ? exits.includes(raw) : field === "logo" ? logos.includes(raw) : ["enabled", "uiTheme", "brand", "effortSlider"].includes(field) && ["true", "false"].includes(raw))) return;
            // A separate draft prevents a slash command from saving page edits.
            const commandForm = new P.SettingsFormModel(scope, specs());
            try {
              commandForm.actions().edit(field, raw);
              await commandForm.save();
              if (commandForm.shell().failed || commandForm.shell().dirty) throw new Error(t("saveFailed"));
            } finally { commandForm.dispose(); }
          }
        }
      }));
    }
    module.exports = { inject: ["slots", "locale", "configForms", "commandUi"], apply };
    return module.exports;
  }
});

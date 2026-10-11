window.__ModuleLoader__.load({
  id: "dsh-rhine-splash",
  factory: (require) => {
    const module = { exports: {} };
    const React = require("react");
    const { jsx, jsxs } = require("react/jsx-runtime");
    const P = require("@deepseek-ai/dsh-client-ui-primitives");
    const NS = "rhineSplash";
    const CONFIG = globalThis.__RHINE_SPLASH__ || {};
    const BRAND = globalThis.__RHINE_BRAND__ || {};
    const exits = ["random", "doors", "decode", "glitch", "iris"];
    const themes = ["auto", "light", "dark"];
    const logos = ["plate", "cell"];
    const switches = ["enabled", "skippable", "replayOnReload", "uiTheme", "brand"];
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
      preview: "预览开屏", previewNow: "立即预览开屏", restart: "保存后重启 DeepSeek Harness 生效（预览立即可见）",
      overridden: "已覆盖", reset: "恢复默认", unavailable: "该插件当前未加载，暂时无法配置。",
      readOnly: "本部署的设置为只读。", saveFailed: "保存失败，已保留修改供你重试。", save: "保存", saving: "保存中…",
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
      preview: "Preview splash", previewNow: "Preview splash now", restart: "Restart DeepSeek Harness after saving to apply changes (preview is immediate).",
      overridden: "Overridden", reset: "Reset to default", unavailable: "This plugin is not loaded and cannot be configured.",
      readOnly: "This deployment stores settings read-only.", saveFailed: "Saving failed; your edits were kept for retry.", save: "Save", saving: "Saving…",
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
      ".rl-cfg-override{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}",
      ".rl-cfg-link{padding:0;border:0;background:none;font:inherit;color:var(--dsw-alias-link);cursor:pointer}",
      ".rl-cfg-link:disabled{opacity:.5;cursor:default}",
      ".rl-cfg-actions{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin:4px 0 8px}",
      ".rl-cfg-preview{display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 12px;border:1px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);background:transparent;font:500 13px/1 var(--dsw-font-family);color:var(--dsw-alias-label-primary);cursor:pointer}",
      ".rl-cfg-preview:hover{background:var(--dsw-alias-interactive-bg-hover)}",
      ".rl-cfg-preview>i{width:7px;height:7px;background:var(--dsw-static-deepseek-500)}",
      ".rl-cfg-hint{margin:0;font-size:12px;color:var(--dsw-alias-label-tertiary)}",
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
      if (props.view === "summary") return t("summary");
      const disabled = !state.writable || state.saving;
      const labels = Object.fromEntries(["unavailable", "readOnly", "saveFailed", "save", "saving"].map((key) => [key, t(key)]));
      const field = (key) => {
        const value = state.fields[key];
        const id = `rhine-splash-${key}`;
        const onEdit = (text) => props.edit(key, text);
        const onReset = () => props.resetField(key);
        if (switches.includes(key) || key === "exit" || key === "theme" || key === "logo") {
          // SettingsValueField has a fixed text input and no control/children slot.
          // Keep its staged-value/reset semantics with the confirmed controls.
          return jsxs("div", { className: "rl-cfg-row", children: [
            jsx("span", { className: "rl-cfg-label", children: t(key) }),
            switches.includes(key) ? jsx(P.Switch, { checked: value.text === "true", label: t(key), disabled,
              onChange: (checked) => onEdit(String(checked))
            }) : jsx(P.SegmentedControl, { id, value: value.text, label: t(key), disabled,
              options: (key === "exit" ? exits : key === "logo" ? logos : themes).map((choice) => ({ value: choice, label: t(choice) })), onChange: onEdit
            }),
            value.overridden ? jsxs("span", { className: "rl-cfg-override", children: [t("overridden"), jsx("button", {
              type: "button", className: "rl-cfg-link", disabled, onClick: onReset, children: t("reset")
            })] }) : null
          ] }, key);
        }
        return jsx(P.SettingsValueField, { id, label: t(key), disabled, ...value,
          numeric: key === "duration", overriddenLabel: t("overridden"), resetLabel: t("reset"),
          invalidLabel: t("invalidNumber"), onEdit, onReset
        }, key);
      };
      const group = (title, keys) => jsxs("section", { className: "rl-cfg-section", children: [jsx("h3", { className: "rl-cfg-h", children: t(title) }), ...keys.map(field)] }, title);
      return jsxs(P.SettingsForm, { labels, state, onSave: props.save, onDiscard: props.discard, children: [
        group("splash", ["enabled", "exit", "theme", "duration", "skippable", "replayOnReload"]),
        group("text", texts), group("interface", ["uiTheme", "brand", "logo"]),
        jsxs("div", { className: "rl-cfg-actions", children: [
          jsxs("button", { type: "button", className: "rl-cfg-preview", onClick: () => globalThis.__rhineSplash?.replay({ exit: state.fields.exit.text }), children: [jsx("i", {}), t("preview")] }),
          jsx("p", { className: "rl-cfg-hint", children: t("restart") })
        ] })
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

      const scope = ctx.configForms.get("rhine-splash");
      const form = new P.SettingsFormModel(scope, specs());
      const fields = specs().map((spec) => spec.field);
      const store = form.bind(() => ({ ...form.shell(), fields: Object.fromEntries(fields.map((key) => [key, form.field(key)])) }));
      ctx.effect(() => () => form.dispose());
      ctx.effect(() => ctx.configForms.whileServed(["rhine-splash"], () => ctx.slots.inject("plugins.row.config", () => ctx.slots.register({
        name: "plugins.row.config", key: "dsh-rhine-splash#rhine-splash", locale: NS,
        inject: () => ({ hooks: { rhineSplash: store }, ...form.actions() })
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
            for (const field of ["uiTheme", "brand"]) for (const value of [true, false]) rows.push(option(`${field}:${value}`, `${field}${value ? "On" : "Off"}`, "interface", field, value));
            for (const logo of logos) rows.push(option(`logo:${logo}`, logo === "plate" ? "logoPlate" : "logoCell", "interface", "logo", logo));
            return rows;
          },
          onSelect: async (selected) => {
            if (selected.id === "preview") { globalThis.__rhineSplash?.replay({ exit: current("exit") }); return; }
            const [field, raw] = selected.id.split(":");
            if (!(field === "exit" ? exits.includes(raw) : field === "logo" ? logos.includes(raw) : ["enabled", "uiTheme", "brand"].includes(field) && ["true", "false"].includes(raw))) return;
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

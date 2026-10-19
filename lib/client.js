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
    const heroBackgrounds = ["random", "grid", "bars", "full", "off"];
    const resumeEffects = ["random", "scan", "iris", "glitch", "off"];
    const resumeTriggers = ["away", "always", "hidden"];
    const choiceLabel = { heroBackground: "hb_", resumeEffect: "rf_", resumeTrigger: "rt_" };
    const switches = ["enabled", "skippable", "replayOnReload", "uiTheme", "brand", "effortSlider", "billing"];
    const texts = ["title", "subtitle", "code"];
    function fill(text, values) {
      return text.replace(/\{([^{}]+)\}/g, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match);
    }
    // <resume-layer> Resume effect markup. Self-contained so preview/hero.html
    // can lift this block out of the file and render exactly the same nodes.
    const RESUME_MS = { scan: 840, iris: 1300, glitch: 540 };
    function resumeLayer(doc, kind) {
      const el = (tag, className, parent, vars) => {
        const node = doc.createElement(tag);
        if (className) node.className = className;
        if (vars) for (const [name, value] of Object.entries(vars)) node.style.setProperty(name, value);
        parent.append(node);
        return node;
      };
      const svg = (className, viewBox, markup, parent) => {
        const node = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
        node.setAttribute("class", className);
        node.setAttribute("viewBox", viewBox);
        node.innerHTML = markup;
        parent.append(node);
      };
      const root = doc.createElement("div");
      root.className = `rl-resume rl-resume--${kind}`;
      root.setAttribute("aria-hidden", "true");
      if (kind === "scan") {
        el("i", "rl-rs-line", root);
        for (const corner of ["tl", "tr", "bl", "br"]) el("i", `rl-rs-c rl-rs-c--${corner}`, root);
        const tag = el("span", "rl-rs-tag", root);
        tag.append("LINK RESTORED");
        el("b", "", tag);
      } else if (kind === "iris") {
        // Aperture scale in 100 px units: wide enough that the hexagon's
        // inner radius clears the farthest window corner.
        const view = doc.defaultView || {};
        const reach = Math.hypot((view.innerWidth || 1600) / 2, (view.innerHeight || 1000) / 2);
        root.style.setProperty("--rl-ri-max", String(reach / 0.866 / 100 + 0.3));
        const veil = el("i", "rl-ri-veil", root);
        svg("rl-ri-emblem", "0 0 220 220", '<circle cx="110" cy="110" r="90" pathLength="1" transform="rotate(-90 110 110)"/>'
          + '<path class="rl-ri-hex" pathLength="1" d="M151.57 86V134L110 158L68.43 134V86L110 62"/>'
          + '<path class="rl-ri-seal" pathLength="1" d="M110 62L151.57 86"/><rect x="102" y="102" width="16" height="16"/>', veil);
        svg("rl-ri-ring", "-100 -100 200 200", '<polygon points="0,-100 86.6,-50 86.6,50 0,100 -86.6,50 -86.6,-50"/>', root);
      } else if (kind === "glitch") {
        el("i", "rl-rg-flash", root);
        // [kind, top, height, left, width, offsets at 0/20/45 %, delay]
        for (const [type, y, h, x, w, a, b, c, d] of [
          ["hi", "12%", "5%", "6%", "52%", "40px", "-30px", "12px", "0s"],
          ["dim", "24%", "9%", "30%", "70%", "-60px", "24px", "-8px", ".03s"],
          ["inv", "40.5%", "1.1%", "0%", "38%", "120px", "-40px", "60px", ".06s"],
          ["blk", "47%", "4px", "71%", "64px", "-26px", "40px", "-90px", ".01s"],
          ["hi", "54%", "3.5%", "44%", "48%", "-80px", "50px", "-20px", ".02s"],
          ["dim", "65%", "7%", "0%", "64%", "30px", "-70px", "16px", ".05s"],
          ["blk", "71%", "3px", "22%", "38px", "60px", "-24px", "110px", ".07s"],
          ["inv", "78%", ".8%", "52%", "40%", "-90px", "60px", "-30px", ".08s"],
          ["hi", "86%", "4%", "18%", "30%", "50px", "-20px", "70px", ".04s"]
        ]) el("i", `rl-rg-s rl-rg-s--${type}`, root, { "--y": y, "--h": h, "--x": x, "--w": w, "--a": a, "--b": b, "--c": c, "--d": d });
        for (const [y, h, x, w, color, a, b, c, d] of [
          ["31%", "2px", "-5%", "70%", "", "-40px", "60px", "0px", "0s"],
          ["62%", "1px", "35%", "75%", "var(--rl-rs-ink)", "50px", "-20px", "10px", ".05s"],
          ["74%", "1px", "8%", "45%", "", "20px", "-60px", "12px", ".09s"]
        ]) el("b", "rl-rg-l", root, { "--y": y, "--h": h, "--x": x, "--w": w, ...(color ? { "--lc": color } : {}), "--a": a, "--b": b, "--c": c, "--d": d });
      }
      return root;
    }
    // </resume-layer>
    const archiveListeners = new Set();
    const deletedSessionIds = new Set();
    const subscribeDeleted = (listener) => { archiveListeners.add(listener); return () => archiveListeners.delete(listener); };
    const deletedSnapshot = () => deletedSessionIds.size;
    function markSessionDeleted(id) {
      deletedSessionIds.add(id);
      archiveListeners.forEach((listener) => listener());
    }
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
      billing: "计费与余额", billingOn: "计费与余额 开", billingOff: "计费与余额 关",
      heroBackground: "空白页背景", resumeEffect: "切回动效", resumeTrigger: "切回触发",
      hb_random: "随机", hb_grid: "档案网格", hb_bars: "板条阵列", hb_full: "完整开屏底", hb_off: "关闭",
      rf_random: "随机", rf_scan: "链路恢复扫描", rf_iris: "六边形光圈", rf_glitch: "故障闪切", rf_off: "关闭",
      rt_away: "离开 30 秒后", rt_always: "每次切回", rt_hidden: "最小化或隐藏后",
      previewResume: "预览切回动效", previewResumeNow: "立即预览切回动效",
      billCost: "本对话", billBalance: "余额", billNoKey: "未配置 Key", billFailed: "暂不可用",
      billEstimate: "按模型与当前时段单价估算，仅供参考", billTokens: "未命中 {miss} · 命中 {hit} · 输出 {out}",
      billPeak: "高峰", billOffPeak: "闲时", billSplit: "赠送 {granted} · 充值 {toppedUp}",
      delSession: "删除对话", delConfirm: "再点一次确认删除",
      delDone: "已移到废纸篓，重启 Harness 后从列表中消失",
      delDoneDsh: "已移到 ~/.dsh/trash，重启 Harness 后从列表中消失",
      delLoaded: "这个对话本次启动后打开过，重启 Harness 后再删除",
      delNotArchived: "只能删除已归档的对话", delMissing: "找不到这个对话的记录", delFailed: "删除失败",
      archives: "归档对话", arcHint: "在「设置 → 归档对话」中批量查看和删除已归档的对话",
      arcTitle: "归档对话", arcDesc: "共 {count} 个已归档对话。删除会把对话记录移到废纸篓，可以找回；重启 Harness 后从侧栏消失。",
      arcSelectAll: "全选", arcSelected: "已选 {n} 个", arcEmpty: "没有已归档的对话", arcUntitled: "未命名对话",
      arcDelete: "删除所选（{n}）", arcConfirm: "确认删除 {n} 个", arcProgress: "正在删除 {done}/{total}",
      arcNeedRestart: "本次打开过，重启后再删", arcResult: "已删除 {ok} 个对话", arcResultSkipped: "，{skipped} 个未删除",
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
      billing: "Cost & balance", billingOn: "Cost & balance on", billingOff: "Cost & balance off",
      heroBackground: "Blank page background", resumeEffect: "Resume effect", resumeTrigger: "Resume trigger",
      hb_random: "Random", hb_grid: "Archive grid", hb_bars: "Slat field", hb_full: "Full splash", hb_off: "Off",
      rf_random: "Random", rf_scan: "Link scan", rf_iris: "Hexagonal iris", rf_glitch: "Glitch cut", rf_off: "Off",
      rt_away: "After 30 s away", rt_always: "Every return", rt_hidden: "After minimize or hide",
      previewResume: "Preview resume effect", previewResumeNow: "Preview resume effect now",
      billCost: "This chat", billBalance: "Balance", billNoKey: "No API key", billFailed: "Unavailable",
      billEstimate: "Estimated from the model and the current period's price", billTokens: "Miss {miss} · Hit {hit} · Out {out}",
      billPeak: "Peak", billOffPeak: "Off-peak", billSplit: "Granted {granted} · Topped up {toppedUp}",
      delSession: "Delete conversation", delConfirm: "Click again to delete",
      delDone: "Moved to the Trash; it leaves the list after restarting Harness",
      delDoneDsh: "Moved to ~/.dsh/trash; it leaves the list after restarting Harness",
      delLoaded: "This conversation was opened in this run; restart Harness, then delete it",
      delNotArchived: "Only archived conversations can be deleted", delMissing: "This conversation's record was not found", delFailed: "Delete failed",
      archives: "Archived conversations", arcHint: "Review and delete them in bulk under Settings → Archived conversations",
      arcTitle: "Archived conversations", arcDesc: "{count} archived conversations. Deleting moves them to the trash, where they can be recovered; they leave the sidebar after restarting Harness.",
      arcSelectAll: "Select all", arcSelected: "{n} selected", arcEmpty: "No archived conversations", arcUntitled: "Untitled conversation",
      arcDelete: "Delete selected ({n})", arcConfirm: "Confirm deleting {n}", arcProgress: "Deleting {done}/{total}",
      arcNeedRestart: "Opened this run; restart, then delete", arcResult: "Deleted {ok} conversations", arcResultSkipped: ", {skipped} not deleted",
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
      ".rl-bill{position:relative;display:flex;flex-direction:column;gap:1px;flex:1 1 auto;min-width:0;margin:2px 8px 6px;padding:7px 10px 8px 13px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}",
      ".rl-bill::before{content:\"\";position:absolute;left:0;top:9px;bottom:9px;width:2px;background:var(--dsw-static-deepseek-500)}",
      ".rl-bill-tag{order:-1;display:grid;grid-template-columns:minmax(0,1fr) auto auto;white-space:nowrap;align-items:center;column-gap:5px;margin-bottom:3px;font-size:11px;line-height:14px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-bill-tag::before{content:\"RL · BILLING\";min-width:0;overflow:hidden;white-space:nowrap;font:600 9px/14px ui-monospace,\"SF Mono\",Menlo,monospace;letter-spacing:.16em}",
      ".rl-bill-tag::after{content:\"\";width:5px;height:5px;background:#a5c22a}",
      ".rl-bill[data-peak] .rl-bill-tag::after{background:var(--dsw-static-deepseek-500);animation:rl-bill-pulse 2.4s ease-in-out infinite}",
      ".rl-bill-row{display:flex;align-items:baseline;justify-content:space-between;gap:8px;min-width:0}",
      ".rl-bill-k{flex:none;color:var(--dsw-alias-label-tertiary)}",
      ".rl-bill-v{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:500 12.5px/18px ui-monospace,\"SF Mono\",Menlo,monospace;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}",
      ".rl-bill-row--cost .rl-bill-v{color:var(--dsw-static-deepseek-500)}",
      ".rl-bill[data-state=no-key] .rl-bill-row--balance .rl-bill-v,.rl-bill[data-state=failed] .rl-bill-row--balance .rl-bill-v{font:inherit;color:var(--dsw-alias-label-tertiary)}",
      "@keyframes rl-bill-pulse{50%{opacity:.35}}",
      "@media (prefers-reduced-motion:reduce){.rl-bill *,.rl-bill *::after{animation:none!important}}",
      ".rl-toast-host{position:fixed;left:16px;bottom:16px;z-index:1200;display:flex;flex-direction:column;align-items:flex-start;gap:8px;pointer-events:none}",
      ".rl-toast{position:relative;max-width:320px;padding:9px 12px 9px 14px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-base);box-shadow:var(--dsw-elevation-prominent);font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-primary);animation:rl-toast-in .24s cubic-bezier(.16,1,.3,1) both,rl-toast-out .3s ease-in 3.9s forwards}",
      ".rl-toast::before{content:\"\";position:absolute;left:0;top:8px;bottom:8px;width:2px;background:#a5c22a}",
      ".rl-toast[data-tone=warn]::before{background:var(--dsw-static-deepseek-500)}",
      "@keyframes rl-toast-in{from{opacity:0;transform:translateY(6px)}}",
      "@keyframes rl-toast-out{to{opacity:0;transform:translateY(4px)}}",
      "@media (prefers-reduced-motion:reduce){.rl-toast{animation:none}}",
      ".rl-arcs{display:flex;flex-direction:column;gap:12px;max-width:760px;color:var(--dsw-alias-label-primary)}",
      ".rl-arcs-h{margin:0;font-size:18px;font-weight:600}",
      ".rl-arcs-intro{margin:0;font-size:13px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-arc-bar{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:12px;margin-top:4px;padding:8px;border-bottom:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-base))}",
      ".rl-arc-all{display:inline-flex;align-items:center;gap:10px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);cursor:pointer}",
      ".rl-arc-count{font:500 11px/16px ui-monospace,\"SF Mono\",Menlo,monospace;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary)}",
      ".rl-arc-list{margin:-6px 0 0}",
      ".rl-arc-row{position:relative;display:flex;align-items:center;gap:10px;min-height:46px;padding:6px 8px;border-radius:var(--dsw-radius-md);cursor:pointer}",
      ".rl-arc-row:hover{background:var(--dsw-alias-interactive-bg-hover)}",
      ".rl-arc-row[data-selected]{background:color-mix(in srgb,var(--dsw-static-deepseek-500) 8%,transparent)}",
      ".rl-arc-row[data-selected]::before{content:\"\";position:absolute;left:0;top:11px;bottom:11px;width:2px;background:var(--dsw-static-deepseek-500)}",
      ".rl-arc-check{appearance:none;-webkit-appearance:none;display:grid;place-items:center;flex:none;width:14px;height:14px;margin:0;border:1px solid var(--dsw-alias-border-l3);border-radius:3px;background:transparent;cursor:pointer}",
      ".rl-arc-check:checked{border-color:var(--dsw-static-deepseek-500);background:var(--dsw-static-deepseek-500)}",
      ".rl-arc-check:checked::after{content:\"\";width:6px;height:6px;background:#fff}",
      ".rl-arc-check:disabled{opacity:.5;cursor:default}",
      ".rl-arc-check:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}",
      ".rl-arc-main{display:flex;flex:1;flex-direction:column;min-width:0}",
      ".rl-arc-title,.rl-arc-meta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".rl-arc-title{font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary)}",
      ".rl-arc-meta{font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-arc-note{flex:none;padding:1px 6px;border-radius:var(--dsw-radius-xs);font-size:11px;line-height:16px;color:var(--dsw-static-deepseek-500);background:color-mix(in srgb,var(--dsw-static-deepseek-500) 12%,transparent)}",
      ".rl-arc-row[data-state=failed] .rl-arc-note{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}",
      ".rl-arc-empty{margin:28px 0;text-align:center;font-size:13px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-arc-progress{flex:1;min-width:0;text-align:right;font:500 11px/16px ui-monospace,\"SF Mono\",Menlo,monospace;letter-spacing:.04em;color:var(--dsw-alias-label-tertiary)}",
      ".rl-arc-btn{height:30px;padding:0 14px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);background:transparent;font:500 13px/1 var(--dsw-font-family);color:var(--dsw-alias-label-primary);white-space:nowrap;cursor:pointer}",
      ".rl-arc-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}",
      ".rl-arc-btn--danger{border-color:transparent;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,transparent);color:var(--dsw-alias-state-error-primary)}",
      ".rl-arc-btn--danger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 22%,transparent)}",
      ".rl-arc-btn--danger[data-confirm],.rl-arc-btn--danger[data-confirm]:hover:not(:disabled){background:var(--dsw-alias-state-error-primary);color:#fff}",
      ".rl-arc-btn:disabled{opacity:.45;cursor:default}",
      // Blank-page background: two pseudo-elements on the conversation root
      // while it is in its hero phase, painted under the content
      // (isolation keeps z-index:-1 above the root's own background).
      // <html data-rl-hero> picks the style.
      "html[data-rl-hero] [data-phase=hero]{isolation:isolate;--rl-hb-ink:var(--dsw-alias-label-primary,#141414);--rl-hb-bg:var(--dsw-alias-bg-base,#f4f3ef);--rl-hb-accent:var(--dsw-static-deepseek-500,#e46f24);--rl-hb-line:color-mix(in srgb,var(--rl-hb-ink) 10%,transparent);--rl-hb-strong:color-mix(in srgb,var(--rl-hb-ink) 28%,transparent);--rl-hb-dot:color-mix(in srgb,var(--rl-hb-ink) 11%,transparent);--rl-hb-vig:color-mix(in srgb,var(--rl-hb-ink) 5%,transparent);--rl-hb-bars:var(--rl-img-bars-light,none);--rl-hb-mono:'SF Mono','JetBrains Mono','Cascadia Mono',Menlo,Consolas,monospace;--rl-hb-sans:'Montserrat','Helvetica Neue','PingFang SC','Segoe UI',Arial,sans-serif;",
      "--rl-hb-dots:radial-gradient(var(--rl-hb-dot) 1px,transparent 1.3px) 11px 11px/22px 22px;",
      "--rl-hb-vignette:radial-gradient(ellipse at 50% 44%,transparent 52%,var(--rl-hb-vig) 100%);",
      "--rl-hb-corners:linear-gradient(var(--rl-hb-strong) 0 0) left 24px top 52px/22px 1px no-repeat,linear-gradient(var(--rl-hb-strong) 0 0) left 24px top 52px/1px 22px no-repeat,linear-gradient(var(--rl-hb-strong) 0 0) right 24px top 52px/22px 1px no-repeat,linear-gradient(var(--rl-hb-strong) 0 0) right 24px top 52px/1px 22px no-repeat,linear-gradient(var(--rl-hb-strong) 0 0) left 24px bottom 24px/22px 1px no-repeat,linear-gradient(var(--rl-hb-strong) 0 0) left 24px bottom 24px/1px 22px no-repeat,linear-gradient(var(--rl-hb-strong) 0 0) right 24px bottom 24px/22px 1px no-repeat,linear-gradient(var(--rl-hb-strong) 0 0) right 24px bottom 24px/1px 22px no-repeat;",
      "--rl-hb-pip:linear-gradient(var(--rl-hb-accent) 0 0) left 46px bottom 46px/6px 6px no-repeat;",
      "--rl-hb-guides:linear-gradient(var(--rl-hb-line) 0 0) 0 72%/100% 1px no-repeat,linear-gradient(var(--rl-hb-line) 0 0) 10% 0/1px 100% no-repeat,linear-gradient(var(--rl-hb-strong) 0 0) right 24px top 50%/13px 1px no-repeat,linear-gradient(var(--rl-hb-strong) 0 0) right 30px top 50%/1px 13px no-repeat;",
      "--rl-hb-field:linear-gradient(98deg,var(--rl-hb-bg) 30%,color-mix(in srgb,var(--rl-hb-bg) 70%,transparent) 54%,color-mix(in srgb,var(--rl-hb-bg) 18%,transparent) 86%),linear-gradient(to bottom,var(--rl-hb-bg),transparent 18%,transparent 82%,var(--rl-hb-bg)),var(--rl-hb-bars) right center/cover no-repeat}",
      "html[data-rl-hero] body[data-ds-dark-theme] [data-phase=hero]{--rl-hb-strong:color-mix(in srgb,var(--rl-hb-ink) 24%,transparent);--rl-hb-dot:color-mix(in srgb,var(--rl-hb-ink) 8%,transparent);--rl-hb-vig:rgba(0,0,0,.28);--rl-hb-bars:var(--rl-img-bars-dark,none)}",
      "html[data-rl-hero] [data-phase=hero]::before,html[data-rl-hero] [data-phase=hero]::after{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;box-sizing:border-box}",
      "html[data-rl-hero] [data-phase=hero]::before{display:flex;align-items:flex-end;padding:0 0 45px 60px;font:500 10px/8px var(--rl-hb-mono);letter-spacing:.2em;color:color-mix(in srgb,var(--rl-hb-ink) 42%,transparent);white-space:nowrap;animation:rl-hb-in .7s cubic-bezier(.16,1,.3,1) both}",
      "html[data-rl-hero] [data-phase=hero]::after{content:'DEEPSEEK';top:auto;padding:0 60px 3vh 0;overflow:hidden;text-align:right;white-space:nowrap;font:800 clamp(96px,12vw,232px)/.8 var(--rl-hb-sans);letter-spacing:-.02em;color:transparent;-webkit-text-stroke:1px var(--rl-hb-strong);opacity:.4;animation:rl-hb-mark 1.1s cubic-bezier(.16,1,.3,1) .1s both}",
      "html[data-rl-hero=grid] [data-phase=hero]::before{content:var(--rl-hb-label,'RL-DSH/0.2 \\00B7  TERMINAL READY');background:var(--rl-hb-pip),var(--rl-hb-corners),var(--rl-hb-dots),var(--rl-hb-vignette)}",
      "html[data-rl-hero=bars] [data-phase=hero]::before{background:var(--rl-hb-dots),var(--rl-hb-vignette),var(--rl-hb-field)}",
      "html[data-rl-hero=bars] [data-phase=hero]::after{content:none}",
      "html[data-rl-hero=full] [data-phase=hero]::before{content:var(--rl-hb-label,'RL-DSH/0.2 \\00B7  TERMINAL READY');background:var(--rl-hb-pip),var(--rl-hb-corners),var(--rl-hb-guides),var(--rl-hb-dots),var(--rl-hb-vignette),var(--rl-hb-field)}",
      "@keyframes rl-hb-in{from{opacity:0}}",
      "@keyframes rl-hb-mark{from{opacity:0;transform:translateY(14px)}}",
      "@media (prefers-reduced-motion:reduce){html[data-rl-hero] [data-phase=hero]::before,html[data-rl-hero] [data-phase=hero]::after{animation:none}}",
      // Resume effects: a fixed layer over the whole window that never takes
      // pointer events and is removed once its animation ends (RESUME_MS).
      ".rl-resume{position:fixed;inset:0;z-index:2147483600;pointer-events:none;overflow:hidden;contain:strict;--rl-rs-accent:var(--dsw-static-deepseek-500,#e46f24);--rl-rs-ink:var(--dsw-alias-label-primary,#141414);--rl-rs-bg:var(--dsw-alias-bg-base,#f4f3ef);--rl-rs-io:cubic-bezier(.65,0,.35,1);--rl-rs-out:cubic-bezier(.16,1,.3,1)}",
      ".rl-resume i,.rl-resume b{position:absolute;display:block}",
      // scan: an accent line with a faint wake sweeps down, corner marks
      // close in, and a LINK RESTORED tag blinks in the corner.
      ".rl-rs-line{left:0;right:0;top:0;height:2px;background:var(--rl-rs-accent);box-shadow:0 0 14px 1px var(--rl-rs-accent);animation:rl-rs-sweep .64s var(--rl-rs-io) both}",
      ".rl-rs-line::before{content:'';position:absolute;left:0;right:0;bottom:2px;height:22vh;background:linear-gradient(to bottom,transparent,color-mix(in srgb,var(--rl-rs-accent) 10%,transparent))}",
      ".rl-rs-c{width:26px;height:26px;border:0 solid var(--rl-rs-accent);animation:rl-rs-corner .8s var(--rl-rs-out) both}",
      ".rl-rs-c--tl{top:14px;left:14px;border-top-width:1.5px;border-left-width:1.5px;--dx:-12px;--dy:-12px}",
      ".rl-rs-c--tr{top:14px;right:14px;border-top-width:1.5px;border-right-width:1.5px;--dx:12px;--dy:-12px}",
      ".rl-rs-c--bl{bottom:14px;left:14px;border-bottom-width:1.5px;border-left-width:1.5px;--dx:-12px;--dy:12px}",
      ".rl-rs-c--br{bottom:14px;right:14px;border-bottom-width:1.5px;border-right-width:1.5px;--dx:12px;--dy:12px}",
      ".rl-resume .rl-rs-tag{position:absolute;right:48px;bottom:22px;display:flex;align-items:center;gap:8px;font:600 10px/1 'SF Mono','JetBrains Mono',Menlo,Consolas,monospace;letter-spacing:.24em;color:color-mix(in srgb,var(--rl-rs-ink) 70%,transparent);white-space:nowrap;animation:rl-rs-tag .8s var(--rl-rs-out) both}",
      ".rl-rs-tag>b{position:static;width:6px;height:6px;background:var(--rl-rs-accent);animation:rl-rs-blink .2s steps(1,end) .18s 3 both}",
      "@keyframes rl-rs-sweep{0%{transform:translateY(-2px);opacity:0}8%,86%{opacity:1}100%{transform:translateY(100vh);opacity:0}}",
      "@keyframes rl-rs-corner{0%{opacity:0;transform:translate(var(--dx),var(--dy))}30%,72%{opacity:1;transform:none}100%{opacity:0;transform:none}}",
      "@keyframes rl-rs-tag{0%{opacity:0;transform:translateX(10px)}24%,74%{opacity:1;transform:none}100%{opacity:0;transform:none}}",
      "@keyframes rl-rs-blink{50%{opacity:0}}",
      // iris: the window is veiled, the open-cell emblem seals itself in
      // accent, then a hexagonal aperture opens out of it.
      "@property --rl-ri-s{syntax:'<number>';inherits:true;initial-value:0}",
      ".rl-ri-veil{inset:0;background:radial-gradient(color-mix(in srgb,var(--rl-rs-ink) 9%,transparent) 1px,transparent 1.3px) 11px 11px/22px 22px,var(--rl-rs-bg);",
      "clip-path:polygon(evenodd,0 0,100% 0,100% 100%,0 100%,0 0,50% calc(50% - var(--rl-ri-s)*100px),calc(50% + var(--rl-ri-s)*86.6px) calc(50% - var(--rl-ri-s)*50px),calc(50% + var(--rl-ri-s)*86.6px) calc(50% + var(--rl-ri-s)*50px),50% calc(50% + var(--rl-ri-s)*100px),calc(50% - var(--rl-ri-s)*86.6px) calc(50% + var(--rl-ri-s)*50px),calc(50% - var(--rl-ri-s)*86.6px) calc(50% - var(--rl-ri-s)*50px),50% calc(50% - var(--rl-ri-s)*100px),0 0);",
      "animation:rl-ri-veil .14s ease-out both,rl-ri-open .78s var(--rl-rs-io) .46s both}",
      ".rl-ri-emblem{position:absolute;left:50%;top:50%;width:150px;height:150px;margin:-75px 0 0 -75px;overflow:visible;fill:none;animation:rl-ri-pop .46s cubic-bezier(.34,1.56,.64,1) .04s both}",
      ".rl-ri-emblem circle{stroke:var(--rl-rs-ink);stroke-width:1.2;stroke-dasharray:1;animation:rl-ri-draw .36s var(--rl-rs-out) .06s both}",
      ".rl-ri-emblem .rl-ri-hex,.rl-ri-emblem .rl-ri-seal{stroke:var(--rl-rs-ink);stroke-width:6;stroke-linejoin:miter;stroke-dasharray:1}",
      ".rl-ri-emblem .rl-ri-hex{animation:rl-ri-charge .12s linear .34s both}",
      ".rl-ri-emblem .rl-ri-seal{stroke:var(--rl-rs-accent);animation:rl-ri-draw .16s var(--rl-rs-io) .3s both}",
      ".rl-ri-emblem rect{fill:var(--rl-rs-accent)}",
      ".rl-ri-ring{position:absolute;left:50%;top:50%;width:calc(var(--rl-ri-s)*200px);height:calc(var(--rl-ri-s)*200px);overflow:visible;fill:none;stroke:var(--rl-rs-accent);stroke-width:2;filter:drop-shadow(0 0 6px var(--rl-rs-accent));transform:translate(-50%,-50%);animation:rl-ri-open .78s var(--rl-rs-io) .46s both,rl-ri-fade .2s ease-in 1.04s both}",
      ".rl-ri-ring polygon{vector-effect:non-scaling-stroke}",
      "@keyframes rl-ri-veil{from{opacity:0}}",
      "@keyframes rl-ri-open{0%{--rl-ri-s:0}1%{--rl-ri-s:.33}100%{--rl-ri-s:var(--rl-ri-max,20)}}",
      "@keyframes rl-ri-pop{from{opacity:0;transform:scale(.82)}}",
      "@keyframes rl-ri-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}",
      "@keyframes rl-ri-charge{to{stroke:var(--rl-rs-accent);filter:drop-shadow(0 0 3px var(--rl-rs-accent))}}",
      "@keyframes rl-ri-fade{to{opacity:0}}",
      // glitch: horizontal bands re-filter whatever is behind them and jump
      // sideways for a few frames, with stray accent and ink scan lines.
      ".rl-rg-flash{inset:0;background:color-mix(in srgb,var(--rl-rs-accent) 7%,transparent);animation:rl-rg-flash .4s steps(1,end) both}",
      ".rl-rg-s{left:var(--x,0);width:var(--w,100%);top:var(--y);height:var(--h);animation:rl-rg-jit .4s steps(1,end) var(--d,0s) both}",
      ".rl-rg-s--hi{-webkit-backdrop-filter:brightness(1.18) contrast(1.35) saturate(1.6);backdrop-filter:brightness(1.18) contrast(1.35) saturate(1.6);background:color-mix(in srgb,var(--rl-rs-accent) 9%,transparent)}",
      ".rl-rg-s--inv{-webkit-backdrop-filter:invert(1) hue-rotate(180deg);backdrop-filter:invert(1) hue-rotate(180deg)}",
      ".rl-rg-s--dim{-webkit-backdrop-filter:blur(2px) saturate(.4) brightness(1.04);backdrop-filter:blur(2px) saturate(.4) brightness(1.04);background:color-mix(in srgb,var(--rl-rs-ink) 4%,transparent)}",
      ".rl-rg-s--blk{background:var(--rl-rs-accent);box-shadow:0 0 8px color-mix(in srgb,var(--rl-rs-accent) 60%,transparent)}",
      ".rl-rg-l{left:var(--x,-5%);width:var(--w,110%);top:var(--y);height:var(--h,1px);background:var(--lc,var(--rl-rs-accent));box-shadow:0 0 6px var(--lc,var(--rl-rs-accent));animation:rl-rg-jit .4s steps(1,end) var(--d,0s) both}",
      "@keyframes rl-rg-flash{0%{opacity:1}15%{opacity:0}40%{opacity:.6}52%,100%{opacity:0}}",
      "@keyframes rl-rg-jit{0%{opacity:1;transform:translateX(var(--a))}20%{transform:translate(var(--b),var(--j,0))}45%{transform:translateX(var(--c))}70%{opacity:1;transform:translate(var(--b),calc(var(--j,0px) * -1))}82%,100%{opacity:0;transform:none}}",
      "@media (prefers-reduced-motion:reduce){.rl-resume{display:none}}",
    ].join("");

    function specs() {
      const number = P.settingsNumberField("duration");
      return [
        ...switches.map((field) => ({ field,
          format: (value) => String(typeof value === "boolean" ? value : CONFIG[field] ?? true),
          parse: (text) => ["true", "false"].includes(text) ? { kind: "set", value: text === "true" } : undefined
        })),
        ...[ ["exit", exits], ["theme", themes], ["logo", logos], ["heroBackground", heroBackgrounds], ["resumeEffect", resumeEffects], ["resumeTrigger", resumeTriggers] ].map(([field, choices]) => ({ field,
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

    let toastHost;
    function showToast(text, tone) {
      if (!toastHost) {
        toastHost = document.createElement("div");
        toastHost.className = "rl-toast-host";
        document.body.append(toastHost);
      }
      const toast = document.createElement("div");
      toast.className = "rl-toast";
      toast.dataset.tone = tone;
      toast.setAttribute("role", "status");
      toast.textContent = text;
      toastHost.append(toast);
      setTimeout(() => toast.remove(), 4200);
    }

    function DeleteSessionMenuItem({ sessionId, useMenuOpenState, t, workspaces }) {
      React.useSyncExternalStore(subscribeDeleted, deletedSnapshot);
      const snapshot = React.useSyncExternalStore(
        (fn) => workspaces.list.subscribe(fn),
        () => workspaces.list.getSnapshot()
      );
      const [, setMenuOpen] = useMenuOpenState();
      const [confirming, setConfirming] = React.useState(false);
      const [busy, setBusy] = React.useState(false);
      const mounted = React.useRef(true);
      React.useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
      }, []);
      React.useEffect(() => {
        if (!confirming) return;
        const timer = setTimeout(() => setConfirming(false), 4000);
        return () => clearTimeout(timer);
      }, [confirming]);

      const onSelect = async () => {
        if (busy) return;
        if (!confirming) { setConfirming(true); return; }
        setMenuOpen(false);
        setBusy(true);
        try {
          const response = await fetch("/rhine-splash/sessions/delete", {
            method: "POST",
            headers: { "content-type": "application/json", "x-rhine-splash": "1" },
            body: JSON.stringify({ sessionId })
          });
          const value = await response.json().catch(() => null);
          if (value?.status === "deleted" || value?.status === "missing") markSessionDeleted(sessionId);
          if (value?.status === "deleted") {
            showToast(t(value.trash === "system" ? "delDone" : "delDoneDsh"), "ok");
          } else {
            const key = { loaded: "delLoaded", "not-archived": "delNotArchived", missing: "delMissing" }[value?.status];
            showToast(t(key || "delFailed"), "warn");
          }
        } catch {
          showToast(t("delFailed"), "warn");
        } finally {
          if (mounted.current) { setBusy(false); setConfirming(false); }
        }
      };
      if (deletedSessionIds.has(sessionId) || !snapshot.archivedSessionIds?.includes(sessionId)) return null;
      return jsx(P.MenuItemButton, {
        separatorBefore: true, danger: true, disabled: busy,
        icon: jsx(P.IconTrashOutlineRegular, { size: 14 }), onSelect,
        children: t(confirming ? "delConfirm" : "delSession")
      });
    }

    function ArchiveSection({ workspaces, sessions, t }) {
      const deletedCount = React.useSyncExternalStore(subscribeDeleted, deletedSnapshot);
      const workspaceSnapshot = React.useSyncExternalStore(
        React.useCallback((listener) => workspaces.list.subscribe(listener), [workspaces]),
        () => workspaces.list.getSnapshot()
      );
      const sessionSnapshot = React.useSyncExternalStore(
        React.useCallback((listener) => sessions.list.subscribe(listener), [sessions]),
        () => sessions.list.getSnapshot()
      );
      const [selected, setSelected] = React.useState(() => new Set());
      const [notes, setNotes] = React.useState(() => new Map());
      const [confirming, setConfirming] = React.useState(false);
      const [busy, setBusy] = React.useState(false);
      const [progress, setProgress] = React.useState(null);
      const mounted = React.useRef(true);
      React.useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
      }, []);
      const rows = React.useMemo(() => {
        const basename = (path) => path?.split(/[\\/]/).filter(Boolean).pop() || "";
        const year = new Date().getFullYear();
        return (workspaceSnapshot?.archivedSessionIds || []).filter((id) => !deletedSessionIds.has(id)).map((id) => {
          const entry = sessionSnapshot?.byId?.[id];
          const workspace = (workspaceSnapshot?.items || []).find((item) => item.sessionIds?.includes(id));
          const updatedAt = Number.isFinite(entry?.updatedAt) ? entry.updatedAt : null;
          const date = updatedAt === null ? "" : new Intl.DateTimeFormat(undefined,
            new Date(updatedAt).getFullYear() === year
              ? { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }
              : { year: "numeric", month: "2-digit", day: "2-digit" }
          ).format(new Date(updatedAt));
          return { id, title: entry?.title || entry?.displayTitle || t("arcUntitled"), workspace: basename(workspace?.path) || basename(entry?.cwd), date, updatedAt };
        }).sort((a, b) => (b.updatedAt ?? -Infinity) - (a.updatedAt ?? -Infinity));
      }, [workspaceSnapshot, sessionSnapshot, deletedCount, t]);
      React.useEffect(() => {
        const ids = new Set(rows.map((row) => row.id));
        setSelected((current) => {
          const next = new Set([...current].filter((id) => ids.has(id)));
          return next.size === current.size ? current : next;
        });
      }, [rows]);
      React.useEffect(() => {
        if (!confirming) return;
        const timer = setTimeout(() => { if (mounted.current) setConfirming(false); }, 4000);
        return () => clearTimeout(timer);
      }, [confirming]);
      const onDelete = async () => {
        if (busy || !selected.size) return;
        if (!confirming) { setConfirming(true); return; }
        const ids = [...selected];
        setBusy(true);
        setConfirming(false);
        setProgress({ done: 0, total: ids.length });
        let ok = 0, skipped = 0;
        for (const [index, sessionId] of ids.entries()) {
          let status;
          try {
            const response = await fetch("/rhine-splash/sessions/delete", {
              method: "POST", headers: { "content-type": "application/json", "x-rhine-splash": "1" },
              body: JSON.stringify({ sessionId })
            });
            status = (await response.json())?.status;
          } catch { status = "failed"; }
          if (status === "deleted" || status === "missing") {
            ok++;
            markSessionDeleted(sessionId);
            if (mounted.current) setSelected((current) => {
              const next = new Set(current); next.delete(sessionId); return next;
            });
          } else {
            skipped++;
            const state = status === "loaded" || status === "not-archived" ? status : "failed";
            const text = t(state === "loaded" ? "arcNeedRestart" : state === "not-archived" ? "delNotArchived" : "delFailed");
            if (mounted.current) setNotes((current) => new Map(current).set(sessionId, { state, text }));
          }
          if (mounted.current) setProgress({ done: index + 1, total: ids.length });
        }
        if (mounted.current) { setBusy(false); setProgress(null); }
        showToast(fill(t("arcResult"), { ok }) + (skipped ? fill(t("arcResultSkipped"), { skipped }) : ""), skipped ? "warn" : "ok");
      };
      const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
      return jsxs("div", {
        className: "rl-arcs", children: [
          jsx("h2", { className: "rl-arcs-h", children: t("arcTitle") }),
          jsx("p", { className: "rl-arcs-intro", children: fill(t("arcDesc"), { count: rows.length }) }),
          jsxs("div", { className: "rl-arc-bar", children: [
            jsxs("label", { className: "rl-arc-all", children: [
              jsx("input", { type: "checkbox", className: "rl-arc-check", checked: allSelected, disabled: busy || !rows.length,
                onChange: () => setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id))) }),
              jsx("span", { children: t("arcSelectAll") })
            ] }),
            jsx("span", { className: "rl-arc-count", children: fill(t("arcSelected"), { n: selected.size }) }),
            jsx("span", { className: "rl-arc-progress", children: progress ? fill(t("arcProgress"), progress) : "" }),
            jsx("button", { type: "button", className: "rl-arc-btn rl-arc-btn--danger", "data-confirm": confirming ? "true" : undefined,
              disabled: busy || !selected.size, onClick: onDelete, children: fill(t(confirming ? "arcConfirm" : "arcDelete"), { n: selected.size }) })
          ] }, "bar"),
          rows.length ? jsx("div", { className: "rl-arc-list", role: "list", children: rows.map((row) => {
            const note = notes.get(row.id);
            return jsxs("label", { className: "rl-arc-row", role: "listitem", "data-state": note?.state,
              "data-selected": selected.has(row.id) ? "true" : undefined, children: [
                jsx("input", { type: "checkbox", className: "rl-arc-check", checked: selected.has(row.id), disabled: busy,
                  onChange: () => setSelected((current) => {
                    const next = new Set(current); if (next.has(row.id)) next.delete(row.id); else next.add(row.id); return next;
                  }) }),
                jsxs("span", { className: "rl-arc-main", children: [
                  jsx("span", { className: "rl-arc-title", children: row.title }),
                  jsx("span", { className: "rl-arc-meta", children: [row.workspace, row.date].filter(Boolean).join(" · ") })
                ] }),
                note ? jsx("span", { className: "rl-arc-note", children: note.text }) : null
              ] }, row.id);
          }) }, "list") : jsx("p", { className: "rl-arc-empty", children: t("arcEmpty") }, "empty")
        ]
      });
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
        if (switches.includes(key) || key === "exit" || key === "theme" || key === "logo" || Object.hasOwn(choiceLabel, key)) {
          // SettingsValueField has a fixed text input and no control/children slot.
          // Keep its staged-value/reset semantics with the confirmed controls.
          return jsxs("div", { className: "rl-cfg-row", children: [
            jsx("span", { className: "rl-cfg-label", children: t(key) }),
            switches.includes(key) ? jsx(P.Switch, { checked: value.text === "true", label: t(key), disabled,
              onChange: (checked) => { onEdit(String(checked)); props.scheduleSave(0); }
            }) : jsx(P.SegmentedControl, { id, value: value.text, label: t(key), disabled,
              options: (key === "exit" ? exits : key === "logo" ? logos : key === "heroBackground" ? heroBackgrounds : key === "resumeEffect" ? resumeEffects : key === "resumeTrigger" ? resumeTriggers : themes).map((choice) => ({ value: choice, label: t((choiceLabel[key] || "") + choice) })),
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
        group("text", texts), group("interface", ["uiTheme", "brand", "logo", "heroBackground", "resumeEffect", "resumeTrigger", "effortSlider", "billing"]),
        jsxs("section", { className: "rl-cfg-section", children: [
          jsx("h3", { className: "rl-cfg-h", children: t("archives") }),
          jsx("div", { className: "rl-cfg-row", children:
            jsx("span", { className: "rl-cfg-label", children: t("arcHint") })
          })
        ] }, "archives"),
        jsxs("div", { className: "rl-cfg-actions", children: [
          jsxs("button", { type: "button", className: "rl-cfg-preview", onClick: () => props.preview(), children: [jsx("i", {}), t("preview")] }),
          jsxs("button", { type: "button", className: "rl-cfg-preview", onClick: () => props.previewResume(), children: [jsx("i", {}), t("previewResume")] }),
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

    function isPeak(now) {
      const beijing = new Date(now + 8 * 60 * 60 * 1000);
      const day = beijing.getUTCDay();
      const hour = beijing.getUTCHours();
      return day >= 1 && day <= 5 && ((hour >= 9 && hour < 12) || (hour >= 14 && hour < 18));
    }

    function priceOf(model, currency) {
      if (typeof model === "string" && model.startsWith("deepseek-v4-flash")) model = "deepseek-flash";
      const prices = {
        CNY: { "deepseek-flash": { hit: 0.04, miss: 2, out: 8 }, "deepseek-v4-pro": { hit: 0.30, miss: 9, out: 27 } },
        USD: { "deepseek-flash": { hit: 0.006, miss: 0.3, out: 1.2 }, "deepseek-v4-pro": { hit: 0.044, miss: 1.32, out: 3.96 } }
      };
      return Object.hasOwn(prices, currency) && Object.hasOwn(prices[currency], model) ? prices[currency][model] : null;
    }

    function costOf(delta, rates, peak) {
      return (delta.miss * rates.miss + delta.hit * rates.hit + delta.out * rates.out) / 1000000 * (peak ? 1 : 0.5);
    }

    const billingLedgers = new Map();
    function readLedger(sessionId) {
      if (billingLedgers.has(sessionId)) return billingLedgers.get(sessionId);
      try {
        const value = JSON.parse(localStorage.getItem("rhine-splash:bill:" + sessionId));
        if (value && ["CNY", "USD"].includes(value.currency)
          && (value.cost === null || (Number.isFinite(value.cost) && value.cost >= 0))
          && ["miss", "hit", "out"].every((key) => Number.isFinite(value.seen?.[key]) && value.seen[key] >= 0)) {
          billingLedgers.set(sessionId, value);
          return value;
        }
      } catch {}
      return null;
    }

    function usageBuckets(usage) {
      const count = (value) => Number.isFinite(value) && value >= 0 ? value : 0;
      return { miss: count(usage.uncachedInputTokens) + count(usage.cacheWriteTokens),
        hit: count(usage.cacheReadTokens), out: count(usage.outputTokens) };
    }

    function recordUsage(sessionId, usage, model, currency) {
      if (typeof model !== "string") return readLedger(sessionId);
      const seen = usageBuckets(usage);
      const previous = readLedger(sessionId);
      currency = previous?.currency || currency;
      const rates = priceOf(model, currency);
      let cost = previous?.cost ?? null;
      if (!previous || previous.cost === null) cost = rates ? costOf(seen, rates, isPeak(Date.now())) : null;
      else {
        const delta = Object.fromEntries(Object.keys(seen).map((key) => [key, seen[key] - previous.seen[key]]));
        if (!rates) cost = null;
        else if (Object.values(delta).every((value) => value >= 0) && Object.values(delta).some((value) => value > 0)) {
          cost = (cost ?? 0) + costOf(delta, rates, isPeak(Date.now()));
        }
      }
      const ledger = { seen, cost, currency };
      billingLedgers.set(sessionId, ledger);
      try { localStorage.setItem("rhine-splash:bill:" + sessionId, JSON.stringify(ledger)); } catch {}
      return ledger;
    }

    function preferredBalances(value) {
      return [...(value?.balances || [])].sort((a, b) => Number(b.total) - Number(a.total)
        || (a.currency === b.currency ? 0 : a.currency === "CNY" ? -1 : 1));
    }

    function BillingWidget({ wide, t, selection, sessions, models }) {
      const selected = React.useSyncExternalStore(
        React.useCallback((fn) => selection.subscribe(fn), [selection]),
        React.useCallback(() => selection.getSnapshot(), [selection])
      );
      const sessionId = selected?.sessionId;
      const [balance, setBalance] = React.useState({ status: "loading", value: null });
      const [usage, setUsage] = React.useState(null);
      const [, setMinute] = React.useState(0);
      const currency = React.useRef("CNY");
      const refresh = React.useRef(() => {});
      const debounce = React.useRef(0);
      currency.current = preferredBalances(balance.value)[0]?.currency || "CNY";

      React.useEffect(() => {
        let active = true, pending = false;
        const controller = new AbortController();
        const load = async () => {
          if (pending) return;
          pending = true;
          try {
            const response = await fetch("/rhine-splash/balance", { cache: "no-store", signal: controller.signal });
            if (!response.ok) throw new Error("Balance unavailable");
            const value = await response.json();
            if (value?.status !== "no-key" && !(value?.status === "ready" && Array.isArray(value.balances) && value.balances.length)) {
              throw new Error("Balance unavailable");
            }
            if (active) setBalance((previous) => ({ status: value.status, value: value.status === "ready" ? value : previous.value }));
          } catch {
            if (active) setBalance((previous) => ({ ...previous, status: "failed" }));
          } finally { pending = false; }
        };
        refresh.current = load;
        load();
        const timer = setInterval(() => { setMinute((value) => value + 1); load(); }, 60000);
        return () => { active = false; controller.abort(); clearInterval(timer); clearTimeout(debounce.current); };
      }, []);

      React.useEffect(() => {
        const resolveFace = () => sessionId ? sessions.binding(sessionId)?.session.projections.faceOf("tokenUsage") : undefined;
        let face, unsubscribe, retryTimer, attempts = 0;
        const update = () => {
          const value = face?.getSnapshot();
          if (!sessionId || !value) { setUsage(null); return; }
          let model;
          try { model = models.directoryFor(sessionId).store.getSnapshot().current?.model; } catch {}
          const ledger = recordUsage(sessionId, value, model, currency.current);
          setUsage({ sessionId, ledger });
          clearTimeout(debounce.current);
          debounce.current = setTimeout(() => refresh.current(), 4000);
        };
        const subscribeFace = () => {
          face = resolveFace();
          attempts++;
          if (face) unsubscribe = face.subscribe(update);
          else if (sessionId && attempts < 60) retryTimer = setTimeout(subscribeFace, 500);
          update();
        };
        let directoryStore;
        if (sessionId) {
          try { directoryStore = models.directoryFor(sessionId).store; } catch {}
        }
        const unsubscribeDirectory = directoryStore?.subscribe(update);
        subscribeFace();
        return () => {
          unsubscribe?.();
          unsubscribeDirectory?.();
          clearTimeout(retryTimer);
          clearTimeout(debounce.current);
        };
      }, [sessionId, sessions, models]);

      if (!wide || CONFIG.billing === false) return null;
      const peak = isPeak(Date.now());
      const ledger = usage && usage.sessionId === sessionId ? usage.ledger : null;
      const symbol = (code) => code === "USD" ? "$" : "¥";
      const cost = ledger?.cost;
      const costText = cost == null ? "—" : symbol(ledger.currency) + cost.toFixed(cost < 0.01 ? 4 : cost < 1 ? 3 : 2);
      const buckets = ledger?.seen || { miss: 0, hit: 0, out: 0 };
      // Existing translations use no parameters; interpolate the localized templates.
      const interpolate = (key, values) => Object.entries(values).reduce((text, [name, value]) => text.replace("{" + name + "}", value), t(key));
      const costTitle = t("billEstimate") + "\n" + interpolate("billTokens", Object.fromEntries(
        Object.entries(buckets).map(([key, value]) => [key, Math.trunc(value).toLocaleString()])
      ));
      const balances = preferredBalances(balance.value);
      const showBalance = balance.status === "ready" || (balance.status === "failed" && balances.length > 0);
      const balanceText = showBalance ? balances.map((entry) => symbol(entry.currency) + Number(entry.total).toFixed(2)).join(" / ")
        : balance.status === "no-key" ? t("billNoKey") : balance.status === "failed" ? t("billFailed") : "—";
      const balanceTitle = showBalance ? balances.map((entry) => interpolate("billSplit", {
        granted: symbol(entry.currency) + Number(entry.granted).toFixed(2),
        toppedUp: symbol(entry.currency) + Number(entry.toppedUp).toFixed(2)
      })).join(" / ") : "";
      return jsxs("div", { className: "rl-bill", "data-peak": peak ? "true" : undefined, "data-state": balance.status, children: [
        jsxs("div", { className: "rl-bill-row rl-bill-row--cost", title: costTitle, children: [
          jsx("span", { className: "rl-bill-k", children: t("billCost") }),
          jsx("span", { className: "rl-bill-v", children: costText })
        ] }),
        jsxs("div", { className: "rl-bill-row rl-bill-row--balance", title: balanceTitle, children: [
          jsx("span", { className: "rl-bill-k", children: t("billBalance") }),
          jsx("span", { className: "rl-bill-v", children: balanceText })
        ] }),
        jsx("span", { className: "rl-bill-tag", children: t(peak ? "billPeak" : "billOffPeak") })
      ] });
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }));
      const t = ctx.locale.bind(NS);
      const pickRandom = (choices, key) => {
        let last = null;
        try { last = localStorage.getItem(key); } catch {}
        const pool = choices.filter((choice) => choice !== last);
        const pick = pool[Math.floor(Math.random() * pool.length)] ?? choices[0];
        try { localStorage.setItem(key, pick); } catch {}
        return pick;
      };
      const cssString = (text) => '"' + String(text).replace(/[\\"\n\r]/g, (c) => "\\" + c.charCodeAt(0).toString(16) + " ") + '"';
      ctx.effect(() => {
        const mode = heroBackgrounds.includes(CONFIG.heroBackground) ? CONFIG.heroBackground : "random";
        if (mode === "off") return undefined;
        const style = mode === "random" ? pickRandom(["grid", "bars", "full"], "rhine-splash:hero-last") : mode;
        const code = typeof CONFIG.code === "string" && CONFIG.code ? CONFIG.code : "RL-DSH/0.2";
        document.documentElement.dataset.rlHero = style;
        document.documentElement.style.setProperty("--rl-hb-label", cssString(`${code} · TERMINAL READY`));
        return () => {
          delete document.documentElement.dataset.rlHero;
          document.documentElement.style.removeProperty("--rl-hb-label");
        };
      });
      let playing = null;
      const playResume = (kind) => {
        if (playing || !RESUME_MS[kind] || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const node = resumeLayer(document, kind);
        document.body.append(node);
        const entry = { node, timer: setTimeout(() => { node.remove(); if (playing === entry) playing = null; }, RESUME_MS[kind]) };
        playing = entry;
      };
      const resumeKind = (mode) => mode === "random" || mode === "off" || !resumeEffects.includes(mode) ? pickRandom(["scan", "iris", "glitch"], "rhine-splash:resume-last") : mode;
      const previewResume = () => playResume(resumeKind(stagedConfig().resumeEffect));
      ctx.effect(() => () => { if (playing) { clearTimeout(playing.timer); playing.node.remove(); playing = null; } });
      ctx.effect(() => {
        if (CONFIG.resumeEffect === "off") return undefined;
        const mode = resumeEffects.includes(CONFIG.resumeEffect) ? CONFIG.resumeEffect : "random";
        const trigger = resumeTriggers.includes(CONFIG.resumeTrigger) ? CONFIG.resumeTrigger : "away";
        const AWAY_MS = 30000;
        let leftAt = 0, wasHidden = false, blurTimer = 0;
        const leave = () => { if (!leftAt) leftAt = Date.now(); };
        const back = () => {
          clearTimeout(blurTimer);
          if (!leftAt) return;
          const away = Date.now() - leftAt;
          const hidden = wasHidden;
          leftAt = 0;
          wasHidden = false;
          if (document.visibilityState !== "visible" || document.getElementById("rhine-splash")) return;
          if (trigger === "away" && away < AWAY_MS) return;
          if (trigger === "hidden" && !hidden) return;
          playResume(resumeKind(mode));
        };
        const blur = () => {
          clearTimeout(blurTimer);
          blurTimer = setTimeout(() => {
            if (document.visibilityState === "visible" && document.activeElement?.tagName === "IFRAME") return;
            leave();
          }, 0);
        };
        const visibilitychange = () => {
          if (document.visibilityState === "hidden") {
            wasHidden = true;
            leave();
          } else {
            back();
          }
        };
        window.addEventListener("blur", blur);
        document.addEventListener("visibilitychange", visibilitychange);
        window.addEventListener("focus", back);
        return () => {
          window.removeEventListener("blur", blur);
          document.removeEventListener("visibilitychange", visibilitychange);
          window.removeEventListener("focus", back);
          clearTimeout(blurTimer);
        };
      });
      ctx.inject(["slots", "workspaces"], (scope) => scope.slots.inject("sidebar.workspaces.session.menu.item", () => scope.slots.register({
        name: "sidebar.workspaces.session.menu.item", id: "rhine-delete", order: 460, locale: NS,
        inject: () => ({ workspaces: scope.workspaces })
      }, DeleteSessionMenuItem)));
      ctx.inject(["slots", "workspaces", "sessions"], (scope) => scope.slots.inject("settings.section", () => {
        if ((scope.slots.entries?.("settings.section") || []).some((entry) => entry.options?.id === "archived-sessions")) return undefined;
        try {
          return scope.slots.register({
            name: "settings.section", id: "archived-sessions", order: 25, label: () => t("archives"), locale: NS,
            inject: () => ({ workspaces: scope.workspaces, sessions: scope.sessions })
          }, ArchiveSection);
        } catch (error) {
          console.warn("rhine-splash: archived conversations settings page not registered", error);
          return undefined;
        }
      }));
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
      if (CONFIG.billing !== false) ctx.inject(["slots", "uiWorkspace", "sessions", "modelDirectories"], (scope) => {
        scope.slots.inject("sidebar.footer.action", () => scope.slots.register({
          name: "sidebar.footer.action", id: "rhine-billing", order: -10, locale: NS,
          inject: () => ({ selection: scope.uiWorkspace.selection, sessions: scope.sessions, models: scope.modelDirectories })
        }, BillingWidget));
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
      const stagedConfig = () => {
        const value = { ...CONFIG, ...(scope.getSnapshot().value || {}) };
        for (const spec of specs()) {
          const write = spec.parse(form.field(spec.field).text);
          if (write?.kind === "set") value[spec.field] = write.value;
        }
        return value;
      };
      const previewSplash = () => {
        globalThis.__rhineSplash?.replay({ ...stagedConfig(), enabled: true });
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
        inject: () => ({ hooks: { rhineSplash: store }, ...form.actions(), scheduleSave, preview: () => previewSplash(), previewResume: () => previewResume() })
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
            const rows = [option("preview", "previewNow", "actions"), option("previewResume", "previewResumeNow", "actions")];
            if (scope.getSnapshot().status !== "ready" || !scope.getSnapshot().writable) return rows;
            rows.push(option("enabled:true", "on", "splash", "enabled", true), option("enabled:false", "off", "splash", "enabled", false));
            for (const exit of exits) rows.push(option(`exit:${exit}`, exit, "exit", "exit", exit));
            for (const field of ["uiTheme", "brand", "effortSlider", "billing"]) for (const value of [true, false]) rows.push(option(`${field}:${value}`, `${field}${value ? "On" : "Off"}`, "interface", field, value));
            for (const logo of logos) rows.push(option(`logo:${logo}`, logo === "plate" ? "logoPlate" : "logoCell", "interface", "logo", logo));
            for (const [key, choices] of [["heroBackground", heroBackgrounds], ["resumeEffect", resumeEffects], ["resumeTrigger", resumeTriggers]]) {
              for (const value of choices) rows.push(option(`${key}:${value}`, choiceLabel[key] + value, key, key, value));
            }
            return rows;
          },
          onSelect: async (selected) => {
            if (selected.id === "preview") { previewSplash(); return; }
            if (selected.id === "previewResume") { previewResume(); return; }
            const [field, raw] = selected.id.split(":");
            if (!(field === "exit" ? exits.includes(raw) : field === "logo" ? logos.includes(raw) : field === "heroBackground" ? heroBackgrounds.includes(raw) : field === "resumeEffect" ? resumeEffects.includes(raw) : field === "resumeTrigger" ? resumeTriggers.includes(raw) : ["enabled", "uiTheme", "brand", "effortSlider", "billing"].includes(field) && ["true", "false"].includes(raw))) return;
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

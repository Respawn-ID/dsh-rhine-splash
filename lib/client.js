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
    const VERSION = typeof CONFIG.version === "string" ? CONFIG.version : "";
    const BRAND = globalThis.__RHINE_BRAND__ || {};
    const exits = ["random", "doors", "decode", "glitch", "iris"];
    const themes = ["auto", "light", "dark"];
    const logos = ["plate", "cell"];
    const accents = ["rhine", "life", "ocean", "crimson", "custom"];
    const bases = ["warm", "neutral", "official"];
    const NEXT_LAUNCH = ["splash", "text"];
    const validColor = (value) => typeof value === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
    const expandColor = (value) => value.length === 4 ? "#" + [...value.slice(1)].map((c) => c + c).join("") : value;
    const heroBackgrounds = ["random", "plain", "diagonal", "horizon", "grid", "off"];
    const resumeEffects = ["random", "scan", "iris", "glitch", "off"];
    const resumeTriggers = ["hidden", "away", "always"];
    const costOpens = ["page", "popup"];
    // One table drives the config page, the /splash command, specs and validation.
    // type: switch | choice | swatch | color | number | money | text; section: config page group;
    // label: locale prefix for choice values; command: listed in /splash.
    const FIELDS = {
      enabled: { type: "switch", section: "splash", command: true },
      splashWhen: { type: "choice", choices: ["launch", "daily", "update"], label: "sw_", section: "splash", command: true },
      exit: { type: "choice", choices: exits, section: "splash", command: true },
      theme: { type: "choice", choices: themes, section: "splash" },
      duration: { type: "number", section: "splash" },
      skippable: { type: "switch", section: "splash" },
      replayOnReload: { type: "switch", section: "splash" },
      title: { type: "text", section: "text" },
      subtitle: { type: "text", section: "text" },
      code: { type: "text", section: "text" },
      uiTheme: { type: "switch", section: "appearance", command: true },
      accent: { type: "swatch", choices: accents, label: "ac_", section: "appearance", command: true },
      accentColor: { type: "color", section: "appearance", showIf: ["accent", "custom"] },
      base: { type: "choice", choices: bases, label: "bs_", section: "appearance", command: true },
      brand: { type: "switch", section: "appearance", command: true },
      logo: { type: "choice", choices: logos, section: "appearance", command: true },
      // aliases: retired values and the choice that replaced them.
      heroBackground: { type: "choice", choices: heroBackgrounds, aliases: { bars: "diagonal", full: "diagonal" }, label: "hb_", section: "appearance", command: true },
      heroMark: { type: "choice", choices: ["thin", "bold"], label: "hm_", section: "appearance", command: true },
      resumeEffect: { type: "choice", choices: resumeEffects, label: "rf_", section: "motion", command: true },
      resumeTrigger: { type: "choice", choices: resumeTriggers, label: "rt_", section: "motion", command: true },
      notifyCurrent: { type: "switch", section: "notifyWhen", command: true },
      notifyOthers: { type: "switch", section: "notifyWhen", command: true },
      notifyAway: { type: "switch", section: "notifyWhen", command: true },
      notifyMinRun: { type: "number", section: "notifyWhen", min: 0, max: 600, integer: true, command: false },
      quietHours: { type: "switch", section: "notify", command: true },
      quietFrom: { type: "number", section: "notify", min: 0, max: 23, integer: true, showIf: ["quietHours", "true"] },
      quietTo: { type: "number", section: "notify", min: 0, max: 23, integer: true, showIf: ["quietHours", "true"] },
      notifySystem: { type: "switch", section: "notify", command: true },
      notifyToast: { type: "switch", section: "notify", command: true },
      notifySound: { type: "switch", section: "notify", command: true },
      effortSlider: { type: "switch", section: "tools", command: true },
      billing: { type: "switch", section: "tools", command: true },
      costOpen: { type: "choice", choices: costOpens, label: "co_", section: "tools", command: true },
      weeklyReport: { type: "switch", section: "tools", command: true },
      todoCenter: { type: "switch", section: "tools", command: true },
      rowStatus: { type: "switch", section: "tools" },
      budgetDaily: { type: "money", section: "tools" },
      budgetSession: { type: "money", section: "tools" },
      balanceAlert: { type: "money", section: "tools" },
      updateCheck: { type: "switch", section: "tools", command: true }
    };
    const SECTIONS = ["splash", "text", "appearance", "motion", "notifyWhen", "notify", "tools"];
    // Extra line under a config page group, by section.
    const SECTION_NOTES = { notifyWhen: "notifyWhenNote", notify: "notifyNote", appearance: "appearanceNote", tools: "toolsNote" };
    // Preview actions, in order, on the config page and at the top of /splash.
    const PREVIEWS = [
      { id: "preview", page: "preview", command: "previewNow" },
      { id: "previewResume", page: "previewResume", command: "previewResumeNow" },
      { id: "previewNotify", page: "previewNotify", command: "previewNotifyNow" }
    ];
    function fill(text, values) {
      return text.replace(/\{([^{}]+)\}/g, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match);
    }
    // <resume-layer> Resume effect markup. Self-contained so preview/hero.html
    // can lift this block out of the file and render exactly the same nodes.
    const RESUME_MS = { scan: 980, iris: 1240, glitch: 620 };
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
      // A HUD label: Rhine square, monospace text, optional growing rule.
      const label = (className, text, parent, rule) => {
        const node = el("span", `rl-rs-label ${className}`, parent);
        el("b", "", node);
        node.append(text);
        if (rule) el("i", "rl-rs-rule", node);
        return node;
      };
      const root = doc.createElement("div");
      root.className = `rl-resume rl-resume--${kind}`;
      root.setAttribute("aria-hidden", "true");
      if (kind === "scan") {
        // A dot grid is exposed only in the wake of the sweeping line.
        el("i", "rl-rs-grid", root);
        el("i", "rl-rs-line", root);
        for (const corner of ["tl", "tr", "bl", "br"]) el("i", `rl-rs-c rl-rs-c--${corner}`, root);
        label("rl-rs-tag", "LINK RESTORED", root, true);
      } else if (kind === "iris") {
        // Aperture scale in 100 px units: wide enough that the hexagon's
        // inner radius clears the farthest window corner.
        const view = doc.defaultView || {};
        const reach = Math.hypot((view.innerWidth || 1600) / 2, (view.innerHeight || 1000) / 2);
        root.style.setProperty("--rl-ri-max", String(reach / 0.866 / 100 + 0.3));
        const veil = el("i", "rl-ri-veil", root);
        svg("rl-ri-emblem", "0 0 220 220", '<circle class="rl-ri-ticks" cx="110" cy="110" r="104"/>'
          + '<circle class="rl-ri-disc" cx="110" cy="110" r="90" pathLength="1" transform="rotate(-90 110 110)"/>'
          + '<path class="rl-ri-hex" pathLength="1" d="M151.57 86V134L110 158L68.43 134V86L110 62"/>'
          + '<path class="rl-ri-seal" pathLength="1" d="M110 62L151.57 86"/><rect x="102" y="102" width="16" height="16"/>', veil);
        label("rl-ri-cap", "RHINE LAB · RESUMING", veil, true);
        svg("rl-ri-ring", "-100 -100 200 200", '<polygon points="0,-100 86.6,-50 86.6,50 0,100 -86.6,50 -86.6,-50"/>'
          + '<polygon class="rl-ri-inner" points="0,-93 80.5,-46.5 80.5,46.5 0,93 -80.5,46.5 -80.5,-46.5"/>', root);
      } else if (kind === "glitch") {
        el("i", "rl-rg-lines", root);
        // [kind, top, height, left, width, offsets at 0/30/60 %, delay]
        for (const [type, y, h, x, w, a, b, c, d] of [
          ["hi", "14%", "3.2%", "0%", "100%", "18px", "-10px", "4px", "0s"],
          ["dim", "27%", "6%", "18%", "82%", "-26px", "12px", "-4px", ".04s"],
          ["tint", "41%", "1.4%", "0%", "62%", "34px", "-16px", "8px", ".02s"],
          ["hi", "56%", "2.2%", "30%", "70%", "-22px", "14px", "-6px", ".06s"],
          ["dim", "68%", "4.5%", "0%", "74%", "16px", "-24px", "6px", ".03s"],
          ["tint", "83%", "1%", "40%", "60%", "-30px", "18px", "-10px", ".08s"]
        ]) el("i", `rl-rg-s rl-rg-s--${type}`, root, { "--y": y, "--h": h, "--x": x, "--w": w, "--a": a, "--b": b, "--c": c, "--d": d });
        // Colour-split hairlines: an accent line with a cyan ghost 2 px below.
        for (const [y, x, w, a, b, d] of [
          ["22%", "0%", "58%", "-30px", "20px", "0s"],
          ["49%", "36%", "64%", "24px", "-14px", ".05s"],
          ["77%", "6%", "48%", "-12px", "26px", ".09s"]
        ]) el("b", "rl-rg-l", root, { "--y": y, "--x": x, "--w": w, "--a": a, "--b": b, "--c": "0px", "--d": d });
        label("rl-rg-tag", "SIGNAL RESYNC", root);
      }
      return root;
    }
    // </resume-layer>
    // <notice-layer> Rhine notice cards and the notice chime. Self-contained
    // so preview/notify.html can lift this block and render the same nodes.
    // kind: "done" (a run ended) | "pending" (waiting for approval or an answer).
    const NOTICE_MS = 8000;
    function noticeCard(doc, { kind, title, status, hint, stamp, closeLabel }) {
      const el = (tag, className, parent, text) => {
        const node = doc.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        parent.append(node);
        return node;
      };
      const card = doc.createElement("div");
      card.className = "rl-ntf";
      card.dataset.kind = kind;
      card.setAttribute("role", "status");
      card.tabIndex = 0;
      const head = el("div", "rl-ntf-head", card);
      el("span", "rl-ntf-tag", head, kind === "pending" ? "RL · ATTENTION" : "RL · NOTICE");
      el("span", "rl-ntf-time", head, stamp);
      el("i", "rl-ntf-dot", head);
      el("div", "rl-ntf-title", card, title);
      const line = el("div", "rl-ntf-status", card);
      el("b", "", line, status);
      if (hint) el("span", "", line, hint);
      const close = el("button", "rl-ntf-close", card, "×");
      close.type = "button";
      close.setAttribute("aria-label", closeLabel);
      el("i", "rl-ntf-bar", card).style.animationDuration = `${NOTICE_MS}ms`;
      // A press leaves a round ripple where it landed.
      card.addEventListener("pointerdown", (event) => {
        const box = card.getBoundingClientRect();
        const ripple = el("i", "rl-ntf-tap", card);
        ripple.style.left = `${event.clientX - box.left}px`;
        ripple.style.top = `${event.clientY - box.top}px`;
        ripple.addEventListener("animationend", () => ripple.remove());
      });
      return card;
    }
    function noticeHost(doc) {
      let host = doc.querySelector(".rl-ntf-host");
      if (!host) {
        host = doc.createElement("div");
        host.className = "rl-ntf-host";
        doc.body.append(host);
      }
      return host;
    }
    // Two rising soft blips for a finished run, three quick ones when the
    // agent is waiting; synthesized, quiet, and silent if audio is blocked.
    let chimeContext = null;
    function playChime(kind) {
      try {
        chimeContext ??= new AudioContext();
        if (chimeContext.state === "suspended") chimeContext.resume();
        const start = chimeContext.currentTime + 0.02;
        const notes = kind === "pending" ? [[1318.5, 0], [1318.5, 0.11], [1318.5, 0.22]] : [[987.8, 0], [1480, 0.09]];
        for (const [frequency, at] of notes) {
          const osc = chimeContext.createOscillator();
          const gain = chimeContext.createGain();
          osc.type = "triangle";
          osc.frequency.value = frequency;
          gain.gain.setValueAtTime(0.0001, start + at);
          gain.gain.exponentialRampToValueAtTime(0.07, start + at + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + at + 0.17);
          osc.connect(gain).connect(chimeContext.destination);
          osc.start(start + at);
          osc.stop(start + at + 0.19);
        }
      } catch {}
    }
    // </notice-layer>
    const archiveListeners = new Set();
    const deletedSessionIds = new Set();
    const subscribeDeleted = (listener) => { archiveListeners.add(listener); return () => archiveListeners.delete(listener); };
    const deletedSnapshot = () => deletedSessionIds.size;
    function markSessionDeleted(id) {
      deletedSessionIds.add(id);
      archiveListeners.forEach((listener) => listener());
    }
    // The pending permanent-delete request; the shell.overlay dialog shows it,
    // so it outlives the session menu that raised it.
    const deleteRequest = (() => {
      let snapshot = null, key = 0;
      const listeners = new Set();
      const publish = (value) => { snapshot = value; listeners.forEach((fn) => fn()); };
      return {
        getSnapshot: () => snapshot,
        subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        open: (request) => publish({ ...request, key: ++key }),
        close: () => publish(null)
      };
    })();
    // `scheduled`: dsh keeps a conversation shown in this run loaded, so the host deletes it at the next start.
    const removedStatus = (status) => status === "deleted" || status === "missing" || status === "scheduled";
    async function deleteSession(sessionId) {
      try {
        const response = await fetch("/rhine-splash/sessions/delete", {
          method: "POST",
          headers: { "content-type": "application/json", "x-rhine-splash": "1" },
          body: JSON.stringify({ sessionId })
        });
        const status = (await response.json().catch(() => null))?.status;
        if (removedStatus(status)) markSessionDeleted(sessionId);
        return status || "failed";
      } catch {
        return "failed";
      }
    }
    const zh = {
      recWhere: "费用记录",
      recFile: "本机文件 {file}",
      recBrowser: "浏览器存储",
      recHint: "本机文件由桌面版和网页版共用，旧版本插件仍可读取浏览器里的副本。",
      wb_night: "夜间观测员",
      wb_marathon: "长时运转",
      wb_allWeek: "全勤研究员",
      wb_cache: "缓存炼金师",
      wb_offPeak: "错峰实验员",
      wb_weekend: "周末加班",
      wb_surge: "火力全开",
      wb_calm: "轻装上阵",
      wb_steady: "稳定运转",
      wbr_night: "{share} 的花费发生在 22 点到 6 点",
      wbr_marathon: "最长一次运行 {duration}",
      wbr_allWeek: "每天都有实验记录",
      wbr_cache: "缓存命中率 {rate}，近 4 周为 {base}",
      wbr_offPeak: "一半以上的花费在闲时",
      wbr_weekend: "周末花费占 {share}",
      wbr_surge: "花费比前一周多 {change}",
      wbr_calm: "花费比前一周少 {change}",
      wbr_steady: "本周实验按计划进行",
      wkBadge: "本周评定",
      wkHighlights: "本周之最",
      wkTopDay: "最贵的一天",
      wkTopDayValue: "周{weekday} {money}",
      wkTopConv: "单个对话最高",
      wkStreak: "连续使用",
      wkStreakValue: "{n} 天",
      wkHoursTitle: "时段分布",
      wkAvg4: "近 4 周平均 {money}",
      wkVsAvg: "本周{dir} {pct}",
      wkVsUp: "高出",
      wkVsDown: "低了",
      wkSaved: "缓存为你省下 {cache}，闲时半价省下 {offPeak}",
      wkSavedCache: "缓存为你省下 {cache}",
      wkTokens: "模型读写",
      wkTokensValue: "{n} 万 tokens",
      wkBooks: "约等于 {n} 本 20 万字的书",
      wkDay0: "一",
      wkDay1: "二",
      wkDay2: "三",
      wkDay3: "四",
      wkDay4: "五",
      wkDay5: "六",
      wkDay6: "日",
      splashWhen: "播放开屏",
      sw_launch: "每次启动",
      sw_daily: "每天第一次",
      sw_update: "更新后第一次",
      notifyMinRun: "运行少于几秒不提醒（秒）",
      quietHours: "免打扰时段",
      quietFrom: "免打扰开始（时）",
      quietTo: "免打扰结束（时）",
      notifyWhenNote: "你在 Harness 里时，运行不到这个时长就结束的对话不提醒运行结束；切到别的应用或窗口在后台时照常提醒。等待授权和回答总会提醒。",
      notifyNote: "免打扰时段内只显示界面内提示，不发系统通知，也不响提示音。开始和结束相同时不生效。",
      balanceAlert: "余额提醒线",
      balanceLow: "余额不足 {balance}",
      balanceLowStatus: "已低于提醒线 {limit}",
      balanceLowTitle: "余额低于提醒线 {limit}",
      updateCheck: "检查新版本",
      updTitle: "发现新版本 {latest}",
      updSteps: "在插件页卸载当前版本（{current}），再点「添加插件」粘贴下面这行，安装后完全退出并重新打开 Harness。",
      updCopy: "复制",
      updCopied: "已复制",
      updLink: "查看更新内容",
      weeklyReport: "每周弹出实验周报", cf_weekly: "实验周报",
      wkOpen: "实验周报", wkWeek: "第 {week} 周", wkLive: "进行中", wkPrev: "上一周", wkNext: "下一周", wkClose: "关闭",
      wkTitle: "实验周报", wkEmpty: "这一周没有花费和运行记录", wkTotal: "周花费", wkTotalLive: "本周至今",
      wkDelta: "较前一周 {change}", wkDeltaNone: "前一周没有记录",
      wkMon: "一", wkTue: "二", wkWed: "三", wkThu: "四", wkFri: "五", wkSat: "六", wkSun: "日",
      wkAvg: "日均", wkActiveDays: "{n} 天有花费", wkConvs: "对话", wkConvCount: "{n} 个", wkModel: "最常用模型", wkShare: "占 {share}",
      wkBusiest: "最忙时段", wkNoHours: "时段统计从 0.2.5 开始记录", wkHit: "缓存命中率", wkOffPeak: "闲时花费",
      wkRuns: "运行", wkRunCount: "{n} 次", wkRunTotal: "共 {duration}", wkNoRuns: "运行时长从 0.2.8 开始记录", wkLongest: "最长一次运行",
      wkSec: "{n} 秒", wkMin: "{n} 分钟", wkHour: "{h} 小时", wkHourMin: "{h} 小时 {m} 分",
      wkPrivacy: "图片只包含统计数字，不含对话内容。", wkShareName: "莱茵生命主题", wkShareWhat: "DeepSeek Harness 插件", wkShareHow: "插件页 › 添加插件 › 粘贴", wkStatsOnly: "仅含统计数字", wkSave: "保存图片", wkCopy: "复制图片", wkCopied: "已复制", wkCopyFailed: "复制失败", wkCost: "费用页面",
      wn_0_2_8_6: "每周第一次打开时，会弹出上周的莱茵实验周报",
      cf_whatsNew: "本次更新卡片",
      wn_label_welcome: "主要功能",
      wn_label_update: "本次更新",
      wn_close_aria: "关闭",
      wn_title_welcome: "欢迎使用莱茵生命主题",
      wn_title_update: "莱茵生命主题已更新到 {version}",
      wn_open: "打开设置",
      wn_log: "更新日志",
      wn_ok: "知道了",
      settingsNav: "莱茵生命主题",
      settingsIntro: "和插件页里的配置是同一份，改动会立即保存。",
      wn_0_2_8_1: "Harness 设置里新增「莱茵生命主题」页面",
      wn_0_2_8_2: "开屏可以只在每天第一次或更新后播放",
      wn_0_2_8_3: "很快结束的运行不再提醒，还可以设免打扰时段",
      wn_0_2_8_4: "余额低于提醒线时会提醒你",
      wn_0_2_8_5: "发现新版本时，设置页顶部会告诉你怎么升级",
      wn_welcome_1: "开屏、配色和 Logo 可以在「设置 → 莱茵生命主题」里调整",
      wn_welcome_2: "左下角的待办条汇总等你处理和已完成的对话",
      wn_welcome_3: "计费卡片显示本对话花费和余额，点开看完整统计",
      wn_welcome_4: "输入框旁有推理强度滑块和「即答」开关",
      wn_welcome_5: "归档的对话可以在「设置 → 归档对话」里恢复或永久删除",

      budgetDaily: "每日预算",
      budgetSession: "单个对话预算",
      invalidMoney: "请输入 0–100000 的金额。",
      toolsNote: "预算为 0 时不提醒，金额按账户余额的币种计算。也可以在费用页面（点击计费卡片打开）里直接修改。「检查新版本」每天最多向 npm 查询一次是否有新版本，只发送包名，不发送任何个人数据。",
      costTitle: "费用",
      costOpen: "打开费用面板",
      costHalf: "半价",
      costToday: "今日",
      costRange7: "近 7 天",
      costRange30: "近 30 天",
      costDays7: "7 天",
      costDays30: "30 天",
      costByModel: "按模型",
      costTop: "花费最多的对话（累计）",
      costBudget: "预算",
      costLimit: "上限 {amount}",
      costLimitOff: "未设置",
      costLimitEdit: "修改上限",
      costSettings: "设置",
      costNote: "按官方价格估算，闲时半价；仅统计本机记录，保留最近 62 天。",
      cpBack: "返回对话", cpRange62: "近 62 天", cpRangeLabel: "统计范围", cpView: "显示方式", cpChart: "图表", cpTable: "表格",
      cpSpent: "{range}花费", cpVsPrev: "较前一时段 {change}", cpVsYesterday: "较昨日 {change}", cpConvs: "有花费的对话", cpPerConv: "平均每个 {amount}", cpNoPrevious: "没有更早的记录可比", cpPrevZero: "前一时段没有花费", cpNoChange: "与前一时段持平",
      cpAverage: "日均", cpActive: "{n} 天有花费", cpHitRate: "缓存命中率", cpCacheSaved: "命中省下约 {amount}", cpCacheNone: "暂无命中节省",
      cpOffPeak: "闲时节省", cpOffPeakShare: "闲时花费占 {pct}", cpTrackedFrom: "从 0.2.5 开始统计", cpRunway: "按近 7 天日均约可用 {n} 天",
      cpDaily: "每日花费", cpHourly: "今日每小时花费", cpOther: "其他模型", cpBudgetLine: "每日预算 {amount}",
      cpDate: "日期", cpHour: "时段", cpTotalCol: "合计", cpNoData: "这段时间没有花费记录",
      cpModel: "模型", cpCost: "花费", cpShare: "占比", cpHitRateCol: "命中率", cpPerMillion: "每百万 Token",
      cpSplit: "花费构成", cpSplitLead: "{name}占花费的 {pct}", cpOut: "输出", cpMiss: "输入（未命中缓存）", cpHit: "输入（命中缓存）",
      cpTokensShare: "{tokens} Token · {pct}", cpCacheNote: "缓存命中率 {rate}，与全部按未命中计价相比约省下 {amount}。",
      cpHours: "时段分布", cpPeakBand: "工作日峰时（原价）", cpHoursNote: "峰时 {peak} · 闲时 {off}",
      cpHoursEmpty: "时段统计从 0.2.5 开始记录", cpHoursPartial: "时段数据覆盖本时段 {pct} 的花费，更早的记录没有时段信息。",
      cpTodayOf: "今日 {spent}，已用 {pct}", cpOverDays: "{n} 天超出", cpOverSessions: "{n} 个对话超出", cpBudgetOff: "未设置，不提醒",
      cpTop: "花费最多的对话", cpConv: "对话", cpWorkspace: "工作区", cpLast: "最近活动", cpDeleted: "已删除的对话",
      cpShowAll: "显示全部 {n} 个", cpShowLess: "收起", cpByWorkspace: "按工作区", cpConvCount: "{n} 个对话", cpNoWorkspace: "未知工作区",
      costEmpty: "还没有记录",
      costChart: "{range}每日花费",
      costTokens: "未命中 {miss} · 命中 {hit} · 输出 {out}",
      budgetNear: "{scope}花费已达预算的 80%",
      budgetOver: "{scope}花费已超过预算",
      budgetScopeToday: "今日",
      budgetScopeSession: "本对话",
      budgetStatus: "已花费 {spent} / 上限 {limit}",
      cf_cost: "费用面板",

      compat: "兼容性", compatMissing: "Harness 接口已变化，已自动停用（缺少 {names}）",
      compatCrashed: "运行时出错，已自动停用", compatAbsent: "所需的 Harness 服务未加载，未启用",
      compatHint: "其他功能不受影响。更新插件或 Harness 后通常会恢复。",
      cf_live: "即时生效", nextLaunch: "下次启动时生效", appliesNow: "立即生效",
      accent: "强调色", accentColor: "自定义颜色", base: "底色",
      ac_rhine: "莱茵橙", ac_life: "生命绿", ac_ocean: "深海蓝", ac_crimson: "绯红", ac_custom: "自定义",
      bs_warm: "暖白", bs_neutral: "中性灰", bs_official: "原版冷灰",
      cf_notify: "莱茵通知", cf_todo: "待办中心", cf_billing: "计费与余额", cf_effort: "推理强度滑块",
      cf_archives: "删除归档对话", cf_brand: "品牌标志", cf_settings: "设置页", cf_command: "/splash 命令",
      summary: "设置莱茵开屏、界面主题和品牌。", command: "开屏", commandDescription: "预览开屏或更改开屏设置。",
      splash: "开屏", text: "文字", appearance: "外观", motion: "动效", tools: "工具", actions: "操作", exit: "退场", theme: "开屏配色",
      enabled: "开屏动画", skippable: "允许跳过", replayOnReload: "刷新时重播", uiTheme: "界面主题", appearanceNote: "界面的深浅色在 Harness「设置 → 通用 → 外观」中切换；「开屏配色」只影响开屏动画。", brand: "品牌替换",
      logo: "Logo 方案", plate: "模块铭牌", cell: "开放细胞",
      duration: "显示时长（ms）", title: "主标题", subtitle: "副标题", code: "角落编号",
      random: "随机", doors: "舱门", decode: "代码消散", glitch: "故障撕裂", iris: "六边形光圈",
      auto: "跟随界面", light: "浅色", dark: "深色", on: "开启", off: "关闭",
      switchRow: "{name}：{state}", stateOn: "开", stateOff: "关",
      effortSlider: "推理强度滑块",
      billing: "计费与余额",
      rowStatus: "对话行状态",
      rowPending: "已等待 {time}", rowRunning: "已运行 {time}", rowDone: "{time}前完成",
      rowJustPending: "刚开始等待", rowJustRunning: "刚开始运行", rowJustDone: "刚刚完成",
      arcRestore: "取消归档（{n}）", arcRestored: "已取消归档 {ok} 个对话", arcRestoreFailed: "取消归档失败",
      todoCenter: "待办中心", todo: "待办", todoOpen: "打开待办", todoSummary: "{n} 项待处理",
      todoPending: "等你处理", todoDone: "已完成未查看", todoRunning: "运行中", todoRunningCount: "{n} 个运行中",
      todoApproval: "等待授权", todoApprovalTool: "等待授权 · {tool}", todoQuestion: "等待回答", todoPlan: "计划待审",
      todoFinished: "运行结束", todoEmpty: "没有需要处理的对话", todoNow: "刚刚",
      todoMin: "{n} 分钟", todoHour: "{n} 小时", todoDay: "{n} 天",
      todoCommand: "待办", todoCommandDescription: "查看等你处理、已完成和运行中的对话", todoSearch: "搜索对话…", ntfPlan: "计划待审",
      heroBackground: "空白页背景", resumeEffect: "切回动效", resumeTrigger: "切回触发",
      heroMark: "背景水印", hm_thin: "原版", hm_bold: "加粗",
      hb_random: "随机", hb_plain: "素净", hb_diagonal: "对角线", hb_horizon: "地平线", hb_grid: "档案网格", hb_off: "关闭",
      rf_random: "随机", rf_scan: "链路恢复扫描", rf_iris: "六边形光圈", rf_glitch: "故障闪切", rf_off: "关闭",
      costOpen: "点击计费卡片", co_page: "直接进入费用页面", co_popup: "先弹出小卡片",
      costMore: "完整页面", costChartOpen: "点击打开完整的费用页面",
      rt_away: "离开 30 秒后", rt_always: "每次切回", rt_hidden: "最小化或隐藏后",
      previewResume: "预览切回动效", previewResumeNow: "立即预览切回动效",
      notifyWhen: "通知时机", notifyCurrent: "当前对话", notifyOthers: "其他对话", notifyAway: "应用失焦或在后台",
      notify: "通知方式", notifySystem: "系统通知", notifyToast: "界面内提示", notifySound: "提示音",
      ntfDone: "运行结束", ntfApproval: "等待授权", ntfQuestion: "等待回答",
      ntfOpen: "点击查看", ntfClose: "关闭", ntfUntitled: "未命名对话", ntfSample: "莱茵通知 · 示例",
      previewNotify: "预览通知", previewNotifyNow: "立即预览通知",
      billCost: "本对话", billBalance: "余额", billNoKey: "未配置 Key", billFailed: "暂不可用",
      billEstimate: "按模型与当前时段单价估算，仅供参考", billTokens: "未命中 {miss} · 命中 {hit} · 输出 {out}",
      billPeak: "高峰", billOffPeak: "闲时", billSplit: "赠送 {granted} · 充值 {toppedUp}",
      delSession: "删除对话", delTitle: "永久删除对话？",
      delDesc: "“{title}”将被永久删除，删除后无法恢复。", delDescMany: "所选的 {n} 个对话将被永久删除，删除后无法恢复。",
      delAction: "永久删除", delCancel: "取消", delClose: "关闭", delPending: "正在删除…", delDone: "已永久删除",
      delScheduled: "这个对话本次启动后打开过，将在下次启动 Harness 时永久删除",
      delNotArchived: "只能删除已归档的对话", delMissing: "找不到这个对话的记录", delFailed: "删除失败",
      archives: "归档对话", arcHint: "在「设置 → 归档对话」中批量查看和删除已归档的对话",
      arcTitle: "归档对话", arcDesc: "共 {count} 个已归档对话。删除是永久的，删除后无法恢复。",
      arcSelectAll: "全选", arcSelected: "已选 {n} 个", arcEmpty: "没有已归档的对话", arcUntitled: "未命名对话",
      arcDelete: "删除所选（{n}）", arcProgress: "正在删除 {done}/{total}",
      arcResult: "已永久删除 {ok} 个对话", arcResultScheduled: "，{n} 个本次打开过，将在下次启动时删除", arcResultSkipped: "，{skipped} 个未删除",
      effInstant: "即答", effInstantHint: "即答：跳过思考，直接回答（Alt+T）",
      answerNow: "立即回答", answerNowHint: "跳过剩下的思考，直接回答（答完恢复原来的推理强度）",
      answerNowPrompt: "跳过思考，直接回答上面的问题。",
      effTitle: "推理强度", effFaster: "更快", effDeeper: "更深", effDefault: "默认", effHelp: "推理强度越高，模型思考越充分，回复也越慢。",
      effort_off: "关闭", effort_low: "低", effort_medium: "中", effort_high: "高", effort_xhigh: "超高", effort_max: "最高",
      preview: "预览开屏", previewNow: "立即预览开屏", restart: "修改会立即保存。开屏和文字设置在下次启动时生效，其他设置立即生效；预览按当前设置立即播放。",
      resetAll: "恢复默认", unavailable: "该插件当前未加载，暂时无法配置。",
      readOnly: "本部署的设置为只读。", saveFailed: "保存失败，已保留修改供你重试。",
      invalidNumber: "请输入 0–15000 的数字。", search: "搜索开屏操作…", empty: "暂无操作。", noResults: "没有匹配的操作。"
    };
    const en = {
      recWhere: "Cost records",
      recFile: "Local file {file}",
      recBrowser: "Browser storage",
      recHint: "The desktop and web apps share this local file. Older plugin versions can still read the browser copies.",
      wb_night: "Night observer",
      wb_marathon: "Long runner",
      wb_allWeek: "Perfect attendance",
      wb_cache: "Cache alchemist",
      wb_offPeak: "Off-peak researcher",
      wb_weekend: "Weekend overtime",
      wb_surge: "Full power",
      wb_calm: "Traveling light",
      wb_steady: "Steady operation",
      wbr_night: "{share} of spending was between 22:00 and 06:00",
      wbr_marathon: "Longest run: {duration}",
      wbr_allWeek: "Experiments recorded every day",
      wbr_cache: "Cache hit rate {rate}, up from {base} over the past 4 weeks",
      wbr_offPeak: "At least half of spending was off-peak",
      wbr_weekend: "Weekend share: {share}",
      wbr_surge: "Spending rose {change} from last week",
      wbr_calm: "Spending fell {change} from last week",
      wbr_steady: "Experiments ran as planned this week",
      wkBadge: "Weekly assessment",
      wkHighlights: "Weekly highlights",
      wkTopDay: "Highest spending day",
      wkTopDayValue: "{weekday} {money}",
      wkTopConv: "Highest conversation cost",
      wkStreak: "Usage streak",
      wkStreakValue: "{n} days",
      wkHoursTitle: "Hourly distribution",
      wkAvg4: "Previous 4-week average {money}",
      wkVsAvg: "This week {dir} {pct}",
      wkVsUp: "higher by",
      wkVsDown: "lower by",
      wkSaved: "Cache saved {cache}; off-peak rates saved {offPeak}",
      wkSavedCache: "Cache saved {cache}",
      wkTokens: "Model input and output",
      wkTokensValue: "{n} × 10k tokens",
      wkBooks: "About {n} books of 200,000 characters",
      wkDay0: "Mon",
      wkDay1: "Tue",
      wkDay2: "Wed",
      wkDay3: "Thu",
      wkDay4: "Fri",
      wkDay5: "Sat",
      wkDay6: "Sun",
      splashWhen: "Play splash",
      sw_launch: "Every launch",
      sw_daily: "First launch each day",
      sw_update: "First launch after an update",
      notifyMinRun: "Skip notices for runs shorter than (seconds)",
      quietHours: "Quiet hours",
      quietFrom: "Quiet hours start (hour)",
      quietTo: "Quiet hours end (hour)",
      notifyWhenNote: "While you are in Harness, runs shorter than this do not send a finished notice. Notices still arrive when you switch apps or the window is in the background. Approval and question notices always arrive.",
      notifyNote: "During quiet hours, only in-app notices appear. System notifications and sounds are muted. Equal start and end times turn this off.",
      balanceAlert: "Low balance threshold",
      balanceLow: "Low balance: {balance}",
      balanceLowStatus: "Below your threshold of {limit}",
      balanceLowTitle: "Balance below {limit}",
      updateCheck: "Check for updates",
      updTitle: "New version {latest} available",
      updSteps: "Uninstall the current version ({current}) on the Plugins page, then choose Add plugin and paste the line below. Fully quit and reopen Harness after installing.",
      updCopy: "Copy",
      updCopied: "Copied",
      updLink: "What's new",
      weeklyReport: "Show the weekly report each week", cf_weekly: "Weekly report",
      wkOpen: "Weekly report", wkWeek: "Week {week}", wkLive: "In progress", wkPrev: "Previous week", wkNext: "Next week", wkClose: "Close",
      wkTitle: "Weekly report", wkEmpty: "No spending or runs recorded this week", wkTotal: "Weekly spending", wkTotalLive: "This week so far",
      wkDelta: "Compared with the previous week: {change}", wkDeltaNone: "No previous week recorded",
      wkMon: "Mon", wkTue: "Tue", wkWed: "Wed", wkThu: "Thu", wkFri: "Fri", wkSat: "Sat", wkSun: "Sun",
      wkAvg: "Daily average", wkActiveDays: "Spending on {n} days", wkConvs: "Conversations", wkConvCount: "{n} conversations", wkModel: "Most used model", wkShare: "{share} of spending",
      wkBusiest: "Busiest hour", wkNoHours: "Hourly statistics recorded since 0.2.5", wkHit: "Cache hit rate", wkOffPeak: "Off-peak spending",
      wkRuns: "Runs", wkRunCount: "{n} runs", wkRunTotal: "Total {duration}", wkNoRuns: "Run time recorded since 0.2.8", wkLongest: "Longest run",
      wkSec: "{n} sec", wkMin: "{n} min", wkHour: "{h} h", wkHourMin: "{h} h {m} min",
      wkPrivacy: "Images contain statistics only, with no conversation content.", wkShareName: "Rhine Lab Theme", wkShareWhat: "a DeepSeek Harness plugin", wkShareHow: "Plugins › Add plugin › paste", wkStatsOnly: "Statistics only", wkSave: "Save image", wkCopy: "Copy image", wkCopied: "Copied", wkCopyFailed: "Copy failed", wkCost: "Cost page",
      wn_0_2_8_6: "On the first launch each week, see last week’s Rhine weekly report.",
      cf_whatsNew: "What’s new card",
      wn_label_welcome: "Main features",
      wn_label_update: "What’s new",
      wn_close_aria: "Close",
      wn_title_welcome: "Welcome to Rhine Lab Theme",
      wn_title_update: "Rhine Lab Theme updated to {version}",
      wn_open: "Open settings",
      wn_log: "Changelog",
      wn_ok: "Got it",
      settingsNav: "Rhine Lab Theme",
      settingsIntro: "These are the same settings as on the Plugins page. Changes save immediately.",
      wn_0_2_8_1: "Rhine Lab Theme now has its own Settings page, so you can skip the Plugins page.",
      wn_0_2_8_2: "Play the splash only on the first launch each day or after an update.",
      wn_0_2_8_3: "Short runs no longer send finished notices, and you can set quiet hours.",
      wn_0_2_8_4: "Get a notice when your balance falls below your threshold.",
      wn_0_2_8_5: "When an update is available, the settings page explains how to install it.",
      wn_welcome_1: "Adjust the splash, interface colours and logo in Settings → Rhine Lab Theme.",
      wn_welcome_2: "The to-do bar at the bottom left gathers conversations waiting for you and finished replies.",
      wn_welcome_3: "The billing card shows this conversation’s cost and your balance. Open it for full cost statistics.",
      wn_welcome_4: "The composer has a reasoning effort slider and an Instant switch.",
      wn_welcome_5: "Restore or permanently delete archived conversations in Settings → Archived conversations.",

      budgetDaily: "Daily budget",
      budgetSession: "Per-conversation budget",
      invalidMoney: "Enter an amount between 0 and 100000.",
      toolsNote: "A budget of 0 turns its reminder off; amounts use your balance currency. You can also edit them on the cost page (click the billing card). Check for updates queries npm at most once a day, sending only the package name and no personal data.",
      costTitle: "Cost",
      costOpen: "Open cost panel",
      costHalf: "half price",
      costToday: "Today",
      costRange7: "Last 7 days",
      costRange30: "Last 30 days",
      costDays7: "7 days",
      costDays30: "30 days",
      costByModel: "By model",
      costTop: "Top conversations (all time)",
      costBudget: "Budget",
      costLimit: "Limit {amount}",
      costLimitOff: "Not set",
      costLimitEdit: "Edit limit",
      costSettings: "Settings",
      costNote: "Estimated from official prices, half price off-peak; local records only, kept for 62 days.",
      cpBack: "Back to conversation", cpRange62: "Last 62 days", cpRangeLabel: "Range", cpView: "View", cpChart: "Chart", cpTable: "Table",
      cpSpent: "Spent · {range}", cpVsPrev: "{change} vs previous period", cpVsYesterday: "{change} vs yesterday", cpConvs: "Conversations with spending", cpPerConv: "{amount} each on average", cpNoPrevious: "No earlier data to compare", cpPrevZero: "Nothing spent in the previous period", cpNoChange: "Same as the previous period",
      cpAverage: "Daily average", cpActive: "{n} days with spending", cpHitRate: "Cache hit rate", cpCacheSaved: "Saved about {amount}", cpCacheNone: "No cache savings yet",
      cpOffPeak: "Off-peak savings", cpOffPeakShare: "{pct} spent off-peak", cpTrackedFrom: "Tracked since 0.2.5", cpRunway: "About {n} days at the 7-day average",
      cpDaily: "Daily spending", cpHourly: "Spending by hour today", cpOther: "Other models", cpBudgetLine: "Daily budget {amount}",
      cpDate: "Date", cpHour: "Hour", cpTotalCol: "Total", cpNoData: "No spending in this period",
      cpModel: "Model", cpCost: "Cost", cpShare: "Share", cpHitRateCol: "Hit rate", cpPerMillion: "Per 1M tokens",
      cpSplit: "Where the money goes", cpSplitLead: "{name} is {pct} of spending", cpOut: "Output", cpMiss: "Input (cache miss)", cpHit: "Input (cache hit)",
      cpTokensShare: "{tokens} tokens · {pct}", cpCacheNote: "Cache hit rate {rate}; about {amount} saved compared with paying cache-miss prices for every input token.",
      cpHours: "By hour of day", cpPeakBand: "Weekday peak hours (full price)", cpHoursNote: "Peak {peak} · Off-peak {off}",
      cpHoursEmpty: "Hourly tracking starts with 0.2.5", cpHoursPartial: "Hourly data covers {pct} of this period; older records have no hours.",
      cpTodayOf: "Today {spent}, {pct} used", cpOverDays: "over on {n} days", cpOverSessions: "{n} conversations over", cpBudgetOff: "Not set; no reminders",
      cpTop: "Top conversations", cpConv: "Conversation", cpWorkspace: "Workspace", cpLast: "Last active", cpDeleted: "Deleted conversation",
      cpShowAll: "Show all {n}", cpShowLess: "Show less", cpByWorkspace: "By workspace", cpConvCount: "{n} conversations", cpNoWorkspace: "Unknown workspace",
      costEmpty: "Nothing recorded yet",
      costChart: "Daily cost, {range}",
      costTokens: "Miss {miss} · Hit {hit} · Out {out}",
      budgetNear: "{scope} spending reached 80% of its budget",
      budgetOver: "{scope} spending passed its budget",
      budgetScopeToday: "Today's",
      budgetScopeSession: "This conversation's",
      budgetStatus: "Spent {spent} of {limit}",
      cf_cost: "Cost panel",

      compat: "Compatibility", compatMissing: "Harness changed its interface; turned off (missing {names})",
      compatCrashed: "Failed at run time; turned off", compatAbsent: "The Harness service it needs never loaded; not started",
      compatHint: "Other features are unaffected. Updating the plugin or Harness usually restores it.",
      cf_live: "Live settings", nextLaunch: "Applies at next launch", appliesNow: "Applies now",
      accent: "Accent", accentColor: "Custom colour", base: "Base tone",
      ac_rhine: "Rhine orange", ac_life: "Life green", ac_ocean: "Deep-sea blue", ac_crimson: "Crimson", ac_custom: "Custom",
      bs_warm: "Warm paper", bs_neutral: "Neutral grey", bs_official: "Harness grey",
      cf_notify: "Rhine notices", cf_todo: "To-do center", cf_billing: "Cost & balance", cf_effort: "Effort slider",
      cf_archives: "Archived conversation deletion", cf_brand: "Brand marks", cf_settings: "Settings page", cf_command: "/splash command",
      summary: "Configure the Rhine splash, interface theme and branding.", command: "Splash", commandDescription: "Preview the splash or change its settings.",
      splash: "Splash", text: "Text", appearance: "Appearance", motion: "Motion", tools: "Tools", actions: "Actions", exit: "Exit", theme: "Splash colors",
      enabled: "Splash animation", skippable: "Allow skipping", replayOnReload: "Replay on reload", uiTheme: "Interface theme", appearanceNote: "Switch the interface between light and dark in Harness Settings → General → Appearance; Splash colors only affects the splash.", brand: "Brand replacement",
      logo: "Logo scheme", plate: "Plate", cell: "Cell",
      duration: "Duration (ms)", title: "Title", subtitle: "Subtitle", code: "Corner identifier",
      random: "Random", doors: "Doors", decode: "Code dissolve", glitch: "Glitch tear", iris: "Hexagonal iris",
      auto: "Match interface", light: "Light", dark: "Dark", on: "Enable", off: "Disable",
      switchRow: "{name}: {state}", stateOn: "on", stateOff: "off",
      effortSlider: "Effort slider",
      billing: "Cost & balance",
      rowStatus: "Row status",
      rowPending: "Waiting for {time}", rowRunning: "Running for {time}", rowDone: "Finished {time} ago",
      rowJustPending: "Just started waiting", rowJustRunning: "Just started", rowJustDone: "Just finished",
      arcRestore: "Unarchive ({n})", arcRestored: "Unarchived {ok} conversations", arcRestoreFailed: "Unarchive failed",
      todoCenter: "To-do center", todo: "To-do", todoOpen: "Open to-do", todoSummary: "{n} need you",
      todoPending: "Needs you", todoDone: "Finished, unread", todoRunning: "Running", todoRunningCount: "{n} running",
      todoApproval: "Waiting for approval", todoApprovalTool: "Waiting for approval · {tool}", todoQuestion: "Waiting for your answer", todoPlan: "Plan awaiting review",
      todoFinished: "Run finished", todoEmpty: "Nothing needs you right now", todoNow: "now",
      todoMin: "{n} min", todoHour: "{n} h", todoDay: "{n} d",
      todoCommand: "To-do", todoCommandDescription: "Conversations waiting for you, finished or running", todoSearch: "Search conversations…", ntfPlan: "Plan awaiting review",
      heroBackground: "Blank page background", resumeEffect: "Resume effect", resumeTrigger: "Resume trigger",
      heroMark: "Watermark", hm_thin: "Original", hm_bold: "Bold",
      hb_random: "Random", hb_plain: "Plain", hb_diagonal: "Diagonal", hb_horizon: "Horizon", hb_grid: "Archive grid", hb_off: "Off",
      rf_random: "Random", rf_scan: "Link scan", rf_iris: "Hexagonal iris", rf_glitch: "Glitch cut", rf_off: "Off",
      costOpen: "Billing card opens", co_page: "The cost page", co_popup: "A small panel first",
      costMore: "Full page", costChartOpen: "Click to open the full cost page",
      rt_away: "After 30 s away", rt_always: "Every return", rt_hidden: "After minimize or hide",
      previewResume: "Preview resume effect", previewResumeNow: "Preview resume effect now",
      notifyWhen: "When to notify", notifyCurrent: "Current conversation", notifyOthers: "Other conversations", notifyAway: "App unfocused or in background",
      notify: "How to notify", notifySystem: "System notifications", notifyToast: "In-app notices", notifySound: "Sound",
      ntfDone: "Run finished", ntfApproval: "Waiting for approval", ntfQuestion: "Waiting for your answer",
      ntfOpen: "Click to open", ntfClose: "Dismiss", ntfUntitled: "Untitled conversation", ntfSample: "Rhine notice · sample",
      previewNotify: "Preview notification", previewNotifyNow: "Preview notification now",
      billCost: "This chat", billBalance: "Balance", billNoKey: "No API key", billFailed: "Unavailable",
      billEstimate: "Estimated from the model and the current period's price", billTokens: "Miss {miss} · Hit {hit} · Out {out}",
      billPeak: "Peak", billOffPeak: "Off-peak", billSplit: "Granted {granted} · Topped up {toppedUp}",
      delSession: "Delete conversation", delTitle: "Delete permanently?",
      delDesc: "“{title}” will be deleted permanently. This cannot be undone.", delDescMany: "The {n} selected conversations will be deleted permanently. This cannot be undone.",
      delAction: "Delete permanently", delCancel: "Cancel", delClose: "Close", delPending: "Deleting…", delDone: "Deleted permanently",
      delScheduled: "This conversation was opened in this run; it will be deleted permanently the next time Harness starts",
      delNotArchived: "Only archived conversations can be deleted", delMissing: "This conversation's record was not found", delFailed: "Delete failed",
      archives: "Archived conversations", arcHint: "Review and delete them in bulk under Settings → Archived conversations",
      arcTitle: "Archived conversations", arcDesc: "{count} archived conversations. Deleting is permanent and cannot be undone.",
      arcSelectAll: "Select all", arcSelected: "{n} selected", arcEmpty: "No archived conversations", arcUntitled: "Untitled conversation",
      arcDelete: "Delete selected ({n})", arcProgress: "Deleting {done}/{total}",
      arcResult: "Deleted {ok} conversations permanently", arcResultScheduled: ", {n} opened this run will be deleted at the next start", arcResultSkipped: ", {skipped} not deleted",
      effInstant: "Instant", effInstantHint: "Instant: skip thinking and answer directly (Alt+T)",
      answerNow: "Answer now", answerNowHint: "Skip the rest of the thinking and answer (your effort comes back afterwards)",
      answerNowPrompt: "Skip the thinking and answer the question above directly.",
      effTitle: "Reasoning effort", effFaster: "Faster", effDeeper: "Deeper", effDefault: "Default", effHelp: "Higher effort thinks longer and answers more slowly.",
      effort_off: "Off", effort_low: "Low", effort_medium: "Medium", effort_high: "High", effort_xhigh: "Extra high", effort_max: "Max",
      preview: "Preview splash", previewNow: "Preview splash now", restart: "Changes save immediately. Splash and text settings apply at the next launch; everything else applies right away. Previews play the current settings now.",
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
      // Harness's segmented control never wraps (equal columns, nowrap tabs),
      // so a long one would squeeze the label to a letter per line: the label
      // keeps its text width and a control that no longer fits beside it
      // moves to its own line below.
      ".rl-cfg-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;min-height:44px;padding:6px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}",
      ".rl-cfg-label{flex:1 0 auto;max-width:100%;font-size:13px;color:var(--dsw-alias-label-primary)}",
      // Its tabs are a little narrower than Harness's (12 px sides, not 16),
      // so five or six options fit a settings card whole; alone on its line
      // and still too wide, it shrinks its equal columns and clips their
      // labels rather than spilling out of the card.
      ".rl-cfg-row>.rl-cfg-seg{max-width:100%;box-sizing:border-box;grid-auto-columns:minmax(0,1fr)}.rl-cfg-row>.rl-cfg-seg>[role=tab]{min-width:0;padding-inline:12px;overflow:hidden;text-overflow:ellipsis}",
      ".rl-cfg-note{margin:0 0 12px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cfg-note[role=alert]{margin:8px 0 0;color:var(--dsw-alias-state-error-primary)}",
      ".rl-cfg-section>.rl-cfg-note{margin:10px 0 0}",
      ".rl-cfg-actions{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin:4px 0 8px}",
      ".rl-cfg-preview{display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 12px;border:1px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);background:transparent;font:500 13px/1 var(--dsw-font-family);color:var(--dsw-alias-label-primary);cursor:pointer}",
      ".rl-cfg-preview:hover{background:var(--dsw-alias-interactive-bg-hover)}",
      ".rl-cfg-preview>i{width:7px;height:7px;background:var(--dsw-static-deepseek-500)}",
      ".rl-cfg-reset{height:30px;padding:0 12px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;font:500 13px/1 var(--dsw-font-family);color:var(--dsw-alias-label-secondary);cursor:pointer}",
      ".rl-cfg-reset:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
      ".rl-cfg-reset:disabled{opacity:.4;cursor:default}",
      ".rl-cfg-hint{margin:0;font-size:12px;color:var(--dsw-alias-label-tertiary)}",
      // Compatibility notes: one row per feature the plugin turned off itself.
      ".rl-cfg-compat .rl-cfg-h{color:var(--dsw-static-deepseek-500)}",
      ".rl-cfg-compat-row{display:grid;grid-template-columns:auto auto minmax(0,1fr);align-items:baseline;column-gap:10px;padding:9px 0;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:13px;line-height:19px}",
      ".rl-cfg-compat-pip{align-self:center;width:6px;height:6px;background:var(--dsw-static-deepseek-500)}",
      ".rl-cfg-compat-name{white-space:nowrap;color:var(--dsw-alias-label-primary)}",
      ".rl-cfg-compat-why{min-width:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cfg-compat .rl-cfg-hint{margin-top:8px}",
      // Accent swatches and custom colour control.
      ".rl-cfg-swatches{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}",
      ".rl-cfg-swatch{display:inline-flex;align-items:center;gap:7px;height:28px;padding:0 10px 0 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:transparent;font-size:12px;color:var(--dsw-alias-label-secondary)}",
      ".rl-cfg-swatch:hover{background:var(--dsw-alias-interactive-bg-hover)}",
      ".rl-cfg-swatch:focus-visible{outline:1.5px solid var(--dsw-static-deepseek-500)}",
      ".rl-cfg-swatch:disabled{opacity:.5}",
      ".rl-cfg-swatch[aria-checked=true]{border-color:var(--rl-swatch,var(--dsw-alias-border-l3));box-shadow:inset 0 0 0 .5px var(--rl-swatch,var(--dsw-alias-border-l3));color:var(--dsw-alias-label-primary)}",
      ".rl-cfg-swatch-chip{width:10px;height:10px;flex-shrink:0;border-radius:0;background:var(--rl-swatch)}",
      ".rl-cfg-swatch[data-accent=custom] .rl-cfg-swatch-chip{background:var(--rl-swatch,repeating-linear-gradient(45deg,transparent 0 2px,var(--dsw-alias-label-tertiary) 2px 3px))}",
      ".rl-cfg-color{display:inline-flex;gap:8px;align-items:center}",
      ".rl-cfg-color input[type=color]{width:28px;height:28px;border:0;padding:0;background:none;cursor:pointer;border-radius:var(--dsw-radius-xs)}",
      ".rl-cfg-color input[type=color]::-webkit-color-swatch-wrapper{padding:0}",
      ".rl-cfg-color input[type=color]::-webkit-color-swatch{border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-xs)}",
      '.rl-cfg-color-hex{font-size:12px;font-family:ui-monospace,"SF Mono",Menlo,"Cascadia Mono",Consolas,monospace;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}',
      ".rl-eff,.rl-eff-pop{--rl-eff-accent:var(--dsw-static-deepseek-500);--rl-eff-ease:cubic-bezier(.16,1,.3,1)}",
      ".rl-eff{display:inline-flex;align-items:center;gap:4px;min-width:0}",
      // Instant (即答): effort "off" in one click, lit in the accent while on.
      ".rl-eff-instant{display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 9px 0 7px;border:0;border-radius:var(--dsw-radius-md);outline:none;background:transparent;font:inherit;font-size:13px;line-height:20px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;cursor:pointer;transition:background-color .15s,color .15s}",
      ".rl-eff-instant svg{width:13px;height:13px;flex:none;fill:currentColor}",
      ".rl-eff-instant:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);color:var(--dsw-alias-label-primary)}",
      ".rl-eff-instant[aria-pressed=true]{background:color-mix(in srgb,var(--rl-eff-accent) 14%,transparent);color:var(--rl-eff-accent)}",
      // Answer now rides on dsh's running line (深度求索中，用时 …, the
      // [data-chat-running] status mounted under the latest content while a
      // turn runs, also when the steps and thinking are folded away): it sits
      // just after that text, moves down with the reasoning, hides when the
      // line scrolls out of view, and the anchor() fallbacks park it off-screen
      // when no line is mounted.
      "[data-chat-running]>:last-child{anchor-name:--rl-run}",
      ".rl-answer-now{position:fixed;z-index:30;position-anchor:--rl-run;top:anchor(center,-200px);left:calc(anchor(right,-400px) + 12px);translate:0 -50%;position-visibility:anchors-visible;display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 9px 0 7px;border:0;border-radius:var(--dsw-radius-md);outline:none;background:color-mix(in srgb,var(--dsw-static-deepseek-500) 14%,var(--dsw-alias-bg-base));font:inherit;font-size:12px;line-height:18px;color:var(--dsw-static-deepseek-500);white-space:nowrap;cursor:pointer;animation:rl-answer-in .2s cubic-bezier(.16,1,.3,1) both}",
      ".rl-answer-now svg{width:12px;height:12px;flex:none;fill:currentColor}",
      ".rl-answer-now:hover{background:color-mix(in srgb,var(--dsw-static-deepseek-500) 24%,var(--dsw-alias-bg-base))}",
      ".rl-answer-now:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}",
      "@keyframes rl-answer-in{from{opacity:0;transform:translateX(4px)}}",
      "@media (prefers-reduced-motion:reduce){.rl-answer-now{animation:none}}",
      // The follow-up it sends starts with ANSWER_MARK; a user-text rule turns
      // that into a marker node, and the transcript row holding it is hidden.
      "[data-chat-flow-key]:has([data-rl-answer-now]){display:none}",
      ".rl-eff-instant:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}",
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
      ".rl-bill-tag::before{content:\"RL · BILLING\";min-width:0;overflow:hidden;white-space:nowrap;font:600 9px/14px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;letter-spacing:.16em}",
      ".rl-bill-tag::after{content:\"\";width:5px;height:5px;background:#a5c22a}",
      ".rl-bill[data-peak] .rl-bill-tag::after{background:var(--dsw-static-deepseek-500);animation:rl-bill-pulse 2.4s ease-in-out infinite}",
      ".rl-bill-row{display:flex;align-items:baseline;justify-content:space-between;gap:8px;min-width:0}",
      ".rl-bill-k{flex:none;color:var(--dsw-alias-label-tertiary)}",
      ".rl-bill-v{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:500 12.5px/18px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}",
      ".rl-bill-row--cost .rl-bill-v{color:var(--dsw-static-deepseek-500)}",
      ".rl-bill[data-state=no-key] .rl-bill-row--balance .rl-bill-v,.rl-bill[data-state=failed] .rl-bill-row--balance .rl-bill-v{font:inherit;color:var(--dsw-alias-label-tertiary)}",
      "@keyframes rl-bill-pulse{50%{opacity:.35}}",
      "@media (prefers-reduced-motion:reduce){.rl-bill *,.rl-bill *::after{animation:none!important}}",
      ".rl-bill[role=button]{cursor:pointer;transition:background-color .2s,border-color .2s}",
      ".rl-bill[role=button]:hover,.rl-bill[data-open]{border-color:var(--dsw-alias-border-l3);background:var(--dsw-alias-interactive-bg-hover)}",
      ".rl-bill[role=button]:focus-visible{outline:1.5px solid var(--dsw-static-deepseek-500);outline-offset:1px}",
      // Cost panel (costOpen "popup"). The billing card is its trigger; the
      // panel shares the to-do panel's surface, entry and corner wave and stays
      // near opaque: it opens over the sidebar, which can sit on native window
      // vibrancy where backdrop blur has little to work with. Bars and tracks
      // are square-ended; budget tracks go lime within budget, accent past 80%
      // and the error colour once over. The chart and "Full page" open the
      // cost page.
      ".rl-cost-pop{position:fixed;z-index:1250;box-sizing:border-box;width:340px;display:flex;flex-direction:column;isolation:isolate;overflow:hidden;border:.5px solid color-mix(in srgb,var(--dsw-alias-label-primary) 12%,transparent);border-radius:var(--dsw-radius-md);background:color-mix(in srgb,var(--dsw-alias-bg-base) 95%,transparent);-webkit-backdrop-filter:blur(18px) saturate(1.6);backdrop-filter:blur(18px) saturate(1.6);box-shadow:0 16px 40px rgba(0,0,0,.14),inset 0 1px 0 rgba(255,255,255,.4);font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);outline:none;transform-origin:left bottom;animation:rl-todo-in .34s cubic-bezier(.16,1,.3,1) both}",
      "body[data-ds-dark-theme] .rl-cost-pop{background:color-mix(in srgb,var(--dsw-alias-bg-base) 93%,transparent);box-shadow:0 18px 44px rgba(0,0,0,.46),inset 0 1px 0 rgba(255,255,255,.07)}",
      ".rl-cost-pop::after{content:\"\";position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(circle at 0 100%,transparent calc(var(--rl-todo-r) - 30px),color-mix(in srgb,var(--dsw-static-deepseek-500) 12%,transparent) calc(var(--rl-todo-r) - 1.5px),color-mix(in srgb,var(--dsw-static-deepseek-500) 46%,transparent) var(--rl-todo-r),transparent calc(var(--rl-todo-r) + 1.5px)),radial-gradient(circle at 0 100%,transparent calc(var(--rl-todo-r) - 110px),color-mix(in srgb,var(--dsw-static-deepseek-500) 7%,transparent) calc(var(--rl-todo-r) - 81px),color-mix(in srgb,var(--dsw-static-deepseek-500) 26%,transparent) calc(var(--rl-todo-r) - 80px),transparent calc(var(--rl-todo-r) - 78.5px));animation:rl-todo-wave 1.25s cubic-bezier(.22,.7,.3,1) .04s both}",
      ".rl-cost-head{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:baseline;column-gap:8px;padding:11px 14px 9px;border-bottom:.5px solid var(--dsw-alias-border-l2)}",
      ".rl-cost-title{font-size:13.5px;line-height:20px;font-weight:500;color:var(--dsw-alias-label-primary)}",
      ".rl-cost-code{min-width:0;overflow:hidden;white-space:nowrap;font:600 9px/14px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;letter-spacing:.16em;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cost-period{display:inline-flex;align-items:center;gap:6px;font-size:11px;white-space:nowrap;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cost-period::before{content:\"\";width:5px;height:5px;background:#a5c22a}",
      ".rl-cost-period[data-peak]{color:var(--dsw-static-deepseek-500)}",
      ".rl-cost-period[data-peak]::before{background:var(--dsw-static-deepseek-500);animation:rl-todo-blink 2.4s ease-in-out infinite}",
      ".rl-cost-body{max-height:min(560px,var(--rl-cost-max,560px));overflow-y:auto;overscroll-behavior:contain;padding:10px 14px 6px;scrollbar-width:thin;animation:rl-todo-rise .38s cubic-bezier(.16,1,.3,1) .06s both}",
      ".rl-cost-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}",
      ".rl-cost-tile{position:relative;min-width:0;padding:6px 9px 7px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:color-mix(in srgb,var(--dsw-alias-label-primary) 2.5%,transparent)}",
      ".rl-cost-k{display:block;font-size:11px;line-height:16px;white-space:nowrap;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cost-v{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:500 15px/20px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}",
      ".rl-cost-tile[data-kind=session] .rl-cost-v{color:var(--dsw-static-deepseek-500)}",
      ".rl-cost-chart-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:13px 0 7px}",
      ".rl-cost-sec-label{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cost-range{display:inline-flex;padding:1px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm)}",
      ".rl-cost-range button{height:20px;padding:0 8px;border:0;border-radius:var(--dsw-radius-xs);background:transparent;font:11px/20px var(--dsw-font-family);color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:background-color .15s,color .15s}",
      ".rl-cost-range button:hover{color:var(--dsw-alias-label-primary)}",
      ".rl-cost-range button[aria-pressed=true]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);color:var(--dsw-alias-label-primary)}",
      ".rl-cost-range button:focus-visible{outline:1.5px solid var(--dsw-static-deepseek-500)}",
      // Quarter gridlines behind square-ended bars; today in the accent.
      ".rl-cost-chart{display:flex;align-items:flex-end;gap:5px;height:56px;border-bottom:.5px solid var(--dsw-alias-border-l3);background:linear-gradient(to top,var(--dsw-alias-border-l2) .5px,transparent .5px) 0 0/100% 25%}",
      ".rl-cost-chart[data-range=\"30\"]{gap:2px}",
      ".rl-cost-bar{flex:1;min-width:0;height:max(2px,calc(var(--h) * 100%));background:color-mix(in srgb,var(--dsw-alias-label-tertiary) 55%,transparent);transform-origin:bottom;animation:rl-cost-grow .5s cubic-bezier(.16,1,.3,1) .1s both;transition:background-color .15s}",
      ".rl-cost-bar:hover{background:var(--dsw-alias-label-secondary)}",
      ".rl-cost-bar[data-today]{background:var(--dsw-static-deepseek-500)}",
      ".rl-cost-axis{display:flex;justify-content:space-between;margin-top:4px;font:10px/14px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cost-sec{margin-top:13px}",
      ".rl-cost-sec>.rl-cost-sec-label{display:flex;align-items:center;gap:7px;margin-bottom:5px}",
      ".rl-cost-sec>.rl-cost-sec-label::after{content:\"\";flex:1;height:.5px;background:var(--dsw-alias-border-l2)}",
      ".rl-cost-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:baseline;column-gap:8px;font-size:12px;line-height:18px}",
      ".rl-cost-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary)}",
      ".rl-cost-amt{font:500 12px/18px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}",
      ".rl-cost-pct{min-width:30px;text-align:right;font:10.5px/18px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cost-track{height:3px;margin:3px 0 8px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent)}",
      ".rl-cost-track>i{display:block;height:100%;width:calc(var(--w) * 100%);background:var(--dsw-static-deepseek-500);transition:width .45s cubic-bezier(.16,1,.3,1)}",
      ".rl-cost-sec:not(.rl-cost-budgets) .rl-cost-track>i{background:color-mix(in srgb,var(--dsw-static-deepseek-500) 75%,transparent)}",
      ".rl-cost-conv{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:8px;width:calc(100% + 12px);margin:0 -6px;padding:4px 6px;border:0;border-radius:var(--dsw-radius-xs);background:transparent;font:inherit;text-align:left;color:inherit;cursor:pointer;transition:background-color .15s}",
      ".rl-cost-conv:hover,.rl-cost-conv:focus-visible{background:var(--dsw-alias-interactive-bg-hover);outline:none}",
      ".rl-cost-conv:focus-visible{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-static-deepseek-500) 55%,transparent)}",
      ".rl-cost-budget{--rl-cost-c:#a5c22a}",
      ".rl-cost-budget[data-state=warn]{--rl-cost-c:var(--dsw-static-deepseek-500)}",
      ".rl-cost-budget[data-state=over]{--rl-cost-c:var(--dsw-alias-state-error-primary,#d63a4f)}",
      ".rl-cost-budget .rl-cost-track>i{background:var(--rl-cost-c)}",
      ".rl-cost-budget[data-state=over] .rl-cost-pct,.rl-cost-budget[data-state=warn] .rl-cost-pct{color:var(--rl-cost-c)}",
      ".rl-cost-limit{justify-self:end;padding:0;border:0;border-bottom:.5px dashed var(--dsw-alias-border-l3);background:transparent;font:11.5px/17px var(--dsw-font-family);color:var(--dsw-alias-label-secondary);cursor:text;transition:color .15s,border-color .15s}",
      ".rl-cost-limit:hover,.rl-cost-limit:focus-visible{border-bottom-color:var(--dsw-static-deepseek-500);color:var(--dsw-alias-label-primary);outline:none}",
      ".rl-cost-input{justify-self:end;box-sizing:border-box;width:92px;height:22px;padding:0 6px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-base);font:12px/20px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;text-align:right;color:var(--dsw-alias-label-primary);outline:none}",
      ".rl-cost-input:focus{border-color:var(--dsw-static-deepseek-500);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-static-deepseek-500) 18%,transparent)}",
      ".rl-cost-input[aria-invalid=true]{border-color:var(--dsw-alias-state-error-primary,#d63a4f)}",
      ".rl-cost-empty{margin:14px 0 6px;font-size:12px;text-align:center;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cost-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:4px;padding:8px 14px;border-top:.5px solid var(--dsw-alias-border-l2);font-size:11.5px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cost-balance{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".rl-cost-settings{flex:none;height:24px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);background:transparent;font:11.5px/22px var(--dsw-font-family);color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background-color .15s,color .15s}",
      ".rl-cost-settings:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
      ".rl-cost-settings:focus-visible{outline:1.5px solid var(--dsw-static-deepseek-500);outline-offset:1px}",
      ".rl-cost-note{margin:0;padding:0 14px 10px;font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-tertiary)}",
      "@media (prefers-reduced-motion:reduce){.rl-cost-pop,.rl-cost-body,.rl-cost-bar,.rl-cost-period::before{animation:none!important}.rl-cost-pop::after{display:none}.rl-cost-track>i{transition:none}}",
      ".rl-cost-chart[role=button]{cursor:pointer;outline:none;border-radius:2px;transition:background-color .15s}",
      ".rl-cost-chart[role=button]:hover{background-color:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent)}",
      ".rl-cost-chart[role=button]:hover .rl-cost-bar:not([data-today]){background:color-mix(in srgb,var(--dsw-alias-label-tertiary) 80%,transparent)}",
      ".rl-cost-chart[role=button]:focus-visible{box-shadow:0 0 0 1.5px var(--dsw-static-deepseek-500)}",
      ".rl-cost-more{margin-left:auto}",
      ".rl-cost-more+.rl-cost-settings{margin-left:6px}",
      "@keyframes rl-cost-grow{from{transform:scaleY(0)}}",
      // Billing page (main panel "rhine-cost"). Model colours are fixed per
      // model (validated as a categorical set in both themes); single-series
      // marks use the neutral --rl-m0.
      ".rl-cp{--rl-m0:color-mix(in srgb,var(--dsw-alias-label-primary) 46%,transparent);--rl-m1:#e46f24;--rl-m2:#2f6bd8;--rl-m3:#5f9420;--rl-cp-mono:ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;height:100%;overflow-y:auto;background:var(--dsw-alias-bg-base);container-type:inline-size;scrollbar-width:thin}",
      "body[data-ds-dark-theme] .rl-cp{--rl-m2:#5a8ef0;--rl-m3:#6e9f2c}",
      ".rl-cp i[data-slot]{background:var(--rl-m0)}",
      ".rl-cp i[data-slot=\"1\"]{background:var(--rl-m1)}",
      ".rl-cp i[data-slot=\"2\"]{background:var(--rl-m2)}",
      ".rl-cp i[data-slot=\"3\"]{background:var(--rl-m3)}",
      ".rl-cp-inner{box-sizing:border-box;display:flex;flex-direction:column;gap:16px;max-width:1120px;margin:0 auto;padding:22px 32px 48px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary)}",
      ".rl-cp-inner>*{animation:rl-todo-rise .42s cubic-bezier(.16,1,.3,1) both}",
      ".rl-cp-inner>:nth-child(2){animation-delay:.04s}.rl-cp-inner>:nth-child(3){animation-delay:.08s}.rl-cp-inner>:nth-child(4){animation-delay:.12s}.rl-cp-inner>:nth-child(n+5){animation-delay:.16s}",
      ".rl-cp-head{position:relative;display:flex;flex-direction:column;gap:12px;padding-bottom:16px;border-bottom:.5px solid var(--dsw-alias-border-l2)}",
      ".rl-cp-head::after{content:\"\";position:absolute;left:0;bottom:-1px;width:48px;height:1.5px;background:var(--dsw-static-deepseek-500)}",
      ".rl-cp-crumbs{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}",
      ".rl-cp-back{display:inline-flex;align-items:center;gap:7px;height:26px;margin-left:-8px;padding:0 9px 0 8px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;font:12.5px/26px var(--dsw-font-family);color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background-color .15s,color .15s}",
      ".rl-cp-back::before{content:\"\";width:5px;height:5px;margin-left:3px;border-left:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg)}",
      ".rl-cp-back:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
      ".rl-cp-code{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font:600 9.5px/14px var(--rl-cp-mono);letter-spacing:.18em;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cp-titlebar{display:flex;align-items:center;flex-wrap:wrap;gap:8px 16px}",
      ".rl-cp-title{margin:0;font-size:26px;line-height:34px;font-weight:600;letter-spacing:.02em;color:var(--dsw-alias-label-primary)}",
      ".rl-cp-period{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cp-period::before{content:\"\";width:6px;height:6px;background:#a5c22a}",
      ".rl-cp-period[data-peak]{color:var(--dsw-static-deepseek-500)}",
      ".rl-cp-period[data-peak]::before{background:var(--dsw-static-deepseek-500);animation:rl-todo-blink 2.4s ease-in-out infinite}",
      ".rl-cp-btn{margin-left:auto;height:28px;padding:0 13px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);background:transparent;font:500 12.5px/1 var(--dsw-font-family);color:var(--dsw-alias-label-primary);cursor:pointer;transition:background-color .15s}",
      ".rl-cp-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}",
      ".rl-cp-filters,.rl-cp-toggle{display:inline-flex;align-self:flex-start;padding:2px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md)}",
      ".rl-cp-filters button,.rl-cp-toggle button{height:26px;padding:0 13px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;font:12.5px/26px var(--dsw-font-family);white-space:nowrap;color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background-color .15s,color .15s}",
      ".rl-cp-filters button:hover,.rl-cp-toggle button:hover{color:var(--dsw-alias-label-primary)}",
      ".rl-cp-filters button[aria-pressed=true],.rl-cp-toggle button[aria-pressed=true]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);font-weight:500;color:var(--dsw-alias-label-primary)}",
      ".rl-cp-toggle{padding:1px;border-radius:var(--dsw-radius-sm)}",
      ".rl-cp-toggle button{height:22px;padding:0 9px;font-size:11.5px;line-height:22px;border-radius:var(--dsw-radius-xs)}",
      ".rl-cp button:focus-visible,.rl-cp-area:focus-visible{outline:1.5px solid var(--dsw-static-deepseek-500);outline-offset:1px}",
      ".rl-cp-kpis{display:grid;grid-template-columns:minmax(0,1.5fr) repeat(4,minmax(0,1fr));gap:10px}",
      "@container (max-width:980px){.rl-cp-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.rl-cp-kpi[data-kind=total]{grid-column:1/-1}}",
      ".rl-cp-kpi{position:relative;display:flex;flex-direction:column;gap:3px;min-width:0;padding:13px 15px 14px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:color-mix(in srgb,var(--dsw-alias-label-primary) 2%,transparent)}",
      ".rl-cp-kpi[data-kind=total]::before{content:\"\";position:absolute;left:0;top:14px;bottom:14px;width:2px;background:var(--dsw-static-deepseek-500)}",
      ".rl-cp-kpi-k{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cp-kpi-v{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:22px;line-height:30px;font-weight:600;color:var(--dsw-alias-label-primary)}",
      ".rl-cp-kpi[data-kind=total] .rl-cp-kpi-v{font-size:32px;line-height:40px;letter-spacing:-.01em}",
      ".rl-cp-kpi-d{display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cp-kpi-d[data-trend]::before{content:\"\";flex:none;border:4px solid transparent}",
      ".rl-cp-kpi-d[data-trend=up]::before{margin-top:-4px;border-bottom:5px solid var(--dsw-static-deepseek-500)}",
      ".rl-cp-kpi-d[data-trend=down]::before{margin-top:4px;border-top:5px solid #a5c22a}",
      ".rl-cp-card{position:relative;min-width:0;padding:14px 16px 16px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:color-mix(in srgb,var(--dsw-alias-label-primary) 1.5%,transparent)}",
      ".rl-cp-card-head{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;min-height:26px;margin-bottom:14px}",
      ".rl-cp-card-head>:nth-child(3){margin-left:auto}",
      ".rl-cp-idx{font:600 10px/14px var(--rl-cp-mono);letter-spacing:.12em;color:var(--dsw-static-deepseek-500)}",
      ".rl-cp-card-head h2{margin:0;font-size:13.5px;line-height:20px;font-weight:600;color:var(--dsw-alias-label-primary)}",
      ".rl-cp-legend{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary)}",
      ".rl-cp-legend span,.rl-cp-key span{display:inline-flex;align-items:center;gap:6px}",
      ".rl-cp-legend i{width:8px;height:8px;border-radius:2px}",
      ".rl-cp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:16px}",
      "@container (max-width:760px){.rl-cp-inner{padding:18px 16px 40px}}",
      ".rl-cp-plot{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:10px}",
      ".rl-cp-yaxis{grid-area:1/1;display:flex;flex-direction:column;justify-content:space-between;height:180px;margin:-7px 0;text-align:right;font:10.5px/14px var(--rl-cp-mono);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cp-card[data-kind=hours] .rl-cp-yaxis,.rl-cp-card[data-kind=hours] .rl-cp-area{height:140px}",
      ".rl-cp-area{grid-area:1/2;position:relative;height:180px;border-bottom:1px solid var(--dsw-alias-border-l3);outline:none}",
      ".rl-cp-rule{position:absolute;left:0;right:0;bottom:calc(var(--y) * 100%);height:1px;background:var(--dsw-alias-border-l2)}",
      ".rl-cp-bands{position:absolute;inset:0;display:flex}",
      ".rl-cp-bands>i{flex:1}",
      ".rl-cp-bands>i[data-on],.rl-cp-key i[data-band]{background:color-mix(in srgb,var(--dsw-static-deepseek-500) 9%,transparent)}",
      ".rl-cp-cols{position:absolute;inset:0;display:flex}",
      ".rl-cp-col{display:flex;flex:1;align-items:flex-end;justify-content:center;min-width:0;height:100%;transition:background-color .12s}",
      ".rl-cp-col[data-active]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent)}",
      ".rl-cp-stack{display:flex;flex-direction:column-reverse;gap:2px;width:min(24px,72%);height:calc(var(--h) * 100%);transform-origin:bottom;animation:rl-cost-grow .55s cubic-bezier(.16,1,.3,1) .12s both}",
      ".rl-cp-plot[data-count=\"62\"] .rl-cp-stack{width:80%}",
      ".rl-cp-stack>i{display:block;flex-basis:0;min-height:2px}",
      ".rl-cp-stack>i:last-child{border-radius:3px 3px 0 0}",
      ".rl-cp-plot[data-count=\"62\"] .rl-cp-stack>i:last-child{border-radius:1.5px 1.5px 0 0}",
      ".rl-cp-col[data-active] .rl-cp-stack{filter:brightness(1.1) saturate(1.05)}",
      ".rl-cp-line{position:absolute;left:0;right:0;bottom:calc(var(--y) * 100%);border-top:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary,#d63a4f) 75%,transparent);pointer-events:none}",
      ".rl-cp-line>span{position:absolute;right:0;bottom:3px;padding:0 5px;border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-base);font-size:10.5px;line-height:15px;white-space:nowrap;color:var(--dsw-alias-label-secondary)}",
      ".rl-cp-tip{position:absolute;top:6px;left:calc(var(--x) * 100%);z-index:2;display:flex;flex-direction:column;min-width:112px;padding:8px 11px 9px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-base);box-shadow:0 8px 24px rgba(0,0,0,.12);font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-secondary);pointer-events:none;transform:translateX(14px)}",
      ".rl-cp-tip[data-edge=end]{transform:translateX(calc(-100% - 14px))}",
      ".rl-cp-tip>b{font-size:15px;line-height:21px;font-weight:600;color:var(--dsw-alias-label-primary)}",
      ".rl-cp-tip-k{margin-bottom:3px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cp-tip-row{display:grid;grid-template-columns:12px minmax(0,1fr) auto;align-items:center;column-gap:7px}",
      ".rl-cp-tip-row>i{height:2px;border-radius:1px}",
      ".rl-cp-xaxis{grid-area:2/2;position:relative;height:16px;margin-top:6px;font:10.5px/16px var(--rl-cp-mono);color:var(--dsw-alias-label-tertiary)}",
      ".rl-cp-xaxis>span{position:absolute;left:calc(var(--x) * 100%);transform:translateX(-50%);white-space:nowrap}",
      ".rl-cp-key{grid-area:3/2;margin-top:8px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cp-key i{width:10px;height:10px}",
      ".rl-cp-tablewrap{margin:0 -8px;overflow-x:auto;scrollbar-width:thin}",
      ".rl-cp-table{width:100%;border-collapse:collapse;font-size:12.5px;line-height:18px}",
      ".rl-cp-table th{padding:0 8px 7px;border-bottom:.5px solid var(--dsw-alias-border-l2);text-align:left;font-weight:500;font-size:11.5px;white-space:nowrap;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cp-table td{padding:7px 8px;border-bottom:.5px solid color-mix(in srgb,var(--dsw-alias-border-l2) 60%,transparent);white-space:nowrap;color:var(--dsw-alias-label-secondary)}",
      ".rl-cp-table tbody tr:last-child td{border-bottom:0}",
      ".rl-cp-table tbody tr:hover td{background:color-mix(in srgb,var(--dsw-alias-label-primary) 2.5%,transparent)}",
      ".rl-cp-table .rl-cp-num{text-align:right}",
      ".rl-cp-num{font-family:var(--rl-cp-mono);font-size:12px;font-variant-numeric:tabular-nums}",
      ".rl-cp-strong{font-weight:500;color:var(--dsw-alias-label-primary)}",
      ".rl-cp-table .rl-cp-dim,.rl-cp-dim{color:var(--dsw-alias-label-tertiary)}",
      ".rl-cp-model{display:inline-flex;align-items:center;gap:7px;color:var(--dsw-alias-label-primary)}",
      ".rl-cp-model>i{flex:none;width:8px;height:8px;border-radius:2px}",
      ".rl-cp-dim .rl-cp-model{color:inherit}",
      ".rl-cp-share{display:flex;align-items:center;gap:8px;min-width:120px}",
      ".rl-cp-share>.rl-cp-num{min-width:36px;text-align:right;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cp-share-track,.rl-cp-meter-track{flex:1;height:4px;border-radius:2px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent)}",
      ".rl-cp-share-track>i,.rl-cp-meter-track>i{display:block;width:calc(var(--w) * 100%);height:100%;border-radius:inherit;background:var(--rl-m0);transition:width .45s cubic-bezier(.16,1,.3,1)}",
      ".rl-cp-share-track--wide,.rl-cp-meter-track{height:6px;margin:7px 0 5px;border-radius:3px}",
      ".rl-cp-conv{max-width:340px;overflow:hidden;text-overflow:ellipsis}",
      ".rl-cp-conv>button{max-width:100%;overflow:hidden;padding:0;border:0;background:none;font:inherit;text-align:left;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);cursor:pointer}",
      ".rl-cp-conv>button:hover{color:var(--dsw-static-deepseek-500);text-decoration:underline;text-underline-offset:3px}",
      ".rl-cp-gone{font-style:italic;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cp-lead{margin:0 0 14px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary)}",
      ".rl-cp-bars{display:flex;flex-direction:column;gap:14px}",
      ".rl-cp-bars--grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px 28px}",
      ".rl-cp-barhead{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;min-height:22px;font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-primary)}",
      ".rl-cp-ellipsis{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}",
      ".rl-cp-barfoot{font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cp-note{margin:14px 0 0;font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cp-aside{font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cp-budgets{display:flex;flex-direction:column;gap:16px}",
      ".rl-cp-meter{--rl-cp-c:#a5c22a}",
      ".rl-cp-meter[data-state=warn]{--rl-cp-c:var(--dsw-static-deepseek-500)}",
      ".rl-cp-meter[data-state=over]{--rl-cp-c:var(--dsw-alias-state-error-primary,#d63a4f)}",
      ".rl-cp-meter-track>i{background:var(--rl-cp-c)}",
      ".rl-cp-meter[data-state=over] .rl-cp-barfoot{color:var(--dsw-alias-state-error-primary,#d63a4f)}",
      ".rl-cp-limit{height:22px;padding:0 7px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:transparent;font:12px/20px var(--rl-cp-mono);color:var(--dsw-alias-label-primary);cursor:pointer;transition:background-color .15s,border-color .15s}",
      ".rl-cp-limit:hover:not(:disabled){border-color:var(--dsw-alias-border-l3);background:var(--dsw-alias-interactive-bg-hover)}",
      ".rl-cp-input{box-sizing:border-box;width:96px;height:22px;padding:0 7px;border:.5px solid var(--dsw-static-deepseek-500);border-radius:var(--dsw-radius-sm);background:transparent;font:12px/20px var(--rl-cp-mono);text-align:right;color:var(--dsw-alias-label-primary);outline:none}",
      ".rl-cp-input[aria-invalid]{border-color:var(--dsw-alias-state-error-primary,#d63a4f)}",
      ".rl-cp-link{padding:0;border:0;background:none;font:inherit;font-size:12px;color:var(--dsw-static-deepseek-500);cursor:pointer}",
      ".rl-cp-link:hover{text-decoration:underline;text-underline-offset:3px}",
      ".rl-cp-empty{margin:28px 0;text-align:center;font-size:12.5px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cp-foot{font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-tertiary)}",
      "@media (prefers-reduced-motion:reduce){.rl-cp-inner>*,.rl-cp-stack{animation:none}.rl-cp-period[data-peak]::before{animation:none}}",
      // Rhine row status: dsh draws the status dots (StateDot, keyed by
      // data-state) in session rows and in their hover card; these rules only
      // restyle them, so the states stay dsh's own. Waiting pulses in the
      // accent, running spins as a thin accent arc, finished-unread is the
      // lime square. StateDot fills its dot with a round ::after in the state
      // colour and strokes the spinner with currentColor, so the squares clear
      // that ::after and the spinner is recoloured through color (its track
      // keeps dsh's own .25 opacity). The hover line from RowStatusTime adds how long.
      "html[data-rl-rows] [data-row-key^=\"session:\"] [data-state=warning],html[data-rl-rows] [data-slot=\"sidebar.session.row.hover\"]~* [data-state=warning]{position:relative;width:7px!important;height:7px!important;border-radius:1px;background:var(--dsw-static-deepseek-500)}",
      "html[data-rl-rows] [data-row-key^=\"session:\"] :is([data-state=warning],[data-state=done])::after,html[data-rl-rows] [data-slot=\"sidebar.session.row.hover\"]~* :is([data-state=warning],[data-state=done])::after{background:none}",
      "html[data-rl-rows] [data-row-key^=\"session:\"] [data-state=warning]::after{content:\"\";position:absolute;inset:-3px;border:1px solid var(--dsw-static-deepseek-500);border-radius:2px;corner-shape:round;animation:rl-row-ping 1.8s cubic-bezier(.2,.6,.3,1) infinite}",
      "html[data-rl-rows] [data-row-key^=\"session:\"] [data-state=done],html[data-rl-rows] [data-slot=\"sidebar.session.row.hover\"]~* [data-state=done]{width:7px!important;height:7px!important;border-radius:1px;background:#a5c22a}",
      "html[data-rl-rows] [data-row-key^=\"session:\"] svg[data-state=ongoing],html[data-rl-rows] [data-slot=\"sidebar.session.row.hover\"]~* svg[data-state=ongoing]{color:var(--dsw-static-deepseek-500)}",
      // dsh's hover card is always dark with fixed greys; match its status line.
      ".rl-row-time{display:flex;align-items:center;gap:8px;font-size:12px;line-height:20px;font-variant-numeric:tabular-nums;color:#cfd3d6}",
      ".rl-row-time::before{content:\"\";flex:none;box-sizing:border-box;width:7px;height:7px;border-radius:1px;background:#adb2b8}",
      ".rl-row-time[data-kind=pending]::before{background:var(--dsw-static-deepseek-500)}",
      ".rl-row-time[data-kind=done]::before{background:#a5c22a}",
      ".rl-row-time[data-kind=running]::before{border:1.5px solid var(--dsw-static-deepseek-500);border-radius:50%;background:transparent}",
      "@keyframes rl-row-ping{0%{opacity:.8;transform:scale(.6)}70%,100%{opacity:0;transform:scale(1.5)}}",
      "@media (prefers-reduced-motion:reduce){html[data-rl-rows] [data-row-key^=\"session:\"] [data-state=warning]::after{animation:none;opacity:0}}",
      // To-do center. The trigger is a slim bar on its own line above the billing
      // card (the footer row is a flex row, so it is allowed to wrap) and an icon
      // with a count badge on the collapsed rail. Its edge bar and pip follow
      // --rl-todo-c (accent while something needs you, lime when only unread
      // results are left). The panel is frosted like the notices and opens with a
      // ring wave from the corner nearest the trigger.
      "@property --rl-todo-r{syntax:'<length>';inherits:false;initial-value:0px}",
      ".rl-todo-btn{--rl-todo-c:var(--dsw-alias-border-l3);position:relative;box-sizing:border-box;display:flex;flex:1 1 100%;align-items:center;gap:8px;min-width:0;margin:2px 8px 4px;padding:6px 11px 6px 13px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:transparent;font:inherit;text-align:left;color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:background-color .2s,border-color .2s}",
      // The slot list sits in a display:contents wrapper, so the flex row may be
      // the parent or the grandparent.
      "div:has(> .rl-todo-btn[data-mode=bar]),div:has(> div > .rl-todo-btn[data-mode=bar]){flex-wrap:wrap}",
      ".rl-todo-btn[data-tone=pending]{--rl-todo-c:var(--dsw-static-deepseek-500)}",
      ".rl-todo-btn[data-tone=done]{--rl-todo-c:#a5c22a}",
      ".rl-todo-btn:hover,.rl-todo-btn[data-open]{border-color:var(--dsw-alias-border-l3);background:var(--dsw-alias-interactive-bg-hover)}",
      ".rl-todo-btn:focus-visible{outline:1.5px solid var(--dsw-static-deepseek-500);outline-offset:1px}",
      ".rl-todo-btn::before{content:\"TODO\";order:-1;flex:none;font:600 9px/14px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;letter-spacing:.16em}",
      ".rl-todo-btn::after{content:\"\";position:absolute;left:0;top:7px;bottom:7px;width:2px;background:var(--rl-todo-c);transition:background-color .3s}",
      ".rl-todo-btn-tag{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);white-space:nowrap}",
      ".rl-todo-btn-sub{margin-left:auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-todo-btn-n{order:1;font:500 13px/18px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary)}",
      ".rl-todo-btn[data-tone=pending] .rl-todo-btn-n{color:var(--dsw-static-deepseek-500)}",
      ".rl-todo-btn[data-tone=done] .rl-todo-btn-n{color:var(--dsw-alias-label-primary)}",
      ".rl-todo-btn-pip{order:2;position:relative;flex:none;width:5px;height:5px;background:var(--rl-todo-c)}",
      ".rl-todo-btn[data-tone=pending] .rl-todo-btn-pip::before{content:\"\";position:absolute;inset:0;border:1px solid var(--rl-todo-c);animation:rl-todo-ping 1.8s cubic-bezier(.2,.6,.35,1) infinite}",
      ".rl-todo-btn[data-tone=idle][data-running] .rl-todo-btn-pip{background:var(--dsw-alias-label-tertiary);animation:rl-todo-blink 1.6s ease-in-out infinite}",
      // Collapsed rail: the official icon with a count badge.
      ".rl-todo-btn[data-mode=rail]{display:grid;place-items:center;flex:none;width:32px;height:32px;margin:2px 0 6px;padding:0;border-color:transparent;color:var(--dsw-alias-label-secondary)}",
      ".rl-todo-btn[data-mode=rail]:hover,.rl-todo-btn[data-mode=rail][data-open]{border-color:transparent}",
      ".rl-todo-btn[data-mode=rail]::before,.rl-todo-btn[data-mode=rail]::after{content:none}",
      ".rl-todo-btn-icon{display:grid;place-items:center;width:16px;height:16px}",
      ".rl-todo-btn-icon svg{width:16px;height:16px}",
      ".rl-todo-btn-badge{position:absolute;top:1px;right:0;box-sizing:border-box;min-width:14px;height:14px;padding:0 3px;border-radius:2px;background:var(--rl-todo-c);font:600 9px/14px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;text-align:center;color:#fff}",
      ".rl-todo-btn[data-tone=done] .rl-todo-btn-badge{color:#1f2606}",
      // Panel.
      ".rl-todo-pop{position:fixed;z-index:1250;box-sizing:border-box;width:320px;display:flex;flex-direction:column;isolation:isolate;overflow:hidden;border:.5px solid color-mix(in srgb,var(--dsw-alias-label-primary) 12%,transparent);border-radius:var(--dsw-radius-md);background:color-mix(in srgb,var(--dsw-alias-bg-base) 95%,transparent);-webkit-backdrop-filter:blur(18px) saturate(1.6);backdrop-filter:blur(18px) saturate(1.6);box-shadow:0 16px 40px rgba(0,0,0,.14),inset 0 1px 0 rgba(255,255,255,.4);font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);outline:none;transform-origin:left bottom;animation:rl-todo-in .34s cubic-bezier(.16,1,.3,1) both}",
      "body[data-ds-dark-theme] .rl-todo-pop{background:color-mix(in srgb,var(--dsw-alias-bg-base) 93%,transparent);box-shadow:0 18px 44px rgba(0,0,0,.46),inset 0 1px 0 rgba(255,255,255,.07)}",
      ".rl-todo-pop::after{content:\"\";position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(circle at 0 100%,transparent calc(var(--rl-todo-r) - 30px),color-mix(in srgb,var(--dsw-static-deepseek-500) 12%,transparent) calc(var(--rl-todo-r) - 1.5px),color-mix(in srgb,var(--dsw-static-deepseek-500) 46%,transparent) var(--rl-todo-r),transparent calc(var(--rl-todo-r) + 1.5px)),radial-gradient(circle at 0 100%,transparent calc(var(--rl-todo-r) - 110px),color-mix(in srgb,var(--dsw-static-deepseek-500) 7%,transparent) calc(var(--rl-todo-r) - 81px),color-mix(in srgb,var(--dsw-static-deepseek-500) 26%,transparent) calc(var(--rl-todo-r) - 80px),transparent calc(var(--rl-todo-r) - 78.5px));animation:rl-todo-wave 1.25s cubic-bezier(.22,.7,.3,1) .04s both}",
      ".rl-todo-head{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:baseline;column-gap:8px;padding:11px 14px 9px;border-bottom:.5px solid var(--dsw-alias-border-l2)}",
      ".rl-todo-title{font-size:13.5px;line-height:20px;font-weight:500;color:var(--dsw-alias-label-primary)}",
      ".rl-todo-code{min-width:0;overflow:hidden;white-space:nowrap;font:600 9px/14px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;letter-spacing:.16em;color:var(--dsw-alias-label-tertiary)}",
      ".rl-todo-sum{font-size:11.5px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);white-space:nowrap}",
      ".rl-todo-list{max-height:min(440px,var(--rl-todo-max,440px));overflow-y:auto;overscroll-behavior:contain;padding:2px 0 6px;scrollbar-width:thin}",
      ".rl-todo-group{--rl-todo-c:var(--dsw-static-deepseek-500);animation:rl-todo-rise .38s cubic-bezier(.16,1,.3,1) .06s both}",
      ".rl-todo-group:nth-child(2){animation-delay:.11s}",
      ".rl-todo-group:nth-child(3){animation-delay:.16s}",
      ".rl-todo-group[data-kind=done]{--rl-todo-c:#a5c22a}",
      ".rl-todo-group[data-kind=running]{--rl-todo-c:var(--dsw-alias-label-tertiary)}",
      ".rl-todo-gh{display:flex;align-items:center;gap:7px;padding:9px 14px 3px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-todo-gh b{font:500 10px/16px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;font-variant-numeric:tabular-nums}",
      ".rl-todo-gh::after{content:\"\";flex:1;height:.5px;background:var(--dsw-alias-border-l2)}",
      ".rl-todo-pip{position:relative;flex:none;width:5px;height:5px;background:var(--rl-todo-c)}",
      ".rl-todo-group[data-kind=pending] .rl-todo-pip::before{content:\"\";position:absolute;inset:0;border:1px solid var(--rl-todo-c);animation:rl-todo-ping 1.8s cubic-bezier(.2,.6,.35,1) .3s infinite}",
      ".rl-todo-group[data-kind=running] .rl-todo-pip{animation:rl-todo-blink 1.6s ease-in-out infinite}",
      ".rl-todo-row{position:relative;box-sizing:border-box;display:grid;grid-template-columns:2px minmax(0,1fr) auto;align-items:center;column-gap:10px;width:100%;padding:6px 14px 6px 12px;border:0;background:transparent;font:inherit;text-align:left;color:inherit;cursor:pointer;outline:none;transition:background-color .15s}",
      ".rl-todo-row:hover,.rl-todo-row:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}",
      ".rl-todo-row:focus-visible{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-static-deepseek-500) 55%,transparent)}",
      ".rl-todo-row[data-current]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 3.5%,transparent)}",
      ".rl-todo-bar{align-self:stretch;margin:2px 0;background:var(--rl-todo-c)}",
      // A running row's bar carries a slow light sweeping down it.
      ".rl-todo-row[data-kind=running] .rl-todo-bar{background:linear-gradient(180deg,transparent 0 35%,var(--dsw-alias-label-secondary) 50%,transparent 65% 100%) 0 0/100% 300% no-repeat,color-mix(in srgb,var(--dsw-alias-label-tertiary) 45%,transparent);animation:rl-todo-scan 1.8s linear infinite}",
      ".rl-todo-main{display:flex;flex-direction:column;min-width:0}",
      ".rl-todo-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:19px;color:var(--dsw-alias-label-primary)}",
      ".rl-todo-status{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-todo-row[data-kind=pending] .rl-todo-status{color:var(--dsw-static-deepseek-500)}",
      ".rl-todo-time{font:500 10.5px/16px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--dsw-alias-label-tertiary)}",
      ".rl-todo-empty{--rl-todo-c:#a5c22a;display:grid;justify-items:center;gap:3px;padding:26px 14px 22px;animation:rl-todo-rise .38s cubic-bezier(.16,1,.3,1) .06s both}",
      ".rl-todo-empty .rl-todo-pip{width:7px;height:7px;margin-bottom:7px}",
      ".rl-todo-empty .rl-todo-pip::before{content:\"\";position:absolute;inset:0;border:1px solid var(--rl-todo-c);animation:rl-todo-ping 1.8s cubic-bezier(.2,.6,.35,1) .3s 2 both}",
      ".rl-todo-empty-code{font:600 9px/14px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;letter-spacing:.24em;color:var(--dsw-alias-label-tertiary)}",
      ".rl-todo-empty-text{font-size:12px;color:var(--dsw-alias-label-secondary)}",
      "@keyframes rl-todo-in{from{opacity:0;transform:translateY(6px) scale(.985);filter:blur(3px)}}",
      "@keyframes rl-todo-rise{from{opacity:0;transform:translateY(4px)}}",
      "@keyframes rl-todo-wave{from{--rl-todo-r:0px}75%{opacity:1}to{--rl-todo-r:520px;opacity:0}}",
      "@keyframes rl-todo-ping{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(4.2)}}",
      "@keyframes rl-todo-blink{50%{opacity:.3}}",
      "@keyframes rl-todo-scan{from{background-position:0 100%,0 0}to{background-position:0 0,0 0}}",
      "@media (prefers-reduced-motion:reduce){.rl-todo-pop,.rl-todo-group,.rl-todo-empty,.rl-todo-bar,.rl-todo-btn-pip,.rl-todo-pip{animation:none!important}.rl-todo-pop::after,.rl-todo-pip::before,.rl-todo-btn-pip::before{display:none}}",
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
      ".rl-arc-count{flex:1;min-width:0;font:500 11px/16px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary)}",
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
      ".rl-arc-btn{height:30px;padding:0 14px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);background:transparent;font:500 13px/1 var(--dsw-font-family);color:var(--dsw-alias-label-primary);white-space:nowrap;cursor:pointer}",
      ".rl-arc-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}",
      ".rl-arc-btn--danger{border-color:transparent;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,transparent);color:var(--dsw-alias-state-error-primary)}",
      ".rl-arc-btn--danger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 22%,transparent)}",
      ".rl-danger-action:not(:disabled){color:var(--dsw-alias-state-error-primary)}",
      ".rl-del-status{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}",
      ".rl-arc-btn:disabled{opacity:.45;cursor:default}",
      // Blank-page backgrounds. While the conversation root is in its hero phase,
      // <html data-rl-hero> picks a style and two pseudo-elements paint it under
      // the content (isolation keeps z-index:-1 above the root's own
      // background). ::before carries the coloured layers (gradients, the bars
      // image) and the status line; ::after carries fine detail and labels:
      // small SVGs used as its mask layers, so they take the theme's ink, or the
      // accent wherever an accent zone lies under them. An SVG image sees only
      // system fonts, so its labels use the monospace stack. Every style shares
      // one HUD frame (corner brackets with an accent square, a right-edge
      // ruler, the status line) in the same hairline language as the resume
      // effects.
      ...(() => {
        const T = "var(--rl-hb-t)", A = "var(--rl-hb-accent)", S = "var(--rl-hb-strong)", BG = "var(--rl-hb-bg)";
        const on = (style, part) => `html[data-rl-hero=${style}] [data-phase=hero]${part}`;
        const solid = (color) => `linear-gradient(${color} 0 0)`;
        // A colour that appears as the entry (--rl-hb-t, 0 to 1) passes `from`.
        const late = (from, color = A) => `color-mix(in srgb,${color} calc(clamp(0,(${T} - ${from}) * 5,1) * 100%),transparent)`;
        // In a background or mask position a % is taken of (box - image), so
        // calc(50% + x) centres an image x from the middle whatever its size;
        // a % inside x loses the image's size again, so wide(b), the composer's
        // width (at most the box less 48 px) for an image b wide, adds it back.
        const Y = (y) => `calc(50% + ${y}px)`;
        const wide = (b) => `min(var(--rl-hb-card),100% + ${b} - 48px)`;
        const slice = ' preserveAspectRatio="xMinYMin slice"';
        const svg = (w, h, body, extra = "") => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="'SF Mono',Menlo,Consolas,monospace" font-size="9" letter-spacing="1.8"${extra}>${body}</svg>`)}")`;
        const text = (x, y, words, opacity = .42, anchor = "start") => `<text x="${x}" y="${y}" fill-opacity="${opacity}" text-anchor="${anchor}">${words}</text>`;
        // ::after of one style from [image, place, accent] layers. With the
        // wordmark (its text, see below), the mask also opens the band along
        // the bottom it occupies, at .32 (what its opacity used to be), and
        // the ink stops above that band so only the text shows there. All of
        // it fades in through --rl-hb-a, which the band and the ink scale.
        const fade = (color) => solid(`color-mix(in srgb,${color} calc(var(--rl-hb-a) * 100%),transparent)`);
        const art = (style, layers, mark) => on(style, "::after") + "{--rl-hb-art:"
          + [...layers.map(([image, place]) => `${image} ${place}`), ...(mark ? ["linear-gradient(rgba(0,0,0,calc(.32 * var(--rl-hb-a))) 0 0) 0 100%/100% var(--rl-hb-band) no-repeat"] : [])].join(",")
          + ";background:" + [...layers.filter((layer) => layer[2]).map(([, place]) => `${fade(A)} ${place}`),
            mark ? `${fade("var(--rl-hb-ink)")} 0 0/100% calc(100% - var(--rl-hb-band)) no-repeat` : fade("var(--rl-hb-ink)")].join(",") + "}";
        const caption = (words, w) => svg(w, 10, `<text x="${w}" y="8" text-anchor="end" font-weight="600" letter-spacing="2.5">${words}</text>`);

        // horizon: H px below the middle, just under the composer (Harness
        // centres it about 50 px below the middle, about 116 px tall). A sun
        // rises on it below the composer's left part, the vanishing point of a
        // ground plane drawn in perspective.
        const H = 168, ground = `calc(50% - ${H}px)`;
        const GL = "color-mix(in srgb,var(--rl-hb-ink) 9%,transparent)";
        const sunAt = (b, dx = "0px") => `calc(50% - ${wide(b)} / 2 + 132px + ${dx})`;
        const sunBox = `${sunAt("120px")} ${Y(H - 30)}/120px 60px no-repeat`;
        const rise = (r) => `50% calc(100% + ${r}px * (1 - ${T}))`;
        const ray = (dx) => `linear-gradient(to bottom ${dx > 0 ? "left" : "right"},transparent calc(50% - .8px),${GL} calc(50% - .2px) calc(50% + .2px),transparent calc(50% + .8px)) `
          + `${sunAt(`${Math.abs(dx)}vh`, `${dx / 2}vh`)} 100%/${Math.abs(dx)}vh ${ground} no-repeat`;
        const horizon = [
          `radial-gradient(circle 9px at ${rise(8)},${A} 7.5px,transparent 8px) ${sunBox}`,
          `radial-gradient(circle 26px at ${rise(24)},transparent 23.3px,${A} 23.8px 24.4px,transparent 24.9px) ${sunBox}`,
          `radial-gradient(circle 46px at ${rise(44)},transparent 43.4px,${S} 43.9px 44.4px,transparent 44.9px) ${sunBox}`,
          `${solid(A)} 24px ${Y(H)}/calc((100% - 48px) * ${T}) 1px no-repeat`,
          `${solid(A)} 22px ${Y(H)}/5px 5px no-repeat`,
          `${solid(late(.92))} right 24px top ${Y(H)}/1px 11px no-repeat`,
          `repeating-linear-gradient(to right,${late(.5, S)} 0 1px,transparent 1px 12px) 24px ${Y(H + 2.5)}/calc(100% - 48px) 3px no-repeat`,
          `repeating-linear-gradient(to right,${late(.5, S)} 0 1px,transparent 1px 120px) 24px ${Y(H + 4.5)}/calc(100% - 48px) 7px no-repeat`,
          // An altitude scale rising 300 px from the horizon's left end.
          `${solid(late(.4, S))} 44px ${Y(H - 150)}/1px 300px no-repeat`,
          `repeating-linear-gradient(to top,${late(.4, S)} 0 1px,transparent 1px 12px) 45px ${Y(H - 150)}/4px 300px no-repeat`,
          `repeating-linear-gradient(to top,${late(.4, S)} 0 1px,transparent 1px 60px) 45px ${Y(H - 150)}/8px 300px no-repeat`,
          `linear-gradient(${BG},transparent) 0 ${Y(H + 70)}/100% 140px no-repeat`,
          ...[-150, -70, -34, -14, 14, 34, 70, 150, 300].map(ray),
          ...[.05, .16, .33, .56, .84].map((f) => `${solid(GL)} 0 calc(50% + ${H}px + (50% - ${H}px) * ${f})/100% 1px no-repeat`),
          `linear-gradient(transparent,var(--rl-hb-vig)) 0 100%/100% ${ground} no-repeat`,
          `${solid(BG)} 0 100%/100% ${ground} no-repeat`,
          `radial-gradient(ellipse 560px 200px at calc(50% - min(var(--rl-hb-card),100% - 48px) / 2 + 132px) 100%,color-mix(in srgb,${A} calc(9% * ${T}),transparent),transparent) 0 ${Y(H - 110)}/100% 220px no-repeat`
        ];

        // grid: an archive sheet. Column letters and row numbers name the
        // cells of the major grid (110 px from 11 px), one of them hatched.
        const cell = (x, y) => [
          `repeating-linear-gradient(-45deg,color-mix(in srgb,${A} 22%,transparent) 0 1px,transparent 1px 6px) ${x}px ${y}px/110px 110px no-repeat`,
          `${solid(`color-mix(in srgb,${A} 45%,transparent)`)} ${x}px ${y}px/110px 1px no-repeat`, `${solid(`color-mix(in srgb,${A} 45%,transparent)`)} ${x}px ${y + 109}px/110px 1px no-repeat`,
          `${solid(`color-mix(in srgb,${A} 45%,transparent)`)} ${x}px ${y}px/1px 110px no-repeat`, `${solid(`color-mix(in srgb,${A} 45%,transparent)`)} ${x + 109}px ${y}px/1px 110px no-repeat`,
          `${solid(A)} ${x - 2}px ${y - 2}px/5px 5px no-repeat`
        ];
        const bars = (() => {
          let x = 0, out = "";
          [2, 1, 1, 2, 3, 1, 1, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 1, 2, 2, 1, 1, 3, 2, 1, 1, 2, 1, 1, 3, 1, 2].forEach((w, i) => {
            if (i % 2 === 0) out += `<rect x="${x}" width="${w * 1.5}" height="14"/>`;
            x += w * 1.5;
          });
          return out;
        })();
        const seal = svg(96, 96, '<g transform="rotate(-14 48 48)" fill="none" stroke="#000"><circle cx="48" cy="48" r="46.5" stroke-opacity=".55"/><circle cx="48" cy="48" r="32.5" stroke-opacity=".4"/>'
          + '<path d="M48 36.5L57.96 42.25V53.75L48 59.5L38.04 53.75V42.25Z" stroke-opacity=".6"/></g>'
          + '<path id="r" d="M48 48m-39 0a39 39 0 1 1 78 0a39 39 0 1 1-78 0" fill="none" transform="rotate(-104 48 48)"/>'
          + '<text font-size="7" letter-spacing="1.6" fill-opacity=".62"><textPath href="#r" textLength="238">RHINE LAB &#183; ARCHIVE DIVISION &#183; 1097 &#183;</textPath></text>'
          + '<rect x="45.5" y="45.5" width="5" height="5" fill-opacity=".8"/>');

        return [
          "html[data-rl-hero] [data-phase=hero]{isolation:isolate;--rl-hb-ink:var(--dsw-alias-label-primary,#141414);--rl-hb-bg:var(--dsw-alias-bg-base,#f4f3ef);--rl-hb-accent:var(--dsw-static-deepseek-500,#e46f24);--rl-hb-line:color-mix(in srgb,var(--rl-hb-ink) 4.5%,transparent);--rl-hb-strong:color-mix(in srgb,var(--rl-hb-ink) 26%,transparent);--rl-hb-dot:color-mix(in srgb,var(--rl-hb-ink) 12%,transparent);--rl-hb-vig:color-mix(in srgb,var(--rl-hb-ink) 4%,transparent);--rl-hb-bars:var(--rl-img-bars-light,none);--rl-hb-mono:'SF Mono','JetBrains Mono','Cascadia Mono',Menlo,Consolas,monospace;--rl-hb-sans:'Montserrat','Helvetica Neue','PingFang SC','Segoe UI',Arial,sans-serif;--rl-hb-band:calc(clamp(64px,min(12vw,24vh),232px) * .8 + 3vh);--rl-hb-card:calc(var(--dsh-chat-user-width,clamp(680px,var(--dsh-conversation-column-width,1160px) * .64,920px)) + 32px);",
          "--rl-hb-frame:linear-gradient(var(--rl-hb-accent) 0 0) left 22px top 50px/5px 5px no-repeat,",
          "linear-gradient(var(--rl-hb-strong) 0 0) left 24px top 52px/18px 1px no-repeat,linear-gradient(var(--rl-hb-strong) 0 0) left 24px top 52px/1px 18px no-repeat,linear-gradient(var(--rl-hb-strong) 0 0) right 24px top 52px/18px 1px no-repeat,linear-gradient(var(--rl-hb-strong) 0 0) right 24px top 52px/1px 18px no-repeat,",
          "linear-gradient(var(--rl-hb-strong) 0 0) left 24px bottom 24px/18px 1px no-repeat,linear-gradient(var(--rl-hb-strong) 0 0) left 24px bottom 24px/1px 18px no-repeat,linear-gradient(var(--rl-hb-strong) 0 0) right 24px bottom 24px/18px 1px no-repeat,linear-gradient(var(--rl-hb-strong) 0 0) right 24px bottom 24px/1px 18px no-repeat,",
          "linear-gradient(var(--rl-hb-accent) 0 0) right 24px center/15px 1px no-repeat,repeating-linear-gradient(to bottom,var(--rl-hb-strong) 0 1px,transparent 1px 40px) right 24px center/10px 30% no-repeat,repeating-linear-gradient(to bottom,var(--rl-hb-strong) 0 1px,transparent 1px 8px) right 24px center/5px 30% no-repeat,",
          "linear-gradient(var(--rl-hb-accent) 0 0) left 46px bottom 46px/6px 6px no-repeat;",
          "--rl-hb-dots:radial-gradient(var(--rl-hb-dot) 1px,transparent 1.3px) 11px 11px/22px 22px;",
          "--rl-hb-major:linear-gradient(to right,var(--rl-hb-line) 1px,transparent 1px) 11px 11px/110px 110px,linear-gradient(to bottom,var(--rl-hb-line) 1px,transparent 1px) 11px 11px/110px 110px;",
          // Geometry that meets the content is anchored to it, not to the window:
          // Harness centres the title and composer (about 216 px tall, the
          // composer's centre about 50 px below the middle), so these stay put
          // relative to them at any window size or zoom. --rl-hb-card is the
          // composer's width by Harness's own rule: 64% of the column width it
          // sets on this root, clamped to 680-920 px, plus 32 px (or the width the
          // user dragged it to), so 952 px at most.
          // A calm zone behind the content: the grid thins out a little there.
          "--rl-hb-calm:radial-gradient(closest-side,color-mix(in srgb,var(--rl-hb-bg) 72%,transparent) 0,color-mix(in srgb,var(--rl-hb-bg) 40%,transparent) 55%,transparent) 50% 50%/calc(min(var(--rl-hb-card),100% - 48px) + 160px) 380px no-repeat;",
          "--rl-hb-guides:linear-gradient(var(--rl-hb-accent) 0 0) calc(10% - 2px) max(calc(72% - 2px),calc(50% + 168px))/5px 5px no-repeat,linear-gradient(color-mix(in srgb,var(--rl-hb-ink) 11%,transparent) 0 0) 0 max(72%,calc(50% + 170px))/100% 1px no-repeat,linear-gradient(color-mix(in srgb,var(--rl-hb-ink) 11%,transparent) 0 0) 10% 0/1px 100% no-repeat;",
          // Darker edges, the static half of the visual guidance (the halo that
          // hugs the composer is declared on ::before so it can bloom in).
          "--rl-hb-edges:radial-gradient(ellipse at 50% 52%,transparent 55%,var(--rl-hb-vig) 100%);",
          // The splash slats fill the right half behind one diagonal through the
          // centre at a fixed slope (0.3: 15vh across per 50vh down), so it keeps
          // its angle at any window shape. Each slanted piece is the diagonal of a
          // box drawn with a corner-to-corner gradient, positioned from the centre.
          // The accent line is drawn per pseudo-element (--rl-hb-draw) so it can animate.
          "--rl-hb-split:linear-gradient(to bottom,var(--rl-hb-bg),transparent 9%,transparent 91%,var(--rl-hb-bg)),radial-gradient(closest-side,color-mix(in srgb,var(--rl-hb-bg) 86%,transparent),transparent) 50% 50%/calc(min(var(--rl-hb-card),100% - 48px) + 120px) 360px no-repeat,",
          "linear-gradient(to bottom right,var(--rl-hb-bg) calc(50% - .5px),transparent calc(50% + .5px)) 50% 50%/30vh 100vh no-repeat,linear-gradient(var(--rl-hb-bg) 0 0) 0 0/max(0px,calc(50% - 15vh)) 100% no-repeat,",
          "linear-gradient(color-mix(in srgb,var(--rl-hb-bg) 42%,transparent) 0 0),linear-gradient(color-mix(in srgb,var(--rl-hb-accent) 7%,transparent) 0 0),var(--rl-hb-bars) right center/auto 100% no-repeat;--rl-hb-glow:9%}",
          "html[data-rl-hero] body[data-ds-dark-theme] [data-phase=hero]{--rl-hb-strong:color-mix(in srgb,var(--rl-hb-ink) 22%,transparent);--rl-hb-line:color-mix(in srgb,var(--rl-hb-ink) 5%,transparent);--rl-hb-dot:color-mix(in srgb,var(--rl-hb-ink) 9%,transparent);--rl-hb-vig:rgba(0,0,0,.28);--rl-hb-bars:var(--rl-img-bars-dark,none);--rl-hb-glow:12%}",
          "html[data-rl-hero] [data-phase=hero]::before,html[data-rl-hero] [data-phase=hero]::after{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;box-sizing:border-box}",
          "html[data-rl-hero] [data-phase=hero]::before{content:var(--rl-hb-label,'RL-DSH/0.2 \\00B7  TERMINAL READY');display:flex;align-items:flex-end;padding:0 0 45px 60px;font:500 10px/8px var(--rl-hb-mono);letter-spacing:.2em;color:color-mix(in srgb,var(--rl-hb-ink) 42%,transparent);white-space:nowrap;animation:rl-hb-in .7s cubic-bezier(.16,1,.3,1) both,rl-hb-glow 1s cubic-bezier(.16,1,.3,1) .15s both}",
          // Halo: a glow fitted to the composer (Harness centres it, --rl-hb-card
          // wide, about 50 px below the middle of the page), full strength under
          // and just around it, fading out over about 90 px. It blooms in once
          // (--rl-hb-g: fades up while growing from 82% to full size), then stays.
          // Sized by its box (closest-side): Chrome rejects % + px calc in a
          // radial-gradient's own size, and that would void the whole background.
          // heroMark sets the wordmark's stroke: the original hairline (thin, the
          // default) or the same outline thickened (bold).
          "html[data-rl-hero][data-rl-mark=bold] [data-phase=hero]{--rl-hb-mark-w:2.5px}",
          "@property --rl-hb-g{syntax:'<number>';inherits:false;initial-value:1}",
          "html[data-rl-hero] [data-phase=hero]::before{--rl-hb-halo:radial-gradient(closest-side,color-mix(in srgb,var(--rl-hb-accent) calc(var(--rl-hb-glow) * var(--rl-hb-g)),transparent) 62%,transparent) 50% calc(50% + 50px)/calc((min(var(--rl-hb-card),100% - 48px) + 192px) * (.82 + .18 * var(--rl-hb-g))) calc(300px * (.82 + .18 * var(--rl-hb-g))) no-repeat}",
          "@keyframes rl-hb-glow{from{--rl-hb-g:0}}",
          // Entry: --rl-hb-t runs from 0 to 1 once and every piece that draws
          // itself reads it; without the animation it stays 1, the finished picture.
          "@property --rl-hb-t{syntax:'<number>';inherits:false;initial-value:1}",
          "@keyframes rl-hb-draw{from{--rl-hb-t:0}}",
          "@keyframes rl-hb-in{from{opacity:0}}",
          // ::after is the original wordmark: the outlined DEEPSEEK text along the
          // bottom right, set by the page in the Montserrat / Helvetica Neue /
          // PingFang SC / Segoe UI stack, right-aligned and cut off on the right
          // when it is wider than the page. It now spans the root so its mask can
          // also carry the detail art; its box was the band, so the text sits at
          // the bottom of a column flex box and rises into place by its padding.
          // Both entries fill backwards only, so nothing holds the text once
          // they end.
          "html[data-rl-hero] [data-phase=hero]::after{content:'DEEPSEEK';display:flex;flex-direction:column;justify-content:flex-end;padding:0 60px 3vh 0;overflow:hidden;text-align:right;white-space:nowrap;font:800 clamp(64px,min(12vw,24vh),232px)/.8 var(--rl-hb-sans);letter-spacing:-.02em;color:transparent;-webkit-text-stroke:var(--rl-hb-mark-w,1px) var(--rl-hb-strong);"
            + "-webkit-mask:var(--rl-hb-art,linear-gradient(transparent 0 0));mask:var(--rl-hb-art,linear-gradient(transparent 0 0));animation:rl-hb-fade 1.1s cubic-bezier(.16,1,.3,1) .1s backwards,rl-hb-mark 1.1s cubic-bezier(.16,1,.3,1) .1s backwards}",
          "@property --rl-hb-a{syntax:'<number>';inherits:false;initial-value:1}",
          "@keyframes rl-hb-fade{from{--rl-hb-a:0}}",
          "@keyframes rl-hb-mark{from{padding-bottom:calc(3vh - 14px)}}",
          on("horizon", "::after") + "{content:''}",

          // diagonal (对角线): the splash slats behind the diagonal, on the archive
          // grid, with two guides crossing at an accent square. The line breaks
          // 136 px above and below the content's centre (x = 0.3 * 136 = 40.8 px
          // off-centre), just outside the title and composer, with square caps
          // pointing at them, and draws itself from both ends towards the content:
          // each piece's box grows from its outer corner (slope unchanged) and the
          // caps appear as it lands.
          on("diagonal", "::before") + "{background:var(--rl-hb-frame),var(--rl-hb-guides),var(--rl-hb-draw),var(--rl-hb-dots),var(--rl-hb-major),var(--rl-hb-halo),var(--rl-hb-edges),var(--rl-hb-split);--rl-hb-cap:color-mix(in srgb,var(--rl-hb-accent) calc(clamp(0,(var(--rl-hb-t) - .9) * 20,1) * 100%),transparent);"
            + "--rl-hb-draw:linear-gradient(var(--rl-hb-cap) 0 0) calc(50% + 40.8px) calc(50% - 136px)/5px 5px no-repeat,linear-gradient(var(--rl-hb-cap) 0 0) calc(50% - 40.8px) calc(50% + 136px)/5px 5px no-repeat,"
            + "linear-gradient(to bottom right,transparent calc(50% - 1px),var(--rl-hb-accent) calc(50% - .3px) calc(50% + .3px),transparent calc(50% + 1px)) calc(50% + 40.8px + 15vh - 7.5vh * var(--rl-hb-t)) calc(50% - 136px - 50vh + 25vh * var(--rl-hb-t))/calc(15vh * var(--rl-hb-t)) calc(50vh * var(--rl-hb-t)) no-repeat,"
            + "linear-gradient(to bottom right,transparent calc(50% - 1px),var(--rl-hb-accent) calc(50% - .3px) calc(50% + .3px),transparent calc(50% + 1px)) calc(50% - 40.8px - 15vh + 7.5vh * var(--rl-hb-t)) calc(50% + 136px + 50vh - 25vh * var(--rl-hb-t))/calc(15vh * var(--rl-hb-t)) calc(50vh * var(--rl-hb-t)) no-repeat;"
            + "animation:rl-hb-in .7s cubic-bezier(.16,1,.3,1) both,rl-hb-draw .7s cubic-bezier(.22,1,.36,1) .25s both,rl-hb-glow 1s cubic-bezier(.16,1,.3,1) .55s both}",
          // horizon (地平线): the line draws itself from the left while the sun
          // rises; the rulers and the far end appear as it lands.
          on("horizon", "::before") + `{background:var(--rl-hb-frame),${horizon.join(",")},var(--rl-hb-dots),var(--rl-hb-halo),var(--rl-hb-edges);`
            + "animation:rl-hb-in .7s cubic-bezier(.16,1,.3,1) both,rl-hb-draw 1.2s cubic-bezier(.22,1,.36,1) .2s both,rl-hb-glow 1s cubic-bezier(.16,1,.3,1) .6s both}",
          // plain (素净): dots on a faint 5-dot major grid, calm in
          // the middle, the wordmark along the bottom and nothing else.
          on("plain", "::before") + "{background:var(--rl-hb-frame),var(--rl-hb-calm),var(--rl-hb-dots),var(--rl-hb-major),var(--rl-hb-halo),var(--rl-hb-edges)}",
          // grid (档案网格): the plain sheet with its cells named and one marked.
          on("grid", "::before") + `{background:var(--rl-hb-frame),${cell(121, 121).join(",")},var(--rl-hb-calm),var(--rl-hb-dots),var(--rl-hb-major),var(--rl-hb-halo),var(--rl-hb-edges)}`,
          "@supports (mask-image:none) or (-webkit-mask-image:none){"
            + art("diagonal", [
              [caption("PANEL 07 &#183; STRUCTURE", 200), "calc(50% + 15vh + 87px) 64px/200px 10px no-repeat", true],
              [svg(130, 10, text(0, 8, "&#916; 0.30 &#183; 73.3&#176;", .45)), "calc(50% + 121.8px) calc(50% - 136px)/130px 10px no-repeat"]
            ], true)
            + art("horizon", [
              [caption("PANEL 07 &#183; HORIZON", 180), `right 64px top ${Y(H - 16)}/180px 10px no-repeat`, true],
              [svg(3600, 10, Array.from({ length: 30 }, (_, k) => text(60 + 120 * k, 8, String(k * 15).padStart(3, "0"), .32, "middle")).join("")), `-36px ${Y(H + 15)}/3600px 10px no-repeat`],
              [svg(150, 10, text(0, 8, "AZ 072&#176; &#183; EL +00.4&#176;", .45)), `${sunAt("150px", "123px")} ${Y(H - 14)}/150px 10px no-repeat`],
              [svg(20, 300, [1, 2, 3, 4].map((k) => text(0, 303.5 - 60 * k, String(k * 10), .34)).join("")), `58px ${Y(H - 150)}/20px 300px no-repeat`],
              [svg(240, 40, '<path d="M0 .5H240" stroke="#000" stroke-opacity=".26"/>' + text(240, 15, "RL-SURVEY &#183; FIELD 07", .55, "end")
                + text(240, 27, "VISIBILITY 12.0 KM", .36, "end") + text(240, 39, "WIND NE 3.2 M/S", .36, "end")), "right 60px top 84px/240px 40px no-repeat"]
            ])
            + art("plain", [], true)
            + art("grid", [
              // Clipped short of the corners (the images keep their size and
              // are cut off by their boxes), so a letter or number never meets
              // the frame or the status line.
              [svg(2860, 10, [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((c, k) => text(55 + 110 * k, 8, c, .3, "middle")).join(""), slice), "11px 60px/calc(100% - 80px) 10px no-repeat"],
              [svg(24, 2200, Array.from({ length: 19 }, (_, k) => text(12, 58.5 + 110 * (k + 1), String(k + 2).padStart(2, "0"), .3, "middle")).join(""), slice), "30px 11px/24px calc(100% - 100px) no-repeat"],
              [svg(36, 10, text(0, 8, "B-02", .9)), "127px 127px/36px 10px no-repeat", true],
              [svg(240, 40, '<path d="M0 .5H240" stroke="#000" stroke-opacity=".26"/>' + text(240, 15, "RHINE LAB &#183; ARCHIVE GRID", .55, "end")
                + text(240, 27, "FILE RL-07 &#183; SHEET 01/01", .36, "end") + text(240, 39, "CLASS OPEN &#183; REV A", .36, "end")), "right 60px top 84px/240px 40px no-repeat"],
              [svg(110, 24, `<g fill-opacity=".4">${bars}</g>` + text(0, 23, "RL0716-DSH", .36)), "right 60px top 136px/110px 24px no-repeat"],
              [seal, "right 316px top 80px/96px 96px no-repeat", true]
            ], true)
            + "}",
          "@media (prefers-reduced-motion:reduce){html[data-rl-hero] [data-phase=hero]::before,html[data-rl-hero] [data-phase=hero]::after{animation:none}}"
        ];
      })(),
      // Resume effects: a fixed layer over the whole window that never takes
      // pointer events and is removed once its animation ends (RESUME_MS).
      // They share one HUD language: 1 px accent hairlines, the Rhine square
      // and small monospace labels, over the app rather than hiding it.
      ".rl-resume{position:fixed;inset:0;z-index:2147483600;pointer-events:none;overflow:hidden;contain:strict;--rl-rs-accent:var(--dsw-static-deepseek-500,#e46f24);--rl-rs-ink:var(--dsw-alias-label-primary,#141414);--rl-rs-bg:var(--dsw-alias-bg-base,#f4f3ef);--rl-rs-cyan:#3fbfd0;--rl-rs-mono:'SF Mono','JetBrains Mono',Menlo,'Cascadia Mono',Consolas,monospace;--rl-rs-io:cubic-bezier(.65,0,.35,1);--rl-rs-out:cubic-bezier(.16,1,.3,1)}",
      ".rl-resume i,.rl-resume b{position:absolute;display:block}",
      ".rl-resume .rl-rs-label{position:absolute;display:flex;align-items:center;gap:9px;font:600 10px/1 var(--rl-rs-mono);letter-spacing:.26em;color:color-mix(in srgb,var(--rl-rs-ink) 74%,transparent);white-space:nowrap}",
      ".rl-resume .rl-rs-label>b{position:static;width:6px;height:6px;flex:none;background:var(--rl-rs-accent)}",
      ".rl-resume .rl-rs-rule{left:15px;right:0;bottom:-8px;height:1px;background:linear-gradient(90deg,var(--rl-rs-accent),transparent);transform-origin:left;animation:rl-rs-rule .56s var(--rl-rs-out) .16s both}",
      "@keyframes rl-rs-rule{from{transform:scaleX(0)}}",
      // scan: a hairline sweeps down with a live SYNC readout; a dot grid and
      // a faint accent wash show only in its wake, corner brackets lock on,
      // and a LINK RESTORED label settles at the bottom right.
      "@property --rl-rs-n{syntax:'<integer>';inherits:true;initial-value:0}",
      ".rl-rs-grid{inset:0;background:radial-gradient(circle,color-mix(in srgb,var(--rl-rs-accent) 70%,transparent) 1px,transparent 1.5px) 0 0/18px 18px,color-mix(in srgb,var(--rl-rs-accent) 6%,transparent);",
      "-webkit-mask:linear-gradient(to bottom,transparent 34%,#000 49.6%,transparent 50%) 0 100%/100% 200% no-repeat;mask:linear-gradient(to bottom,transparent 34%,#000 49.6%,transparent 50%) 0 100%/100% 200% no-repeat;animation:rl-rs-reveal .76s var(--rl-rs-io) both}",
      ".rl-rs-line{left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,transparent,var(--rl-rs-accent) 8%,var(--rl-rs-accent) 92%,transparent);box-shadow:0 0 12px 1px color-mix(in srgb,var(--rl-rs-accent) 50%,transparent);animation:rl-rs-sweep .76s var(--rl-rs-io) both,rl-rs-count .76s var(--rl-rs-io) both}",
      ".rl-rs-line::after{content:'SYNC ' counter(rl-rs-n,decimal-leading-zero) '%';counter-reset:rl-rs-n var(--rl-rs-n);position:absolute;right:28px;bottom:7px;font:600 9px/1 var(--rl-rs-mono);letter-spacing:.28em;color:var(--rl-rs-accent)}",
      ".rl-rs-c{width:22px;height:22px;border:0 solid var(--rl-rs-accent);animation:rl-rs-corner .9s var(--rl-rs-out) both}",
      ".rl-rs-c::after{content:'';position:absolute;width:4px;height:4px;background:var(--rl-rs-accent)}",
      ".rl-rs-c--tl{top:16px;left:16px;border-top-width:1px;border-left-width:1px;--dx:-14px;--dy:-14px}",
      ".rl-rs-c--tr{top:16px;right:16px;border-top-width:1px;border-right-width:1px;--dx:14px;--dy:-14px}",
      ".rl-rs-c--bl{bottom:16px;left:16px;border-bottom-width:1px;border-left-width:1px;--dx:-14px;--dy:14px}",
      ".rl-rs-c--br{bottom:16px;right:16px;border-bottom-width:1px;border-right-width:1px;--dx:14px;--dy:14px}",
      ".rl-rs-c--tl::after,.rl-rs-c--tr::after{top:-2.5px}.rl-rs-c--bl::after,.rl-rs-c--br::after{bottom:-2.5px}",
      ".rl-rs-c--tl::after,.rl-rs-c--bl::after{left:-2.5px}.rl-rs-c--tr::after,.rl-rs-c--br::after{right:-2.5px}",
      ".rl-resume .rl-rs-tag{right:46px;bottom:26px;animation:rl-rs-tag .9s var(--rl-rs-out) .06s both}",
      ".rl-resume .rl-rs-tag>b{animation:rl-rs-blink .18s steps(1,end) .22s 3 both}",
      "@keyframes rl-rs-reveal{0%{-webkit-mask-position:0 100%;mask-position:0 100%}80%{opacity:1}100%{-webkit-mask-position:0 0;mask-position:0 0;opacity:0}}",
      "@keyframes rl-rs-sweep{0%{transform:translateY(0);opacity:0}6%,88%{opacity:1}100%{transform:translateY(100vh);opacity:0}}",
      "@keyframes rl-rs-count{to{--rl-rs-n:100}}",
      "@keyframes rl-rs-corner{0%{opacity:0;transform:translate(var(--dx),var(--dy))}28%,74%{opacity:1;transform:none}100%{opacity:0;transform:none}}",
      "@keyframes rl-rs-tag{0%{opacity:0;transform:translateX(12px)}22%,76%{opacity:1;transform:none}100%{opacity:0;transform:none}}",
      "@keyframes rl-rs-blink{50%{opacity:0}}",
      // iris: a frosted, dotted veil (the app stays faintly visible), the
      // open-cell emblem seals itself in accent inside a turning tick ring,
      // then a hexagonal aperture with a double hairline opens out of it.
      "@property --rl-ri-s{syntax:'<number>';inherits:true;initial-value:0}",
      ".rl-ri-veil{inset:0;background:radial-gradient(color-mix(in srgb,var(--rl-rs-ink) 10%,transparent) 1px,transparent 1.3px) 11px 11px/22px 22px,color-mix(in srgb,var(--rl-rs-bg) 80%,transparent);-webkit-backdrop-filter:blur(16px) saturate(.7);backdrop-filter:blur(16px) saturate(.7);",
      "clip-path:polygon(evenodd,0 0,100% 0,100% 100%,0 100%,0 0,50% calc(50% - var(--rl-ri-s)*100px),calc(50% + var(--rl-ri-s)*86.6px) calc(50% - var(--rl-ri-s)*50px),calc(50% + var(--rl-ri-s)*86.6px) calc(50% + var(--rl-ri-s)*50px),50% calc(50% + var(--rl-ri-s)*100px),calc(50% - var(--rl-ri-s)*86.6px) calc(50% + var(--rl-ri-s)*50px),calc(50% - var(--rl-ri-s)*86.6px) calc(50% - var(--rl-ri-s)*50px),50% calc(50% - var(--rl-ri-s)*100px),0 0);",
      "animation:rl-ri-veil .18s ease-out both,rl-ri-open .68s var(--rl-rs-io) .5s both}",
      ".rl-ri-emblem{position:absolute;left:50%;top:50%;width:150px;height:150px;margin:-75px 0 0 -75px;overflow:visible;fill:none;animation:rl-ri-pop .5s cubic-bezier(.34,1.56,.64,1) .04s both}",
      ".rl-ri-emblem .rl-ri-ticks{stroke:var(--rl-rs-accent);stroke-width:5;stroke-dasharray:1.2 9.69;opacity:.6;transform-origin:110px 110px;animation:rl-ri-spin .9s var(--rl-rs-out) both}",
      ".rl-ri-emblem .rl-ri-disc{stroke:var(--rl-rs-ink);stroke-width:1.2;stroke-dasharray:1;animation:rl-ri-draw .36s var(--rl-rs-out) .06s both}",
      ".rl-ri-emblem .rl-ri-hex,.rl-ri-emblem .rl-ri-seal{stroke:var(--rl-rs-ink);stroke-width:6;stroke-linejoin:miter;stroke-dasharray:1}",
      ".rl-ri-emblem .rl-ri-hex{animation:rl-ri-charge .12s linear .34s both}",
      ".rl-ri-emblem .rl-ri-seal{stroke:var(--rl-rs-accent);animation:rl-ri-draw .16s var(--rl-rs-io) .3s both}",
      ".rl-ri-emblem rect{fill:var(--rl-rs-accent)}",
      ".rl-resume .rl-ri-cap{left:50%;top:calc(50% + 106px);transform:translateX(-50%);animation:rl-ri-cap .5s var(--rl-rs-out) .14s both}",
      ".rl-ri-ring{position:absolute;left:50%;top:50%;width:calc(var(--rl-ri-s)*200px);height:calc(var(--rl-ri-s)*200px);overflow:visible;fill:none;stroke:var(--rl-rs-accent);stroke-width:1.5;filter:drop-shadow(0 0 4px color-mix(in srgb,var(--rl-rs-accent) 45%,transparent));transform:translate(-50%,-50%);animation:rl-ri-open .68s var(--rl-rs-io) .5s both,rl-ri-fade .24s ease-in .96s both}",
      ".rl-ri-ring polygon{vector-effect:non-scaling-stroke}",
      ".rl-ri-ring .rl-ri-inner{stroke-width:1;opacity:.35}",
      "@keyframes rl-ri-veil{from{opacity:0}}",
      "@keyframes rl-ri-open{0%{--rl-ri-s:0}1%{--rl-ri-s:.33}100%{--rl-ri-s:var(--rl-ri-max,20)}}",
      "@keyframes rl-ri-pop{from{opacity:0;transform:scale(.82)}}",
      "@keyframes rl-ri-spin{from{opacity:0;transform:rotate(-48deg)}}",
      "@keyframes rl-ri-cap{from{opacity:0;letter-spacing:.6em}}",
      "@keyframes rl-ri-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}",
      "@keyframes rl-ri-charge{to{stroke:var(--rl-rs-accent);filter:drop-shadow(0 0 3px var(--rl-rs-accent))}}",
      "@keyframes rl-ri-fade{to{opacity:0}}",
      // glitch: a scanline flicker, a few bands that re-filter what is behind
      // them and slip sideways, colour-split hairlines and a SIGNAL RESYNC
      // label; no inverted or solid blocks, so it reads as style, not a fault.
      ".rl-rg-lines{inset:0;background:repeating-linear-gradient(to bottom,color-mix(in srgb,var(--rl-rs-ink) 6%,transparent) 0 1px,transparent 1px 3px);animation:rl-rg-flick .42s steps(1,end) both}",
      ".rl-rg-s{left:var(--x,0);width:var(--w,100%);top:var(--y);height:var(--h);animation:rl-rg-jit .42s steps(1,end) var(--d,0s) both}",
      ".rl-rg-s--hi{-webkit-backdrop-filter:brightness(1.1) contrast(1.25) saturate(1.5);backdrop-filter:brightness(1.1) contrast(1.25) saturate(1.5);background:color-mix(in srgb,var(--rl-rs-accent) 7%,transparent);box-shadow:inset 0 1px color-mix(in srgb,var(--rl-rs-accent) 50%,transparent)}",
      ".rl-rg-s--dim{-webkit-backdrop-filter:blur(3px) saturate(.3);backdrop-filter:blur(3px) saturate(.3);background:color-mix(in srgb,var(--rl-rs-bg) 30%,transparent)}",
      ".rl-rg-s--tint{background:color-mix(in srgb,var(--rl-rs-accent) 20%,transparent)}",
      ".rl-rg-l{left:var(--x,0);width:var(--w,100%);top:var(--y);height:1px;background:var(--rl-rs-accent);box-shadow:0 2px 0 color-mix(in srgb,var(--rl-rs-cyan) 70%,transparent),0 0 6px color-mix(in srgb,var(--rl-rs-accent) 60%,transparent);animation:rl-rg-jit .42s steps(1,end) var(--d,0s) both}",
      ".rl-resume .rl-rg-tag{right:46px;bottom:26px;animation:rl-rg-tag .56s steps(1,end) both}",
      "@keyframes rl-rg-flick{0%{opacity:1}12%{opacity:.3}24%{opacity:1}40%{opacity:.5}55%,100%{opacity:0}}",
      "@keyframes rl-rg-jit{0%{opacity:1;transform:translateX(var(--a))}30%{transform:translateX(var(--b))}60%{opacity:1;transform:translateX(var(--c))}78%,100%{opacity:0;transform:none}}",
      "@keyframes rl-rg-tag{0%{opacity:1}10%{opacity:0}18%{opacity:1}30%{opacity:.4}38%,82%{opacity:1}100%{opacity:0}}",
      "@media (prefers-reduced-motion:reduce){.rl-resume{display:none}}",
      // Rhine notices: frosted cards stacked at the top right, tinted by
      // --rl-ntf-c (lime for a finished run, accent while the agent waits).
      // Ripples: two rings sweep out of the edge bar on arrival, the status
      // pip sends square pings (twice when done, on and on while waiting),
      // and a press leaves a round ripple where it landed. The bottom line is
      // the card's remaining life and pauses on hover.
      "@property --rl-ntf-r{syntax:'<length>';inherits:false;initial-value:0px}",
      ".rl-ntf-host{position:fixed;top:52px;right:16px;z-index:1300;display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:none}",
      ".rl-ntf{--rl-ntf-c:#a5c22a;position:relative;isolation:isolate;box-sizing:border-box;width:300px;padding:9px 30px 11px 15px;border:.5px solid color-mix(in srgb,var(--dsw-alias-label-primary) 12%,transparent);border-radius:var(--dsw-radius-md);background:color-mix(in srgb,var(--dsw-alias-bg-base) 54%,transparent);-webkit-backdrop-filter:blur(14px) saturate(1.5);backdrop-filter:blur(14px) saturate(1.5);box-shadow:0 12px 32px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,255,.4);overflow:hidden;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);cursor:pointer;pointer-events:auto;transition:border-color .2s;animation:rl-ntf-in .46s cubic-bezier(.16,1,.3,1) both}",
      "body[data-ds-dark-theme] .rl-ntf{background:color-mix(in srgb,var(--dsw-alias-bg-base) 46%,transparent);box-shadow:0 14px 36px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.07)}",
      ".rl-ntf[data-kind=pending]{--rl-ntf-c:var(--dsw-static-deepseek-500)}",
      ".rl-ntf::before{content:'';position:absolute;left:0;top:9px;bottom:11px;width:2px;background:var(--rl-ntf-c);box-shadow:0 0 8px var(--rl-ntf-c)}",
      ".rl-ntf::after{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(circle at 0 50%,transparent calc(var(--rl-ntf-r) - 28px),color-mix(in srgb,var(--rl-ntf-c) 16%,transparent) calc(var(--rl-ntf-r) - 1.5px),color-mix(in srgb,var(--rl-ntf-c) 60%,transparent) var(--rl-ntf-r),transparent calc(var(--rl-ntf-r) + 1.5px)),radial-gradient(circle at 0 50%,transparent calc(var(--rl-ntf-r) - 100px),color-mix(in srgb,var(--rl-ntf-c) 9%,transparent) calc(var(--rl-ntf-r) - 73px),color-mix(in srgb,var(--rl-ntf-c) 34%,transparent) calc(var(--rl-ntf-r) - 72px),transparent calc(var(--rl-ntf-r) - 70.5px));animation:rl-ntf-wave 1.3s cubic-bezier(.22,.7,.3,1) .06s both}",
      ".rl-ntf:hover,.rl-ntf:focus-visible{border-color:color-mix(in srgb,var(--rl-ntf-c) 45%,transparent);outline:none}",
      ".rl-ntf-head{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;column-gap:6px;margin-bottom:3px;font:600 9px/14px ui-monospace,'SF Mono',Menlo,'Cascadia Mono',Consolas,monospace;letter-spacing:.16em;color:var(--dsw-alias-label-tertiary);white-space:nowrap}",
      ".rl-ntf-tag{min-width:0;overflow:hidden}",
      ".rl-ntf-time{font-weight:500;letter-spacing:.06em}",
      ".rl-ntf-dot{position:relative;width:5px;height:5px;background:var(--rl-ntf-c)}",
      ".rl-ntf-dot::before,.rl-ntf-dot::after{content:'';position:absolute;inset:0;border:1px solid var(--rl-ntf-c);opacity:0;animation:rl-ntf-ping 1.5s cubic-bezier(.2,.6,.35,1) .3s 2 both}",
      ".rl-ntf-dot::after{animation-delay:.75s}",
      ".rl-ntf[data-kind=pending] .rl-ntf-dot::before,.rl-ntf[data-kind=pending] .rl-ntf-dot::after{animation-iteration-count:infinite}",
      ".rl-ntf-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:19px;font-weight:500;color:var(--dsw-alias-label-primary)}",
      ".rl-ntf-status{display:flex;align-items:baseline;gap:6px;min-width:0;white-space:nowrap}",
      ".rl-ntf-status>b{font-weight:500;color:var(--dsw-alias-label-secondary)}",
      ".rl-ntf[data-kind=pending] .rl-ntf-status>b{color:var(--dsw-static-deepseek-500)}",
      ".rl-ntf-status>span{overflow:hidden;text-overflow:ellipsis;color:var(--dsw-alias-label-tertiary)}",
      ".rl-ntf-close{position:absolute;top:6px;right:6px;width:20px;height:20px;padding:0;border:0;border-radius:var(--dsw-radius-xs);background:transparent;font:15px/20px var(--dsw-font-family);color:var(--dsw-alias-label-tertiary);cursor:pointer;opacity:0;transition:opacity .15s}",
      ".rl-ntf:hover .rl-ntf-close,.rl-ntf:focus-within .rl-ntf-close{opacity:1}",
      ".rl-ntf-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
      ".rl-ntf-bar{position:absolute;left:0;right:0;bottom:0;height:1.5px;background:var(--rl-ntf-c);opacity:.75;transform-origin:left;animation:rl-ntf-life linear both}",
      ".rl-ntf:hover .rl-ntf-bar,.rl-ntf:focus-within .rl-ntf-bar{animation-play-state:paused}",
      ".rl-ntf-tap{position:absolute;z-index:-1;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--rl-ntf-c) 26%,transparent) 0 52%,color-mix(in srgb,var(--rl-ntf-c) 55%,transparent) 62%,transparent 70%);pointer-events:none;animation:rl-ntf-tap .65s cubic-bezier(.2,.7,.3,1) forwards}",
      ".rl-ntf[data-leaving]{animation:rl-ntf-out .24s ease-in both}",
      "@keyframes rl-ntf-in{from{opacity:0;transform:translateX(16px);filter:blur(4px)}}",
      "@keyframes rl-ntf-out{to{opacity:0;transform:translateX(12px) scale(.98);filter:blur(3px)}}",
      "@keyframes rl-ntf-wave{from{--rl-ntf-r:0px}75%{opacity:1}to{--rl-ntf-r:400px;opacity:0}}",
      "@keyframes rl-ntf-ping{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(4.4)}}",
      "@keyframes rl-ntf-tap{to{transform:scale(64);opacity:0}}",
      "@keyframes rl-ntf-life{to{transform:scaleX(0)}}",
      // Weekly report: a centred archive sheet over a light scrim.
      ".rl-wk-scrim{position:fixed;inset:0;z-index:1300;display:flex;align-items:center;justify-content:center;padding:24px 16px;background:rgba(12,11,10,.26);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);animation:rl-wk-fade .24s ease-out both}",
      "body[data-ds-dark-theme] .rl-wk-scrim{background:rgba(0,0,0,.5)}",
      ".rl-wk{--rl-wk-up:var(--dsw-static-deepseek-500);--rl-wk-down:#a5c22a;position:relative;box-sizing:border-box;width:min(720px,100%);max-height:100%;overflow:auto;padding:16px 24px 18px 26px;border:.5px solid color-mix(in srgb,var(--dsw-alias-label-primary) 14%,transparent);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-base);background-image:radial-gradient(color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent) .6px,transparent .8px);background-size:12px 12px;box-shadow:0 24px 64px rgba(0,0,0,.2);font-family:var(--dsw-font-family);color:var(--dsw-alias-label-secondary);animation:rl-wk-in .5s cubic-bezier(.16,1,.3,1) both}",
      "body[data-ds-dark-theme] .rl-wk{box-shadow:0 28px 72px rgba(0,0,0,.6)}",
      ".rl-wk::before{content:\"\";position:absolute;left:0;top:18px;bottom:18px;width:2px;background:var(--dsw-static-deepseek-500)}",
      ".rl-wk::after{content:\"\";position:absolute;right:10px;bottom:10px;width:14px;height:14px;border-right:1.5px solid var(--dsw-static-deepseek-500);border-bottom:1.5px solid var(--dsw-static-deepseek-500);pointer-events:none}",
      ".rl-wk-head{display:flex;align-items:center;gap:8px;min-width:0;font:600 9px/14px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;letter-spacing:.14em;color:var(--dsw-alias-label-tertiary);white-space:nowrap}",
      ".rl-wk-tag::before{content:\"RL · WEEKLY REPORT · \";letter-spacing:.16em}",
      ".rl-wk-range{font-weight:500;letter-spacing:.06em;color:var(--dsw-alias-label-secondary)}",
      ".rl-wk-live{padding:0 5px;border:.5px solid color-mix(in srgb,var(--dsw-static-deepseek-500) 60%,transparent);letter-spacing:.06em;color:var(--dsw-static-deepseek-500)}",
      ".rl-wk-nav{display:flex;gap:2px;margin-left:auto}",
      ".rl-wk-step,.rl-wk-x{width:24px;height:24px;padding:0;border:0;border-radius:var(--dsw-radius-xs);background:transparent;font:16px/24px var(--dsw-font-family);color:var(--dsw-alias-label-secondary);cursor:pointer}",
      ".rl-wk-step:hover:not(:disabled),.rl-wk-x:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
      ".rl-wk-step:disabled{opacity:.3;cursor:default}",
      ".rl-wk-x{margin-left:4px}",
      ".rl-wk-title{margin:10px 0 14px;font-size:22px;line-height:30px;font-weight:600;letter-spacing:.02em;color:var(--dsw-alias-label-primary)}",
      ".rl-wk-empty{margin:24px 0 28px;font-size:13px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-wk-hero{display:flex;align-items:baseline;flex-wrap:wrap;column-gap:14px;row-gap:2px;margin-bottom:14px}",
      ".rl-wk-k{width:100%;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-wk-total{font-size:40px;line-height:48px;font-weight:600;letter-spacing:-.01em;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}",
      ".rl-wk-delta{display:inline-flex;align-items:center;gap:6px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-wk-delta[data-trend=up]::before,.rl-wk-delta[data-trend=down]::before{content:\"\";border:4px solid transparent}",
      ".rl-wk-delta[data-trend=up]::before{margin-top:-4px;border-bottom:5px solid var(--rl-wk-up)}",
      ".rl-wk-delta[data-trend=down]::before{margin-top:4px;border-top:5px solid var(--rl-wk-down)}",
      ".rl-wk-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;height:92px;margin:0 0 16px;padding:0 0 2px;border-bottom:1px solid var(--dsw-alias-border-l2)}",
      ".rl-wk-day{position:relative;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:6px;min-width:0}",
      ".rl-wk-bar{display:block;width:100%;max-width:34px;height:calc(var(--h,0) * 62px);min-height:2px;background:color-mix(in srgb,var(--dsw-static-deepseek-500) 82%,transparent);transform-origin:bottom;animation:rl-wk-grow .6s cubic-bezier(.16,1,.3,1) both}",
      ".rl-wk-day:nth-child(2) .rl-wk-bar{animation-delay:.04s}.rl-wk-day:nth-child(3) .rl-wk-bar{animation-delay:.08s}.rl-wk-day:nth-child(4) .rl-wk-bar{animation-delay:.12s}.rl-wk-day:nth-child(5) .rl-wk-bar{animation-delay:.16s}.rl-wk-day:nth-child(6) .rl-wk-bar{animation-delay:.2s}.rl-wk-day:nth-child(7) .rl-wk-bar{animation-delay:.24s}",
      ".rl-wk-day[data-zero] .rl-wk-bar{background:var(--dsw-alias-border-l3)}",
      ".rl-wk-day[data-today] .rl-wk-bar{background:repeating-linear-gradient(135deg,var(--dsw-static-deepseek-500) 0 3px,color-mix(in srgb,var(--dsw-static-deepseek-500) 45%,transparent) 3px 6px)}",
      ".rl-wk-dl{font:600 10px/14px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;color:var(--dsw-alias-label-tertiary)}",
      ".rl-wk-day[data-today] .rl-wk-dl{color:var(--dsw-static-deepseek-500)}",
      ".rl-wk-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));column-gap:16px;margin:0 0 12px}",
      ".rl-wk-cell{min-width:0;padding:9px 0 11px;border-top:1px solid var(--dsw-alias-border-l1)}",
      ".rl-wk-cell:nth-child(-n+4){border-top-color:var(--dsw-alias-border-l2)}",
      ".rl-wk-cell dt{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-wk-cell dd{margin:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}",
      ".rl-wk-cell dd:not(.rl-wk-sub){margin-top:3px;font-size:16px;line-height:22px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}",
      ".rl-wk-cell[data-key=model] dd:not(.rl-wk-sub){padding-top:2px;font:600 13px/18px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;white-space:normal;overflow-wrap:anywhere}",
      ".rl-wk-sub{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-wk-note{margin:0 0 14px;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-wk-actions{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px}",
      ".rl-wk-btn{display:inline-flex;align-items:center;height:30px;padding:0 14px;border:1px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-base);font:500 13px/1 var(--dsw-font-family);color:var(--dsw-alias-label-primary);cursor:pointer}",
      ".rl-wk-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}",
      ".rl-wk-btn--primary{border-color:transparent;background:var(--dsw-static-deepseek-500);color:#fff}",
      ".rl-wk-btn--primary:hover{background:var(--dsw-static-deepseek-500);filter:brightness(1.08)}",
      ".rl-wk-btn:focus-visible,.rl-wk-step:focus-visible,.rl-wk-x:focus-visible{outline:1.5px solid var(--dsw-static-deepseek-500);outline-offset:2px}",
      "@media (max-width:560px){.rl-wk-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rl-wk-cell:nth-child(-n+4){border-top-color:var(--dsw-alias-border-l1)}.rl-wk-cell:nth-child(-n+2){border-top-color:var(--dsw-alias-border-l2)}.rl-wk-tag::before{content:\"RL · \"}}",
      "@keyframes rl-wk-fade{from{opacity:0}}",
      "@keyframes rl-wk-in{from{opacity:0;transform:translateY(12px) scale(.985);filter:blur(3px)}}",
      "@keyframes rl-wk-grow{from{transform:scaleY(0)}}",
      "@media (prefers-reduced-motion:reduce){.rl-wk-scrim,.rl-wk,.rl-wk-bar{animation:none}}",
      // Weekly entry: an archive tab at the right end of the range bar.
      ".rl-cp-rangebar{display:flex;align-items:center;flex-wrap:wrap;gap:10px 16px;min-width:0}",
      ".rl-cp-weekly{position:relative;display:inline-flex;align-items:center;gap:9px;min-width:0;height:32px;margin-left:auto;padding:0 12px 0 0;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:color-mix(in srgb,var(--dsw-alias-label-primary) 2%,transparent);font:500 12.5px/1 var(--dsw-font-family);color:var(--dsw-alias-label-primary);cursor:pointer;overflow:hidden;transition:background-color .15s,border-color .15s}",
      ".rl-cp-weekly:hover{border-color:var(--dsw-alias-border-l3);background:var(--dsw-alias-interactive-bg-hover)}",
      ".rl-cp-weekly:focus-visible{outline:1.5px solid var(--dsw-static-deepseek-500);outline-offset:1px}",
      ".rl-cp-weekly-tag{align-self:stretch;display:inline-flex;align-items:center;padding:0 9px;background:var(--dsw-static-deepseek-500);font:600 10px/1 var(--rl-cp-mono);letter-spacing:.1em;color:#fff}",
      ".rl-cp-weekly-meta{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:12px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-cp-weekly-meta b{font-weight:500;color:var(--dsw-alias-label-secondary)}",
      ".rl-cp-weekly-go{flex:none;width:5px;height:5px;border-top:1.5px solid currentColor;border-right:1.5px solid currentColor;transform:rotate(45deg);color:var(--dsw-alias-label-tertiary)}",
      ".rl-cp-weekly[data-new]::after{content:\"\";position:absolute;top:5px;right:5px;width:5px;height:5px;background:var(--dsw-static-deepseek-500);animation:rl-bill-pulse 2.4s ease-in-out infinite}",
      "@media (max-width:640px){.rl-cp-weekly{margin-left:0}.rl-cp-weekly-meta{display:none}}",
      // Weekly report, second layout: stamp, highlights, hour strip, savings.
      ".rl-wk-titlerow{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;min-width:0}",
      ".rl-wk-stamp{flex:none;display:flex;flex-direction:column;align-items:flex-start;gap:1px;max-width:220px;margin:8px 4px 0 0;padding:6px 12px 7px;border:1.5px solid var(--dsw-static-deepseek-500);border-radius:var(--dsw-radius-sm);color:var(--dsw-static-deepseek-500);transform:rotate(-3deg);animation:rl-wk-stamp .5s cubic-bezier(.2,1.6,.4,1) .35s both}",
      ".rl-wk-stamp-k{font:600 9px/13px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;letter-spacing:.16em;opacity:.8}",
      ".rl-wk-stamp-k::before{content:\"RL-EVAL · \"}",
      ".rl-wk-stamp-name{font-size:16px;line-height:22px;font-weight:700;letter-spacing:.06em}",
      ".rl-wk-stamp-why{max-width:100%;font-size:11px;line-height:15px;color:var(--dsw-alias-label-secondary)}",
      ".rl-wk-avg{width:100%;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}",
      ".rl-wk-body{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(0,1fr);gap:20px;margin-bottom:14px}",
      ".rl-wk-body .rl-wk-days{margin-bottom:12px}",
      ".rl-wk-sec{margin:0 0 8px;font:600 9.5px/14px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;letter-spacing:.14em;color:var(--dsw-alias-label-tertiary)}",
      ".rl-wk-hours{display:grid;grid-template-columns:repeat(24,minmax(0,1fr));gap:2px;height:22px}",
      ".rl-wk-hour{background:color-mix(in srgb,var(--dsw-static-deepseek-500) calc(var(--a,0) * 88% + 6%),transparent)}",
      ".rl-wk-hour[data-top]{outline:1.5px solid var(--dsw-alias-label-primary);outline-offset:1px}",
      ".rl-wk-hticks{display:flex;justify-content:space-between;margin-top:4px;font:600 9.5px/12px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;color:var(--dsw-alias-label-tertiary)}",
      ".rl-wk-best{margin:0;padding:0;list-style:none}",
      ".rl-wk-best li{display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:12.5px;line-height:18px}",
      ".rl-wk-best li:first-child{border-top:1px solid var(--dsw-alias-border-l2)}",
      ".rl-wk-best span{min-width:0;color:var(--dsw-alias-label-tertiary)}",
      ".rl-wk-best b{flex:none;font-weight:600;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}",
      ".rl-wk-saved{display:flex;align-items:center;gap:8px;margin:0 0 10px;padding:8px 12px;border-radius:var(--dsw-radius-sm);background:color-mix(in srgb,#a5c22a 12%,transparent);font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-primary)}",
      ".rl-wk-saved::before{content:\"\";flex:none;width:6px;height:6px;background:#a5c22a}",
      "@keyframes rl-wk-stamp{from{opacity:0;transform:rotate(-3deg) scale(1.6)}}",
      "@media (max-width:640px){.rl-wk-body{grid-template-columns:minmax(0,1fr)}.rl-wk-stamp{max-width:150px}}",
      "@media (prefers-reduced-motion:reduce){.rl-wk-stamp{animation:none}}",
      // Update banner at the top of the config page.
      ".rl-cfg-update{position:relative;margin:0 0 22px;padding:12px 14px 13px 16px;border:.5px solid color-mix(in srgb,var(--dsw-static-deepseek-500) 40%,transparent);border-radius:var(--dsw-radius-md);background:color-mix(in srgb,var(--dsw-static-deepseek-500) 6%,transparent)}",
      ".rl-cfg-update::before{content:\"\";position:absolute;left:0;top:12px;bottom:13px;width:2px;background:var(--dsw-static-deepseek-500)}",
      ".rl-cfg-update .rl-cfg-h{margin:0 0 6px;padding:0;border:0;letter-spacing:.08em;color:var(--dsw-static-deepseek-500)}",
      ".rl-cfg-update .rl-cfg-h::before{content:\"RL · UPDATE  \";white-space:pre;font:600 9px/14px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;letter-spacing:.16em}",
      ".rl-cfg-update .rl-cfg-note{margin:0 0 10px;color:var(--dsw-alias-label-secondary)}",
      ".rl-cfg-update-line{display:flex;align-items:stretch;gap:6px;min-width:0;margin-bottom:8px}",
      ".rl-cfg-update-code{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:5px 10px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-base);font:500 12.5px/18px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;color:var(--dsw-alias-label-primary);user-select:all}",
      ".rl-cfg-update-copy{flex:none;min-width:60px;padding:0 12px;border:0;border-radius:var(--dsw-radius-sm);background:var(--dsw-static-deepseek-500);font:500 12.5px/1 var(--dsw-font-family);color:#fff;cursor:pointer;transition:filter .15s}",
      ".rl-cfg-update-copy:hover{filter:brightness(1.08)}",
      ".rl-cfg-update-copy:focus-visible{outline:1.5px solid var(--dsw-static-deepseek-500);outline-offset:2px}",
      ".rl-cfg-update-link{font-size:12px;line-height:18px;color:var(--dsw-static-deepseek-500);text-decoration:none}",
      ".rl-cfg-update-link:hover{text-decoration:underline}",
      // The same settings inside Harness's own settings dialog.
      ".rl-set-h{margin:0;font-size:18px;font-weight:600}",
      ".rl-set-intro{margin:4px 0 20px;font-size:13px;color:var(--dsw-alias-label-tertiary)}",
      // Low balance: the figure turns to the error colour with a small square in front.
      ".rl-bill-row--balance[data-low=true] .rl-bill-v,.rl-cost-balance[data-low=true]{color:var(--dsw-alias-state-error-primary)}",
      ".rl-bill-row--balance[data-low=true] .rl-bill-v::before{content:\"\";display:inline-block;width:5px;height:5px;margin:0 6px 1px 0;background:currentColor;vertical-align:middle;animation:rl-bill-pulse 2.4s ease-in-out infinite}",
      ".rl-cp-kpi[data-low=true] .rl-cp-kpi-v{color:var(--dsw-alias-state-error-primary)}",
      ".rl-cp-kpi[data-low=true]::before{content:\"\";position:absolute;left:0;top:14px;bottom:14px;width:2px;background:var(--dsw-alias-state-error-primary)}",
      // What's new: a quiet card in the bottom-right corner, never modal.
      ".rl-wn{--rl-wn-c:var(--dsw-static-deepseek-500);position:fixed;right:20px;bottom:20px;z-index:1300;box-sizing:border-box;width:min(380px,calc(100vw - 32px));padding:12px 16px 14px 18px;border:.5px solid color-mix(in srgb,var(--dsw-alias-label-primary) 12%,transparent);border-radius:var(--dsw-radius-md);background:color-mix(in srgb,var(--dsw-alias-bg-base) 82%,transparent);-webkit-backdrop-filter:blur(16px) saturate(1.5);backdrop-filter:blur(16px) saturate(1.5);box-shadow:0 18px 44px rgba(0,0,0,.16),inset 0 1px 0 rgba(255,255,255,.4);font-family:var(--dsw-font-family);color:var(--dsw-alias-label-secondary);animation:rl-wn-in .52s cubic-bezier(.16,1,.3,1) both}",
      "body[data-ds-dark-theme] .rl-wn{background:color-mix(in srgb,var(--dsw-alias-bg-base) 74%,transparent);box-shadow:0 20px 48px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.07)}",
      ".rl-wn[data-kind=welcome]{--rl-wn-c:#a5c22a}",
      ".rl-wn::before{content:\"\";position:absolute;left:0;top:14px;bottom:16px;width:2px;background:var(--rl-wn-c);box-shadow:0 0 8px var(--rl-wn-c)}",
      ".rl-wn::after{content:\"\";position:absolute;top:-1px;right:-1px;width:12px;height:12px;border-top:1.5px solid var(--rl-wn-c);border-right:1.5px solid var(--rl-wn-c);border-top-right-radius:var(--dsw-radius-md);pointer-events:none}",
      ".rl-wn-head{display:flex;align-items:center;gap:8px;min-width:0;margin-bottom:6px;font:600 9px/14px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;letter-spacing:.16em;color:var(--dsw-alias-label-tertiary);white-space:nowrap}",
      ".rl-wn-tag{min-width:0;overflow:hidden;text-overflow:ellipsis;letter-spacing:.1em}",
      ".rl-wn-tag::before{content:\"RL · \";letter-spacing:.16em}",
      ".rl-wn-ver{padding:0 5px;border:.5px solid color-mix(in srgb,var(--rl-wn-c) 55%,transparent);font-weight:500;letter-spacing:.06em;color:var(--rl-wn-c)}",
      ".rl-wn-x{margin-left:auto;width:22px;height:22px;padding:0;border:0;border-radius:var(--dsw-radius-xs);background:transparent;font:16px/22px var(--dsw-font-family);color:var(--dsw-alias-label-tertiary);cursor:pointer}",
      ".rl-wn-x:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
      ".rl-wn-title{margin:0 0 8px;font-size:15px;line-height:22px;font-weight:600;color:var(--dsw-alias-label-primary)}",
      ".rl-wn-list{margin:0 0 12px;padding:0;list-style:none;border-top:1px solid var(--dsw-alias-border-l1)}",
      ".rl-wn-item{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:10px;padding:7px 0;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:13px;line-height:19px;opacity:0;animation:rl-wn-item .4s cubic-bezier(.16,1,.3,1) both}",
      ".rl-wn-item:nth-child(1){animation-delay:.16s}.rl-wn-item:nth-child(2){animation-delay:.22s}.rl-wn-item:nth-child(3){animation-delay:.28s}.rl-wn-item:nth-child(4){animation-delay:.34s}.rl-wn-item:nth-child(5){animation-delay:.4s}",
      ".rl-wn-num{padding-top:1px;font:600 10px/18px ui-monospace,\"SF Mono\",Menlo,\"Cascadia Mono\",Consolas,monospace;letter-spacing:.06em;color:var(--rl-wn-c)}",
      ".rl-wn-text{min-width:0;color:var(--dsw-alias-label-secondary)}",
      ".rl-wn-actions{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px}",
      ".rl-wn-btn{display:inline-flex;align-items:center;height:28px;padding:0 12px;border:1px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);background:transparent;font:500 12.5px/1 var(--dsw-font-family);color:var(--dsw-alias-label-primary);text-decoration:none;cursor:pointer}",
      ".rl-wn-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}",
      ".rl-wn-btn--primary{border-color:transparent;background:var(--dsw-static-deepseek-500);color:#fff}",
      ".rl-wn-btn--primary:hover{background:var(--dsw-static-deepseek-500);filter:brightness(1.08)}",
      ".rl-wn-btn:focus-visible,.rl-wn-x:focus-visible{outline:1.5px solid var(--dsw-static-deepseek-500);outline-offset:2px}",
      ".rl-wn[data-leaving]{animation:rl-wn-out .22s ease-in both}",
      "@keyframes rl-wn-in{from{opacity:0;transform:translateY(14px);filter:blur(4px)}}",
      "@keyframes rl-wn-out{to{opacity:0;transform:translateY(8px)}}",
      "@keyframes rl-wn-item{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}",
      "@media (prefers-reduced-motion:reduce){.rl-wn,.rl-wn-item,.rl-wn[data-leaving]{animation:none;opacity:1}.rl-bill-row--balance[data-low=true] .rl-bill-v::before{animation:none}}",
      "@media (prefers-reduced-motion:reduce){.rl-ntf,.rl-ntf-bar{animation:none!important}.rl-ntf::after,.rl-ntf-dot::before,.rl-ntf-dot::after,.rl-ntf-tap{display:none}}",
    ].join("");

    function specs() {
      return Object.entries(FIELDS).map(([field, spec]) => {
        if (spec.type === "switch") return { field,
          format: (value) => String(typeof value === "boolean" ? value : CONFIG[field] ?? true),
          parse: (text) => ["true", "false"].includes(text) ? { kind: "set", value: text === "true" } : undefined
        };
        if (["choice", "swatch"].includes(spec.type)) return { field,
          format: (value) => { const text = value ?? CONFIG[field] ?? spec.choices[0]; return spec.aliases?.[text] ?? text; },
          parse: (text) => spec.choices.includes(text) ? { kind: "set", value: text } : undefined
        };
        if (spec.type === "color") return { field,
          format: (value) => value ?? CONFIG[field] ?? "#e46f24",
          parse: (text) => validColor(text.trim()) ? { kind: "set", value: text.trim().toLowerCase() } : undefined
        };
        if (spec.type === "money") return { field,
          format: (value) => String(value ?? CONFIG[field] ?? 0),
          parse: (text) => {
            const n = Number(String(text).trim());
            return Number.isFinite(n) && n >= 0 && n <= 100000 ? { kind: "set", value: Math.round(n * 100) / 100 } : undefined;
          }
        };
        if (spec.type === "number") {
          const number = P.settingsNumberField(field);
          return { ...number, parse: (text) => {
            const parsed = number.parse(text);
            return parsed?.kind === "set" && (parsed.value < (spec.min ?? 0) || parsed.value > (spec.max ?? 15000) || (spec.integer && !Number.isInteger(parsed.value))) ? undefined : parsed;
          } };
        }
        return P.settingsTextField(field);
      });
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

    function DeleteSessionMenuItem({ sessionId, useMenuOpenState, t, workspaces, sessions }) {
      React.useSyncExternalStore(subscribeDeleted, deletedSnapshot);
      const snapshot = React.useSyncExternalStore(
        (fn) => workspaces.list.subscribe(fn),
        () => workspaces.list.getSnapshot()
      );
      const [, setMenuOpen] = useMenuOpenState();
      if (deletedSessionIds.has(sessionId) || !snapshot.archivedSessionIds?.includes(sessionId)) return null;
      return jsx(P.MenuItemButton, {
        separatorBefore: true, danger: true,
        icon: jsx(P.IconTrashOutlineRegular, { size: 14 }),
        onSelect: () => {
          setMenuOpen(false);
          const entry = sessions.list.getSnapshot()?.byId?.[sessionId];
          deleteRequest.open({ ids: [sessionId], title: entry?.title || entry?.displayTitle });
        },
        children: t("delSession")
      });
    }

    // The permanent-delete warning, one dialog per request.
    function DeleteConfirmDialog({ t }) {
      const request = React.useSyncExternalStore(deleteRequest.subscribe, deleteRequest.getSnapshot);
      return request ? jsx(DeleteConfirmForm, { request, t }, request.key) : null;
    }
    function DeleteConfirmForm({ request, t }) {
      const [progress, setProgress] = React.useState(null);
      const busy = progress !== null;
      const many = request.ids.length > 1;
      const close = () => { if (!busy) deleteRequest.close(); };
      const confirm = async () => {
        if (busy) return;
        const results = new Map();
        setProgress({ done: 0, total: request.ids.length });
        for (const [index, id] of request.ids.entries()) {
          results.set(id, await deleteSession(id));
          setProgress({ done: index + 1, total: request.ids.length });
        }
        deleteRequest.close();
        request.onSettled?.(results);
        const statuses = [...results.values()];
        const ok = statuses.filter((status) => status === "deleted" || status === "missing").length;
        const scheduled = statuses.filter((status) => status === "scheduled").length;
        if (many) {
          const skipped = results.size - ok - scheduled;
          showToast(fill(t("arcResult"), { ok }) + (scheduled ? fill(t("arcResultScheduled"), { n: scheduled }) : "")
            + (skipped ? fill(t("arcResultSkipped"), { skipped }) : ""), skipped ? "warn" : "ok");
        } else {
          const status = results.get(request.ids[0]);
          if (status === "deleted") showToast(t("delDone"), "ok");
          else if (status === "scheduled") showToast(t("delScheduled"), "ok");
          else showToast(t({ "not-archived": "delNotArchived", missing: "delMissing" }[status] || "delFailed"), "warn");
        }
      };
      return jsx(P.Modal, {
        open: true, onClose: close, closeLabel: t("delClose"),
        title: t("delTitle"),
        description: many ? fill(t("delDescMany"), { n: request.ids.length }) : fill(t("delDesc"), { title: request.title || t("arcUntitled") }),
        footer: jsxs(React.Fragment, { children: [
          jsx(P.Button, { variant: "outline", disabled: busy, autoFocus: true, "data-modal-autofocus": true, onClick: close, children: t("delCancel") }),
          jsx(P.Button, { variant: "outline", className: "rl-danger-action", disabled: busy, onClick: confirm, children: t("delAction") })
        ] }),
        children: busy ? jsx("div", { className: "rl-del-status", role: "status", children: many ? fill(t("arcProgress"), progress) : t("delPending") }) : null
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
      const [restoring, setRestoring] = React.useState(false);
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
      const onRestore = async () => {
        if (restoring || !selected.size) return;
        const ids = rows.filter((row) => selected.has(row.id)).map((row) => row.id);
        setRestoring(true);
        let ok = 0, skipped = 0;
        for (const id of ids) {
          try {
            await workspaces.unarchiveSession(id);
            ok++;
            if (mounted.current) {
              setSelected((current) => { const next = new Set(current); next.delete(id); return next; });
              setNotes((current) => { const next = new Map(current); next.delete(id); return next; });
            }
          } catch {
            skipped++;
            if (mounted.current) setNotes((current) => new Map(current).set(id, { state: "failed", text: t("arcRestoreFailed") }));
          }
        }
        if (mounted.current) {
          setRestoring(false);
          showToast(fill(t("arcRestored"), { ok }) + (skipped ? fill(t("arcResultSkipped"), { skipped }) : ""), skipped ? "warn" : "ok");
        }
      };
      const onDelete = () => {
        if (restoring || !selected.size) return;
        const ids = rows.filter((row) => selected.has(row.id)).map((row) => row.id);
        deleteRequest.open({
          ids, title: ids.length === 1 ? rows.find((row) => row.id === ids[0])?.title : undefined,
          onSettled: (results) => {
            if (!mounted.current) return;
            setSelected((current) => new Set([...current].filter((id) => !removedStatus(results.get(id)))));
            setNotes((current) => {
              const next = new Map(current);
              for (const [id, status] of results) {
                if (removedStatus(status)) continue;
                const state = status === "not-archived" ? status : "failed";
                next.set(id, { state, text: t(state === "not-archived" ? "delNotArchived" : "delFailed") });
              }
              return next;
            });
          }
        });
      };
      const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
      return jsxs("div", {
        className: "rl-arcs", children: [
          jsx("h2", { className: "rl-arcs-h", children: t("arcTitle") }),
          jsx("p", { className: "rl-arcs-intro", children: fill(t("arcDesc"), { count: rows.length }) }),
          jsxs("div", { className: "rl-arc-bar", children: [
            jsxs("label", { className: "rl-arc-all", children: [
              jsx("input", { type: "checkbox", className: "rl-arc-check", checked: allSelected, disabled: restoring || !rows.length,
                onChange: () => setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id))) }),
              jsx("span", { children: t("arcSelectAll") })
            ] }),
            jsx("span", { className: "rl-arc-count", children: fill(t("arcSelected"), { n: selected.size }) }),
            jsx("button", { type: "button", className: "rl-arc-btn", disabled: restoring || !selected.size, onClick: onRestore, children: fill(t("arcRestore"), { n: selected.size }) }),
            jsx("button", { type: "button", className: "rl-arc-btn rl-arc-btn--danger",
              disabled: restoring || !selected.size, onClick: onDelete, children: fill(t("arcDelete"), { n: selected.size }) })
          ] }, "bar"),
          rows.length ? jsx("div", { className: "rl-arc-list", role: "list", children: rows.map((row) => {
            const note = notes.get(row.id);
            return jsxs("label", { className: "rl-arc-row", role: "listitem", "data-state": note?.state,
              "data-selected": selected.has(row.id) ? "true" : undefined, children: [
                jsx("input", { type: "checkbox", className: "rl-arc-check", checked: selected.has(row.id), disabled: restoring,
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
      const config = useLive();
      const mark = BRAND.marks?.[config.logo] || BRAND.mark;
      return config.brand !== false && mark ? jsx("span", {
        className: "rl-brand rl-brand-mark", style: { display: "inline-flex", width: size, height: size },
        dangerouslySetInnerHTML: { __html: mark }
      }) : jsx(P.FishLogo, { size });
    }
    function Name() {
      const config = useLive();
      return config.brand !== false && BRAND.name ? jsx("span", {
        className: "rl-brand rl-brand-name", dangerouslySetInnerHTML: { __html: BRAND.name }
      }) : jsx(P.BrandWordmark, { includeMark: false });
    }
    function Hero({ size, className }) {
      const config = useLive();
      return jsx("span", { className: `${className || ""} rl-brand rl-brand-hero`,
        style: { display: "inline-flex", width: size, height: size }, dangerouslySetInnerHTML: { __html: BRAND.heroes?.[config.logo] || BRAND.hero }
      });
    }

    function SettingsSection(props) {
      return jsxs("div", { className: "rl-set", children: [
        jsx("h2", { className: "rl-set-h", children: props.t("settingsNav") }),
        jsx("p", { className: "rl-set-intro", children: props.t("settingsIntro") }),
        jsx(Card, { ...props })
      ] });
    }

    function Card(props) {
      const { t } = props;
      const state = props.useRhineSplash((snapshot) => snapshot);
      const update = props.useRhineUpdate ? props.useRhineUpdate((snapshot) => snapshot) : { newer: false };
      const recordStore = props.useRhineRecords ? props.useRhineRecords((snapshot) => snapshot) : { mode: "browser" };
      const [copied, setCopied] = React.useState(false);
      const code = React.useRef(null), copyTimer = React.useRef(0);
      React.useEffect(() => () => clearTimeout(copyTimer.current), []);
      const copy = async () => {
        try {
          await navigator.clipboard.writeText("dsh-rhine-splash@" + update.latest);
          setCopied(true);
          clearTimeout(copyTimer.current);
          copyTimer.current = setTimeout(() => setCopied(false), 1500);
        } catch {
          try {
            const range = document.createRange();
            range.selectNodeContents(code.current);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
          } catch {}
        }
      };
      const issues = props.useRhineCompat ? props.useRhineCompat((snapshot) => snapshot) : [];
      React.useEffect(() => {
        if (props.view !== "summary") return () => props.scheduleSave(0);
      }, []);
      if (props.view === "summary") return t("summary");
      if (!state.available) return jsx("p", { className: "rl-cfg-note", role: "status", children: t("unavailable") });
      const disabled = !state.writable;
      const overriddenKeys = Object.keys(state.fields).filter((key) => state.fields[key].overridden);
      const field = (key) => {
        const value = state.fields[key];
        const spec = FIELDS[key];
        const id = `rhine-splash-${key}`;
        const onEdit = (text) => props.edit(key, text);
        if (spec.showIf && state.fields[spec.showIf[0]].text !== spec.showIf[1]) return null;
        if (spec.type === "swatch") return jsxs("div", { className: "rl-cfg-row", children: [
          jsx("span", { className: "rl-cfg-label", children: t(key) }),
          jsx("div", { className: "rl-cfg-swatches", role: "radiogroup", "aria-label": t(key), children: spec.choices.map((choice, index) => {
            const checked = value.text === choice;
            const color = choice === "custom" ? (validColor(state.fields.accentColor.text) ? state.fields.accentColor.text : undefined) : `var(--rl-accent-${choice})`;
            return jsxs("button", { className: "rl-cfg-swatch", type: "button", role: "radio", "aria-checked": checked,
              tabIndex: checked ? 0 : -1, "data-accent": choice, title: t(spec.label + choice), disabled, style: { "--rl-swatch": color },
              onClick: () => { onEdit(choice); props.scheduleSave(0); },
              onKeyDown: (event) => {
                const next = event.key === "Home" ? 0 : event.key === "End" ? spec.choices.length - 1
                  : event.key === "ArrowLeft" ? (index + spec.choices.length - 1) % spec.choices.length
                  : event.key === "ArrowRight" ? (index + 1) % spec.choices.length : -1;
                if (next < 0) return;
                event.preventDefault();
                onEdit(spec.choices[next]); props.scheduleSave(0);
                event.currentTarget.parentElement.querySelectorAll('[role="radio"]')[next]?.focus();
              }, children: [
                jsx("i", { className: "rl-cfg-swatch-chip", style: { "--rl-swatch": color } }),
                jsx("span", { className: "rl-cfg-swatch-name", children: t(spec.label + choice) })
              ] }, choice);
          }) })
        ] }, key);
        if (spec.type === "color") return jsxs("div", { className: "rl-cfg-row", children: [
          jsx("span", { className: "rl-cfg-label", children: t(key) }),
          jsxs("label", { className: "rl-cfg-color", children: [
            jsx("input", { type: "color", value: validColor(value.text) ? expandColor(value.text) : "#e46f24", "aria-label": t(key), disabled,
              onInput: (event) => { onEdit(event.currentTarget.value); props.scheduleSave(250); } }),
            jsx("span", { className: "rl-cfg-color-hex", children: value.text })
          ] })
        ] }, key);
        if (spec.type === "switch" || spec.type === "choice") {
          // SettingsValueField has a fixed text input and no control/children slot.
          // Keep its staged-value/reset semantics with the confirmed controls.
          return jsxs("div", { className: "rl-cfg-row", children: [
            jsx("span", { className: "rl-cfg-label", children: t(key) }),
            spec.type === "switch" ? jsx(P.Switch, { checked: value.text === "true", label: t(key), disabled,
              onChange: (checked) => { onEdit(String(checked)); props.scheduleSave(0); }
            }) : jsx(P.SegmentedControl, { id, value: value.text, label: t(key), disabled, className: "rl-cfg-seg",
              options: spec.choices.map((choice) => ({ value: choice, label: t((spec.label || "") + choice) })),
              onChange: (text) => { onEdit(text); props.scheduleSave(0); }
            })
          ] }, key);
        }
        return jsx("div", { className: "rl-cfg-field", onBlur: () => props.scheduleSave(0),
          onKeyDown: (event) => { if (event.key === "Enter") props.scheduleSave(0); },
          children: jsx(P.SettingsValueField, { id, label: t(key), disabled, ...value, overridden: false,
            numeric: ["number", "money"].includes(spec.type),
            invalidLabel: t(spec.type === "money" ? "invalidMoney" : "invalidNumber"), onEdit
          })
        }, key);
      };
      const group = (title, keys) => jsxs("section", { className: "rl-cfg-section", children: [jsx("h3", { className: "rl-cfg-h", children: t(title) }), ...keys.map(field),
        title === "tools" && jsxs("div", { className: "rl-cfg-row", children: [
          jsx("span", { className: "rl-cfg-label", children: t("recWhere") }),
          jsxs("div", { children: [jsx("span", { children: recordStore.mode === "file" ? fill(t("recFile"), { file: recordStore.file }) : t("recBrowser") }),
            jsx("p", { className: "rl-cfg-note", children: t("recHint") })] })
        ] }),
        SECTION_NOTES[title] && jsx("p", { className: "rl-cfg-note", children: t(SECTION_NOTES[title]) })] }, title);
      return jsxs("div", { className: "rl-cfg", children: [
        update.newer && jsxs("section", { className: "rl-cfg-update", role: "status", children: [
          jsx("h3", { className: "rl-cfg-h", children: fill(t("updTitle"), { latest: update.latest }) }),
          jsx("p", { className: "rl-cfg-note", children: fill(t("updSteps"), { current: VERSION }) }),
          jsxs("div", { className: "rl-cfg-update-line", children: [
            jsx("code", { className: "rl-cfg-update-code", ref: code, children: "dsh-rhine-splash@" + update.latest }),
            jsx("button", { type: "button", className: "rl-cfg-update-copy", onClick: copy, children: t(copied ? "updCopied" : "updCopy") })
          ] }),
          jsx("a", { className: "rl-cfg-update-link", href: "https://github.com/Respawn-ID/dsh-rhine-splash/releases/latest", target: "_blank", rel: "noreferrer", children: t("updLink") })
        ] }),
        !state.writable && jsx("p", { className: "rl-cfg-note", children: t("readOnly") }),
        issues.length > 0 && jsxs("section", { className: "rl-cfg-section rl-cfg-compat", role: "status", children: [
          jsx("h3", { className: "rl-cfg-h", children: t("compat") }),
          ...issues.map((issue) => jsxs("div", { className: "rl-cfg-compat-row", children: [
            jsx("i", { className: "rl-cfg-compat-pip" }),
            jsx("span", { className: "rl-cfg-compat-name", children: t("cf_" + issue.feature) }),
            jsx("span", { className: "rl-cfg-compat-why", children: issue.reason === "missing"
              ? fill(t("compatMissing"), { names: issue.detail }) : t(issue.reason === "crashed" ? "compatCrashed" : "compatAbsent") })
          ] }, issue.feature)),
          jsx("p", { className: "rl-cfg-hint", children: t("compatHint") })
        ] }),
        ...SECTIONS.map((section) => group(section, Object.keys(FIELDS).filter((key) => FIELDS[key].section === section))),
        jsxs("section", { className: "rl-cfg-section", children: [
          jsx("h3", { className: "rl-cfg-h", children: t("archives") }),
          jsx("div", { className: "rl-cfg-row", children:
            jsx("span", { className: "rl-cfg-label", children: t("arcHint") })
          })
        ] }, "archives"),
        jsxs("div", { className: "rl-cfg-actions", children: [
          ...PREVIEWS.map((entry) => jsxs("button", { type: "button", className: "rl-cfg-preview", onClick: () => props.runPreview(entry.id), children: [jsx("i", {}), t(entry.page)] }, entry.id)),
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

    // Instant (即答), as Claude Code's thinking toggle and DeepSeek's own
    // 深度思考 switch: effort "off" sends thinking: disabled, so the model
    // answers at once. Turning it off returns to the level used before,
    // remembered per model, else the model's default.
    const INSTANT_BACK = "rhine-splash:instant-back";
    const instantToggles = new Set();
    function instantBack(efforts, defaultEffort, remembered) {
      const usable = (id) => id !== "off" && efforts.some((effort) => effort.id === id);
      if (usable(remembered)) return remembered;
      if (usable(defaultEffort)) return defaultEffort;
      return efforts.find((effort) => effort.id !== "off")?.id;
    }
    function recallInstantBack(key) {
      try { return JSON.parse(localStorage.getItem(INSTANT_BACK) || "{}")?.[key]; } catch { return undefined; }
    }
    function rememberInstantBack(key, effort) {
      try {
        const map = JSON.parse(localStorage.getItem(INSTANT_BACK) || "{}") || {};
        map[key] = effort;
        localStorage.setItem(INSTANT_BACK, JSON.stringify(map));
      } catch {}
    }
    // Alt+T (Option+T) toggles the control of the conversation that has focus.
    function onInstantKey(event) {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat || event.code !== "KeyT") return;
      const active = document.activeElement;
      const shown = [...instantToggles].filter((entry) => entry.root.current?.isConnected && entry.root.current.getClientRects().length);
      const owner = (entry) => entry.root.current.closest("[data-phase]");
      const target = shown.find((entry) => active && owner(entry)?.contains(active))
        || (shown.length === 1 && (!active || active === document.body) ? shown[0] : undefined);
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      target.toggle();
    }

    // Answer now (立即回答): shown while a reply is running with thinking on.
    // The DeepSeek API fixes thinking per request, so it stops the reply and
    // sends a short, hidden follow-up with effort "off" (see registerAnswerNow).
    function effortNow(snapshot) {
      const current = snapshot?.current;
      const model = snapshot?.groups?.find((group) => group.id === current?.provider)?.models.find((item) => item.id === current?.model);
      return { current, model, effort: current?.reasoningEffort ?? model?.reasoning?.defaultEffort,
        offered: !!model?.reasoning?.efforts?.some((effort) => effort.id === "off") };
    }
    function AnswerNow({ available, sessionId, directory, status, busy, answer, t }) {
      const config = useLive();
      const state = React.useSyncExternalStore((fn) => directory.subscribe(fn), () => directory.getSnapshot());
      const statuses = React.useSyncExternalStore((fn) => status.subscribe(fn), () => status.getSnapshot());
      const pending = React.useSyncExternalStore(busy.subscribe, busy.getSnapshot);
      const run = statuses?.get?.(sessionId);
      const { effort, offered } = effortNow(state);
      if (config.effortSlider === false || !available || run?.running !== true || run.pendingInteraction || !offered || effort === "off" || pending.has(sessionId)) return null;
      return createPortal(jsxs("button", { type: "button", className: "rl-answer-now", title: t("answerNowHint"), onClick: () => answer(sessionId), children: [
        jsx("svg", { viewBox: "0 0 16 16", "aria-hidden": "true", children: jsx("path", { d: "M9.4 1.2 3.3 9.1h4.1l-1 5.7 6.3-8H8.5z" }) }),
        jsx("span", { children: t("answerNow") })
      ] }), document.body);
    }
    // Invisible separators: harmless to the model, never typed by hand.
    const ANSWER_MARK = "\u2063\u2063";
    function AnswerNowMark() {
      return jsx("span", { "data-rl-answer-now": "", hidden: true });
    }

    function EffortControl({ available, directory, load, select, t }) {
      const config = useLive();
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
      const visible = config.effortSlider !== false && available && !!current && !!model?.reasoning && n >= 2;
      const offIndex = efforts.findIndex((effort) => effort.id === "off");
      const canInstant = offIndex >= 0 && efforts.some((effort) => effort.id !== "off");
      const instant = canInstant && targetIndex === offIndex;
      const toggleRef = React.useRef(null);
      React.useEffect(() => {
        if (!visible || !canInstant) return;
        const entry = { root: rootRef, toggle: () => toggleRef.current?.() };
        instantToggles.add(entry);
        return () => { instantToggles.delete(entry); };
      }, [visible, canInstant]);
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
      const toggleInstant = () => {
        if (!canInstant) return;
        const snap = directory.getSnapshot();
        const now = snap.status === "selecting" && snap.pending ? snap.pending.reasoningEffort : (snap.current?.reasoningEffort ?? model.reasoning.defaultEffort);
        const key = current.provider + "/" + current.model;
        if (now !== "off") {
          rememberInstantBack(key, now);
          commit(offIndex);
          return;
        }
        const index = efforts.findIndex((effort) => effort.id === instantBack(efforts, model.reasoning.defaultEffort, recallInstantBack(key)));
        if (index >= 0) commit(index);
      };
      toggleRef.current = toggleInstant;
      return jsxs("div", { className: "rl-eff", ref: rootRef, ...flags, style: { "--rl-eff-n": String(n) }, children: [
        canInstant ? jsxs("button", { type: "button", className: "rl-eff-instant", "aria-pressed": instant, title: t("effInstantHint"),
          onClick: toggleInstant, children: [
            jsx("svg", { viewBox: "0 0 16 16", "aria-hidden": "true", children: jsx("path", { d: "M9.4 1.2 3.3 9.1h4.1l-1 5.7 6.3-8H8.5z" }) }),
            jsx("span", { children: t("effInstant") })
          ]
        }) : null,
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
    function validLedger(value) {
      return value && ["CNY", "USD"].includes(value.currency)
        && (value.cost === null || (Number.isFinite(value.cost) && value.cost >= 0))
        && ["miss", "hit", "out"].every((key) => Number.isFinite(value.seen?.[key]) && value.seen[key] >= 0);
    }
    function readLedger(sessionId) {
      if (billingLedgers.has(sessionId)) return billingLedgers.get(sessionId);
      if (records.getSnapshot().mode === "file") return null;
      try {
        const value = JSON.parse(localStorage.getItem("rhine-splash:bill:" + sessionId));
        if (validLedger(value)) { billingLedgers.set(sessionId, value); return value; }
      } catch {}
      return null;
    }

    function usageBuckets(usage) {
      const count = (value) => Number.isFinite(value) && value >= 0 ? value : 0;
      return { miss: count(usage.uncachedInputTokens) + count(usage.cacheWriteTokens),
        hit: count(usage.cacheReadTokens), out: count(usage.outputTokens) };
    }

    function recordUsage(sessionId, usage, model, currency, now = Date.now(), enqueue = true) {
      if (typeof model !== "string") return readLedger(sessionId);
      const seen = usageBuckets(usage);
      const previous = readLedger(sessionId);
      currency = previous?.currency || currency;
      const rates = priceOf(model, currency);
      let cost = previous?.cost ?? null, delta, added = 0;
      if (!previous || previous.cost === null) {
        delta = seen;
        cost = rates ? costOf(seen, rates, isPeak(now)) : null;
        added = cost ?? 0;
      } else {
        delta = Object.fromEntries(Object.keys(seen).map((key) => [key, seen[key] - previous.seen[key]]));
        if (!rates) cost = null;
        else if (Object.values(delta).every((value) => value >= 0) && Object.values(delta).some((value) => value > 0)) {
          added = costOf(delta, rates, isPeak(now));
          cost += added;
        }
      }
      const ledger = { seen, cost, currency, model, at: now };
      billingLedgers.set(sessionId, ledger);
      try { localStorage.setItem("rhine-splash:bill:" + sessionId, JSON.stringify(ledger)); } catch {}
      if (added > 0) writeDayLog(addToDayLog(readDayLog(), { day: dayKey(now), hour: new Date(now).getHours(), peak: isPeak(now), model, sessionId, delta, cost: added, currency }));
      // Unchanged snapshots (the minute refresh re-reads every session) need no host write.
      const changed = !previous || previous.model !== model || previous.cost !== cost || ["miss", "hit", "out"].some((key) => previous.seen[key] !== seen[key]);
      if (enqueue && changed) records.queue({ type: "usage", sessionId, model, currency, seen,
        prices: { CNY: priceOf(model, "CNY"), USD: priceOf(model, "USD") }, peak: isPeak(now), day: dayKey(now), hour: new Date(now).getHours(), at: now });
      usageTick.emit();
      return ledger;
    }

    function preferredBalances(value) {
      return [...(value?.balances || [])].sort((a, b) => Number(b.total) - Number(a.total)
        || (a.currency === b.currency ? 0 : a.currency === "CNY" ? -1 : 1));
    }

    // Return a local calendar date without UTC or DST boundary shifts.
    function dayKey(time) {
      const date = new Date(time);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    // Enumerate calendar days ending today, oldest first.
    function rangeDays(now, count) {
      const date = new Date(now);
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - count + 1);
      return Array.from({ length: count }, () => {
        const key = dayKey(date);
        date.setDate(date.getDate() + 1);
        return key;
      });
    }

    let dayLogCache;
    function validateDayLog(value) {
      const object = (value) => value && typeof value === "object" && !Array.isArray(value);
      const amount = (value) => Number.isFinite(value) && value >= 0;
      if (!object(value) || value.v !== 1 || !["CNY", "USD"].includes(value.currency) || !object(value.days)) throw new Error("Invalid day log");
      for (const [day, row] of Object.entries(value.days)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || dayKey(new Date(day + "T12:00:00")) !== day || !object(row.models) || !object(row.sessions)) throw new Error("Invalid day bucket");
        if ((Object.hasOwn(row, "hours") && (!Array.isArray(row.hours) || row.hours.length !== 24 || !row.hours.every(amount)))
          || ["peak", "offPeak"].some((key) => Object.hasOwn(row, key) && !amount(row[key]))) throw new Error("Invalid day timing");
        if (!Object.values(row.models).every((entry) => object(entry) && ["cost", "miss", "hit", "out"].every((key) => amount(entry[key])))
          || !Object.values(row.sessions).every(amount)) throw new Error("Invalid day amounts");
      }
      return value;
    }
    // Read and validate the versioned daily log once per plugin lifetime.
    function readDayLog() {
      if (dayLogCache) return dayLogCache;
      try { dayLogCache = validateDayLog(JSON.parse(localStorage.getItem("rhine-splash:bill-days"))); }
      catch { dayLogCache = { v: 1, currency: "CNY", days: {} }; }
      return dayLogCache;
    }

    // Add a priced delta immutably and retain the latest 62 calendar days.
    function addToDayLog(log, { day, hour, peak, model, sessionId, delta, cost, currency }) {
      const source = log.currency === currency ? log.days : {};
      const oldest = rangeDays(new Date(day + "T12:00:00"), 62)[0];
      const days = Object.fromEntries(Object.entries(source).filter(([key]) => key >= oldest));
      const row = Object.hasOwn(days, day) ? days[day] : { models: {}, sessions: {} };
      const before = Object.hasOwn(row.models, model) ? row.models[model] : { cost: 0, miss: 0, hit: 0, out: 0 };
      const entry = { cost: before.cost + cost, miss: before.miss + delta.miss, hit: before.hit + delta.hit, out: before.out + delta.out };
      const timing = {};
      if (Number.isInteger(hour) && hour >= 0 && hour < 24) {
        timing.hours = [...(row.hours || Array(24).fill(0))];
        timing.hours[hour] += cost;
      }
      if (typeof peak === "boolean") {
        timing.peak = (row.peak || 0) + (peak ? cost : 0);
        timing.offPeak = (row.offPeak || 0) + (peak ? 0 : cost);
      }
      days[day] = { ...row, ...timing, models: { ...row.models, [model]: entry }, sessions: { ...row.sessions, [sessionId]: (Object.hasOwn(row.sessions, sessionId) ? row.sessions[sessionId] : 0) + cost } };
      return { v: 1, currency, days };
    }

    // Publish the cached log even if localStorage is unavailable or full.
    function writeDayLog(log) {
      dayLogCache = log;
      try { localStorage.setItem("rhine-splash:bill-days", JSON.stringify(log)); } catch {}
    }

    let runLogCache;
    function readRunLog() {
      if (runLogCache) return runLogCache;
      try { runLogCache = validateRunLog(JSON.parse(localStorage.getItem("rhine-splash:run-days"))); }
      catch { runLogCache = { v: 1, days: {} }; }
      return runLogCache;
    }
    function addRun(log, { day, ms }) {
      const retained = new Set(rangeDays(new Date(day + "T12:00:00"), 62));
      const days = Object.fromEntries(Object.entries(log.days).filter(([key]) => retained.has(key)));
      const before = days[day] || { runs: 0, ms: 0, longest: 0 };
      days[day] = { runs: before.runs + 1, ms: before.ms + ms, longest: Math.max(before.longest, ms) };
      return { v: 1, days };
    }
    function writeRunLog(log, run) {
      if (run) records.queue({ type: "run", ...run });
      runLogCache = log;
      try { localStorage.setItem("rhine-splash:run-days", JSON.stringify(log)); } catch {}
    }
    function shiftDay(day, offset) {
      const date = new Date(day + "T12:00:00");
      date.setDate(date.getDate() + offset);
      return dayKey(date);
    }
    function weekStartOf(time) {
      const date = new Date(time);
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - (date.getDay() + 6) % 7);
      return dayKey(date);
    }
    function isoWeek(day) {
      const date = new Date(day + "T12:00:00Z");
      date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
      return Math.ceil(((date - Date.UTC(date.getUTCFullYear(), 0, 1, 12)) / 86400000 + 1) / 7);
    }
    // depth: how many weeks back this report was asked for by a later week's
    // badge rule (it needs the badge awarded the week before).
    function weeklyReport({ log, runs, weekStart, now, depth = 0 }) {
      const start = weekStart, end = shiftDay(start, 6), current = weekStartOf(now) === start;
      const models = new Map(), sessions = new Set(), conversationCosts = new Map(), hours = Array(24).fill(0);
      let hit = 0, miss = 0, out = 0, cacheSaved = 0, peak = 0, offPeak = 0, hasHours = false, hasPeak = false, run = null;
      const days = Array.from({ length: 7 }, (_, i) => {
        const day = shiftDay(start, i), row = log.days[day], recorded = runs.days[day];
        let cost = 0;
        for (const [model, entry] of Object.entries(row?.models || {})) {
          cost += entry.cost;
          models.set(model, (models.get(model) || 0) + entry.cost);
          hit += entry.hit;
          miss += entry.miss;
          out += entry.out;
          const rates = priceOf(model, log.currency), full = rates ? costOf(entry, rates, true) : 0;
          if (rates) cacheSaved += entry.hit * (rates.miss - rates.hit) / 1000000 * (full > 0 ? entry.cost / full : 1);
        }
        for (const [id, value] of Object.entries(row?.sessions || {})) {
          if (value > 0) sessions.add(id);
          conversationCosts.set(id, (conversationCosts.get(id) || 0) + value);
        }
        if (row?.hours) {
          hasHours = true;
          row.hours.forEach((value, hour) => { hours[hour] += value; });
        }
        if (row?.peak !== undefined && row?.offPeak !== undefined) { hasPeak = true; peak += row.peak; offPeak += row.offPeak; }
        if (recorded) {
          run ||= { count: 0, ms: 0, longest: 0 };
          run.count += recorded.runs;
          run.ms += recorded.ms;
          run.longest = Math.max(run.longest, recorded.longest);
        }
        return { day, cost };
      });
      const total = days.reduce((sum, row) => sum + row.cost, 0);
      const previousDays = Array.from({ length: 7 }, (_, i) => shiftDay(start, i - 7));
      const previous = previousDays.some((day) => Object.hasOwn(log.days, day))
        ? previousDays.reduce((sum, day) => sum + Object.values(log.days[day]?.models || {}).reduce((cost, row) => cost + row.cost, 0), 0) : null;
      const elapsed = current ? days.findIndex((row) => row.day === dayKey(now)) + 1 : 7;
      const busiest = hasHours ? { hour: hours.indexOf(Math.max(...hours)), cost: Math.max(...hours) } : null;
      const dayCost = (day) => Object.values(log.days[day]?.models || {}).reduce((sum, row) => sum + row.cost, 0);
      let streak = 0;
      for (let day = current ? dayKey(now) : end; dayCost(day) > 0; day = shiftDay(day, -1)) streak++;
      const earlierWeeks = Array.from({ length: 4 }, (_, i) => Array.from({ length: 7 }, (_, j) => shiftDay(start, -7 * (i + 1) + j)))
        .filter((week) => week.some((day) => Object.hasOwn(log.days, day)));
      const earlier = earlierWeeks.map((week) => week.reduce((sum, day) => sum + dayCost(day), 0));
      let hit4 = 0, miss4 = 0;
      for (const day of earlierWeeks.flat()) for (const entry of Object.values(log.days[day]?.models || {})) { hit4 += entry.hit; miss4 += entry.miss; }
      const average4 = earlier.length ? earlier.reduce((sum, value) => sum + value, 0) / earlier.length : null;
      const hourlyTotal = hours.reduce((sum, value) => sum + value, 0), tokens = hit + miss + out;
      const top = days.reduce((best, row, index) => !best || row.cost > best.cost ? { ...row, index } : best, null);
      const report = { start, end, week: isoWeek(start), current, currency: log.currency, days, total, avg: total / elapsed,
        previous, change: previous ? (total - previous) / previous : null,
        activeDays: days.filter((row) => row.cost > 0).length, conversations: sessions.size,
        models: [...models].map(([model, cost]) => ({ model, cost, share: total ? cost / total : 0 })).sort((a, b) => b.cost - a.cost),
        hitRate: hit + miss ? hit / (hit + miss) : null, busiest, offPeakShare: peak + offPeak ? offPeak / (peak + offPeak) : null,
        runs: run, empty: total === 0 && !run,
        hours: hasHours ? hours : null, nightShare: hasHours ? (hourlyTotal ? hours.reduce((sum, value, hour) => sum + (hour >= 22 || hour < 6 ? value : 0), 0) / hourlyTotal : 0) : null,
        weekendShare: total ? (days[5].cost + days[6].cost) / total : null, topDay: total ? top : null,
        topConversation: conversationCosts.size ? { cost: Math.max(...conversationCosts.values()) } : null,
        streak, tokens, cacheSaved, offPeakSaved: hasPeak ? offPeak : null, average4, hitRate4: hit4 + miss4 ? hit4 / (hit4 + miss4) : null,
        vsAverage: average4 ? (total - average4) / average4 : null, books: Math.round(tokens * 1.5 / 200000) };
      // Badges in order of precedence. The cache one is measured against the
      // previous four weeks, since an agent's context cache usually hits 90%
      // or more every week: it takes misses at half that baseline or fewer.
      const badges = report.empty ? [] : [
        report.nightShare >= 0.3 && { key: "night", values: { share: report.nightShare } },
        run?.longest >= 1800000 && { key: "marathon", values: { ms: run.longest } },
        report.activeDays === (current ? elapsed : 7) && (!current || elapsed >= 3) && { key: "allWeek", values: {} },
        report.hitRate >= 0.9 && report.hitRate4 !== null && miss * 2 * (hit4 + miss4) <= miss4 * (hit + miss)
          && { key: "cache", values: { rate: report.hitRate, base: report.hitRate4 } },
        report.offPeakShare >= 0.5 && { key: "offPeak", values: { share: report.offPeakShare } },
        report.weekendShare >= 0.4 && { key: "weekend", values: { share: report.weekendShare } },
        report.change !== null && report.change >= 0.5 && { key: "surge", values: { change: report.change } },
        report.change !== null && report.change <= -0.3 && { key: "calm", values: { change: report.change } },
        { key: "steady", values: {} }
      ].filter(Boolean);
      // Never the same badge two weeks running (steady, the fallback, aside):
      // last week's award passes to the next badge this week has earned.
      const before = shiftDay(start, -7);
      const last = badges.length > 1 && depth < 8 && Array.from({ length: 7 }, (_, i) => shiftDay(before, i)).some((day) => Object.hasOwn(log.days, day) || Object.hasOwn(runs.days, day))
        ? weeklyReport({ log, runs, weekStart: before, now, depth: depth + 1 }).badge : null;
      report.badge = badges.find((badge) => badge.key === "steady" || badge.key !== last?.key) ?? null;
      return report;
    }
    function weeklyBadgeText(report, t) {
      if (!report.badge) return { name: "", reason: "" };
      const { key, values } = report.badge, formatted = { ...values };
      for (const field of ["share", "rate", "base"]) if (values[field] !== undefined) formatted[field] = Math.round(values[field] * 100) + "%";
      if (values.ms !== undefined) formatted.duration = durationText(values.ms, t);
      if (values.change !== undefined) formatted.change = Math.round(Math.abs(values.change) * 100) + "%";
      return { name: t("wb_" + key), reason: fill(t("wbr_" + key), formatted) };
    }
    function reportWeeks({ log, runs, now }) {
      const current = weekStartOf(now), retained = new Set(rangeDays(now, 62));
      const days = [...Object.keys(log.days), ...Object.keys(runs.days)].filter((day) => retained.has(day)).sort();
      const oldest = days.length ? weekStartOf(new Date(days[0] + "T12:00:00")) : current;
      const weeks = [];
      for (let week = current; week >= oldest; week = shiftDay(week, -7)) weeks.push(week);
      return weeks;
    }
    function durationText(ms, t) {
      const seconds = Math.floor(ms / 1000), minutes = Math.floor(seconds / 60), hours = Math.floor(minutes / 60);
      return seconds < 60 ? fill(t("wkSec"), { n: seconds }) : minutes < 60 ? fill(t("wkMin"), { n: minutes })
        : fill(t(minutes % 60 ? "wkHourMin" : "wkHour"), { h: hours, m: minutes % 60 });
    }

    // Aggregate a dated range without inventing dates for legacy ledgers.
    function costSummary(log, ledgers, now, count) {
      const models = new Map(), sessions = new Map();
      const days = rangeDays(now, count).map((day) => {
        const row = log.days[day];
        let cost = 0;
        for (const [model, entry] of Object.entries(row?.models || {})) {
          cost += entry.cost;
          const sum = models.get(model) || { model, cost: 0, miss: 0, hit: 0, out: 0 };
          for (const key of ["cost", "miss", "hit", "out"]) sum[key] += entry[key];
          models.set(model, sum);
        }
        for (const [id, value] of Object.entries(row?.sessions || {})) sessions.set(id, (sessions.get(id) || 0) + value);
        return { day, cost };
      });
      const range = days.reduce((sum, row) => sum + row.cost, 0);
      return { today: days.at(-1)?.cost || 0, range, days, models: [...models.values()].sort((a, b) => b.cost - a.cost).map((row) => ({ ...row, share: range ? row.cost / range : 0 })), sessions };
    }

    // Build the page report from dated spending only.
    function costReport({ log, now, range, list, workspaces, ledgers, budgets }) {
      const modelTotals = new Map(), sessionTotals = new Map();
      const hours = Array(24).fill(0), peak = { peak: 0, offPeak: 0, known: 0 };
      const tokens = { miss: 0, hit: 0, out: 0 }, split = { miss: 0, hit: 0, out: 0 };
      let hoursKnown = 0, cacheSaved = 0;
      const days = rangeDays(now, range).map((day) => {
        const row = log.days[day], models = {};
        let cost = 0;
        for (const [model, entry] of Object.entries(row?.models || {})) {
          models[model] = entry.cost;
          cost += entry.cost;
          const sum = modelTotals.get(model) || { model, cost: 0, miss: 0, hit: 0, out: 0 };
          for (const key of ["cost", "miss", "hit", "out"]) sum[key] += entry[key];
          modelTotals.set(model, sum);
          const rates = priceOf(model, log.currency);
          const full = rates ? costOf(entry, rates, true) : 0;
          const factor = full > 0 ? entry.cost / full : 1;
          for (const key of ["miss", "hit", "out"]) {
            tokens[key] += entry[key];
            if (rates) split[key] += entry[key] * rates[key] / 1000000 * factor;
          }
          if (rates) cacheSaved += entry.hit * (rates.miss - rates.hit) / 1000000 * factor;
        }
        if (row?.hours) {
          row.hours.forEach((value, hour) => { hours[hour] += value; });
          hoursKnown += cost;
        }
        if (row?.peak !== undefined && row?.offPeak !== undefined) {
          peak.peak += row.peak;
          peak.offPeak += row.offPeak;
        }
        for (const [id, value] of Object.entries(row?.sessions || {})) sessionTotals.set(id, (sessionTotals.get(id) || 0) + value);
        return { day, cost, models };
      });
      peak.known = peak.peak + peak.offPeak;
      const total = days.reduce((sum, row) => sum + row.cost, 0);
      const share = (cost) => total ? cost / total : 0;
      const hitRate = (row) => row.hit + row.miss ? row.hit / (row.hit + row.miss) : 0;
      const previousDays = rangeDays(now, range * 2).slice(0, range);
      const oldest = rangeDays(now, 62)[0];
      const previous = previousDays[0] < oldest || !Object.keys(log.days).some((day) => day >= oldest && day < days[0].day)
        ? null : previousDays.reduce((sum, day) => sum + Object.values(log.days[day]?.models || {}).reduce((cost, entry) => cost + entry.cost, 0), 0);
      const models = [...modelTotals.values()].sort((a, b) => b.cost - a.cost).map((row) => ({
        ...row, share: share(row.cost), hitRate: hitRate(row),
        perMillion: row.miss + row.hit + row.out ? row.cost / (row.miss + row.hit + row.out) * 1000000 : 0
      }));
      const sessions = [...sessionTotals].map(([id, cost]) => {
        const row = list?.byId?.[id];
        const workspace = workspaces?.items?.find((item) => item.sessionIds?.includes(id));
        const at = typeof row?.updatedAt === "string" ? Date.parse(row.updatedAt) : row?.updatedAt;
        return { id, title: row?.title || row?.displayTitle || null,
          workspace: workspace?.title || row?.cwd?.split(/[\\/]/).filter(Boolean).pop() || null,
          model: ledgers(id)?.model ?? null, cost, share: share(cost), at: Number.isFinite(at) ? at : null };
      }).sort((a, b) => b.cost - a.cost);
      const workspaceTotals = new Map();
      for (const row of sessions) {
        const key = row.workspace || "";
        const sum = workspaceTotals.get(key) || { key, title: row.workspace, cost: 0, share: 0, count: 0 };
        sum.cost += row.cost;
        sum.count++;
        workspaceTotals.set(key, sum);
      }
      const grouped = [...workspaceTotals.values()].sort((a, b) => b.cost - a.cost).map((row) => ({ ...row, share: share(row.cost) }));
      const offset = new Date(now).getTimezoneOffset() / 60;
      const peakHours = hours.map((_, hour) => {
        const beijing = (hour + offset + 8 + 48) % 24;
        return (beijing >= 9 && beijing < 12) || (beijing >= 14 && beijing < 18);
      });
      const daily = budgets?.daily || 0, session = budgets?.session || 0;
      return { currency: log.currency, range, days, total, previous,
        activeDays: days.filter((row) => row.cost > 0).length, average: total / range,
        hours, hoursKnown, peakHours, peak, tokens, hitRate: hitRate(tokens), split, cacheSaved, models, sessions, workspaces: grouped,
        budget: { daily, today: days.at(-1).cost, overDays: daily > 0 ? days.filter((row) => row.cost >= daily).length : 0,
          session, overSessions: session > 0 ? sessions.filter((row) => ledgers(row.id)?.cost >= session).length : 0 }
      };
    }

    const usageListeners = new Set();
    let usageVersion = 0;
    const usageTick = {
      getSnapshot: () => usageVersion,
      subscribe(fn) { usageListeners.add(fn); return () => usageListeners.delete(fn); },
      emit() { usageVersion++; usageListeners.forEach((fn) => fn()); }
    };
    const moneyText = (value, currency) => (currency === "USD" ? "$" : "¥") + value.toFixed(value === 0 ? 2 : value < 0.01 ? 4 : value < 1 ? 3 : 2);

    let budgetAlertsCache, balanceAlertsCache;
    // Remember budget crossings independently for today and each conversation.
    function budgetThresholds({ now, sessionId, daily, session, budgetDaily, budgetSession }) {
      const day = dayKey(now), oldest = rangeDays(now, 62)[0];
      let state = budgetAlertsCache;
      if (!state) try { state = JSON.parse(localStorage.getItem("rhine-splash:budget-alerts")); } catch {}
      const levels = (value) => Array.isArray(value) ? value.filter((level) => level === 80 || level === 100) : [];
      const ids = Object.fromEntries(Object.entries(state?.ids || {}).filter(([, entry]) => typeof entry?.day === "string" && entry.day >= oldest)
        .map(([id, entry]) => [id, { day: entry.day, levels: levels(entry.levels) }]));
      state = { day, daily: state?.day === day ? levels(state.daily) : [], ids };
      const alerts = [];
      // Levels crossed together (a jump past both) alert once, at the highest.
      const check = (scope, spent, limit, fired) => {
        if (!(limit > 0) || !Number.isFinite(spent)) return;
        let crossed = 0;
        for (const level of [80, 100]) if (spent >= limit * level / 100 && !fired.includes(level)) {
          fired.push(level);
          crossed = level;
        }
        if (crossed) alerts.push({ scope, level: crossed, spent, limit });
      };
      check("daily", daily, budgetDaily, state.daily);
      if (sessionId) {
        const entry = Object.hasOwn(ids, sessionId) ? ids[sessionId] : { day, levels: [] };
        entry.day = day;
        check("session", session, budgetSession, entry.levels);
        ids[sessionId] = entry;
      }
      budgetAlertsCache = state;
      records.queue({ type: "alerts", budget: state });
      try { localStorage.setItem("rhine-splash:budget-alerts", JSON.stringify(state)); } catch {}
      return alerts;
    }

    function validateRunLog(value) {
      const empty = { v: 1, days: {} }, retained = new Set(rangeDays(Date.now(), 62));
      if (value?.v !== 1 || !value.days || typeof value.days !== "object" || Array.isArray(value.days)) return empty;
      empty.days = Object.fromEntries(Object.entries(value.days).filter(([day, row]) => retained.has(day)
        && row && Number.isInteger(row.runs) && row.runs > 0 && Number.isFinite(row.ms) && row.ms >= 1000
        && Number.isFinite(row.longest) && row.longest >= 1000 && row.longest <= row.ms));
      return empty;
    }
    function recordAlerts(value) {
      const levels = (list) => Array.isArray(list) ? list.filter((n) => n === 80 || n === 100) : [];
      const day = (key) => typeof key === "string" && /^\d{4}-\d{2}-\d{2}$/.test(key) && dayKey(new Date(key + "T12:00:00")) === key;
      return { budget: day(value?.budget?.day) ? { day: value.budget.day, daily: levels(value.budget.daily),
        ids: Object.fromEntries(Object.entries(value.budget.ids || {}).filter(([, row]) => day(row?.day)).map(([id, row]) => [id, { day: row.day, levels: levels(row.levels) }])) } : null,
        balance: Number.isFinite(value?.balance?.limit) && value.balance.limit >= 0 && typeof value.balance.fired === "boolean" ? value.balance : null };
    }
    const records = (() => {
      let snapshot = { mode: "browser" }, rev = -1, active = false, sending = false, reading = false, initializing = false;
      let queue = [], timer, poll, retry, generation = 0, writes = 0;
      const listeners = new Set(), headers = { "x-rhine-splash": "1", "content-type": "application/json" };
      const mirror = (key, value) => { try { localStorage.setItem("rhine-splash:" + key, JSON.stringify(value)); } catch {} };
      const publish = (value) => { snapshot = value; listeners.forEach((fn) => fn()); };
      const browserCopy = () => {
        const ledgers = {};
        let billDays = readDayLog(), runDays = readRunLog(), budget, balance;
        try { billDays = validateDayLog(JSON.parse(localStorage.getItem("rhine-splash:bill-days"))); } catch {}
        try { runDays = validateRunLog(JSON.parse(localStorage.getItem("rhine-splash:run-days"))); } catch {}
        try {
          for (let n = 0; n < localStorage.length; n++) {
            const key = localStorage.key(n);
            if (!key?.startsWith("rhine-splash:bill:")) continue;
            try {
              const value = JSON.parse(localStorage.getItem(key));
              if (validLedger(value)) Object.defineProperty(ledgers, key.slice(18), { value, enumerable: true });
            } catch {}
          }
        } catch {}
        try { budget = JSON.parse(localStorage.getItem("rhine-splash:budget-alerts")); } catch {}
        try { balance = JSON.parse(localStorage.getItem("rhine-splash:balance-alert")); } catch {}
        return { billDays, runDays, ledgers, alerts: recordAlerts({ budget, balance }) };
      };
      const cacheDocument = (doc) => {
        const log = validateDayLog(doc?.billDays);
        if (!doc.ledgers || typeof doc.ledgers !== "object" || Array.isArray(doc.ledgers) || !Object.values(doc.ledgers).every(validLedger)) throw new Error("Invalid record ledgers");
        const runs = validateRunLog(doc.runDays), alerts = recordAlerts(doc.alerts);
        writeDayLog(log); writeRunLog(runs);
        billingLedgers.clear();
        for (const [id, row] of Object.entries(doc.ledgers)) { billingLedgers.set(id, row); mirror("bill:" + id, row); }
        budgetAlertsCache = alerts.budget; balanceAlertsCache = alerts.balance;
        mirror("budget-alerts", alerts.budget); mirror("balance-alert", alerts.balance);
      };
      const replay = (ops) => {
        for (const op of ops) {
          if (op.type === "usage") recordUsage(op.sessionId, { uncachedInputTokens: op.seen.miss, cacheReadTokens: op.seen.hit, outputTokens: op.seen.out }, op.model, op.currency, op.at, false);
          if (op.type === "run") writeRunLog(addRun(readRunLog(), op));
          if (op.type === "alerts") {
            if (Object.hasOwn(op, "budget")) { budgetAlertsCache = op.budget; mirror("budget-alerts", op.budget); }
            if (Object.hasOwn(op, "balance")) { balanceAlertsCache = op.balance; mirror("balance-alert", op.balance); }
          }
        }
      };
      const replace = (value) => {
        cacheDocument(value.doc);
        rev = value.rev;
        publish({ mode: "file", file: value.file });
        usageTick.emit();
      };
      const request = async (ops, full = false) => {
        const response = await fetch("/rhine-splash/records" + (ops || full ? "" : "?rev=" + rev), {
          method: ops ? "POST" : "GET", headers, cache: "no-store", ...(ops ? { body: JSON.stringify({ ops }) } : {})
        });
        if (!response.ok) throw new Error("Records unavailable");
        const value = await response.json();
        if (value?.status !== "ready") throw new Error("Records unavailable");
        return value;
      };
      const fallback = () => {
        queue = []; clearTimeout(timer); clearTimeout(retry); clearInterval(poll);
        publish({ mode: "browser" });
        console.warn("[rhine-splash] Record sync failed; using browser storage.");
      };
      const refresh = async () => {
        if (!active || reading || sending || retry || initializing || queue.length || snapshot.mode !== "file") return;
        reading = true;
        const token = generation, before = writes;
        try {
          const value = await request();
          if (active && generation === token && writes === before && !sending && !retry && !queue.length && !value.unchanged) replace(value);
        } catch {} finally { if (generation === token) reading = false; }
      };
      const schedule = () => { if (active && !initializing && !timer && !sending && !retry && queue.length) timer = setTimeout(() => { timer = undefined; send(); }, 500); };
      const send = async (batch = queue.splice(0, 200), retried = false) => {
        if (!active || !batch.length) return;
        sending = true;
        const token = generation;
        try {
          const value = await request(batch);
          if (!active || generation !== token) return;
          if (!Array.isArray(value.results) || value.results.length !== batch.length || value.results.some((row) => row === null)) throw new Error("Invalid record results");
          value.results.forEach((result, index) => {
            const op = batch[index];
            if (op.type !== "usage" || !validLedger(result?.ledger)) return;
            if (!queue.some((next) => next.type === "usage" && next.sessionId === op.sessionId)) {
              billingLedgers.set(op.sessionId, result.ledger); mirror("bill:" + op.sessionId, result.ledger);
            }
            if (!queue.some((next) => next.type === "usage" && next.day === op.day)) {
              const log = readDayLog(), days = result.currency === log.currency ? { ...log.days } : {};
              if (result.day) days[op.day] = result.day;
              else delete days[op.day];
              writeDayLog(validateDayLog({ v: 1, currency: result.currency, days }));
            }
          });
          usageTick.emit();
        } catch {
          if (!active || generation !== token) return;
          if (!retried) retry = setTimeout(() => { retry = undefined; send(batch, true); }, 5000);
          else fallback();
        } finally {
          if (generation === token) { sending = false; schedule(); }
        }
      };
      return {
        getSnapshot: () => snapshot,
        subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        queue(op) { if (active && snapshot.mode === "file") { writes++; queue.push(JSON.parse(JSON.stringify(op))); schedule(); } },
        refresh,
        start() {
          if (active) return () => {};
          active = true; initializing = true;
          const token = ++generation;
          let old;
          (async () => {
            try {
              let value = await request(undefined, true);
              if (!active || generation !== token) return;
              old = browserCopy();
              // Queue observations from now on; the caches are replaced below.
              rev = value.rev;
              publish({ mode: "file", file: value.file });
              let imported = false;
              try { imported = localStorage.getItem("rhine-splash:records-imported") === "1"; } catch {}
              // Import before the host copy is mirrored over the browser keys, so
              // quitting mid-way never leaves the old records overwritten.
              if (!imported) {
                const origin = globalThis.location?.origin || "null";
                const reply = await request([{ type: "import", origin, ...old }]);
                if (!active || generation !== token) return;
                if (!reply.results?.[0]) throw new Error("Import failed");
                value = await request(undefined, true);
                if (!active || generation !== token) return;
              }
              replace(value);
              replay(queue);
              if (!imported) try { localStorage.setItem("rhine-splash:records-imported", "1"); } catch {}
              poll = setInterval(refresh, 60000);
            } catch {
              if (active && generation === token) {
                publish({ mode: "browser" });
                if (old) { cacheDocument(old); replay(queue); usageTick.emit(); }
                queue = [];
              }
            }
            finally { if (generation === token) { initializing = false; schedule(); } }
          })();
          window.addEventListener("focus", refresh);
          return () => {
            active = false; generation++; queue = []; sending = false; reading = false; initializing = false;
            clearTimeout(timer); clearTimeout(retry); clearInterval(poll); timer = retry = poll = undefined;
            window.removeEventListener("focus", refresh);
          };
        }
      };
    })();

    // Share one balance response and polling lifecycle across billing surfaces.
    const balance = (() => {
      let snapshot = { status: "loading", value: null }, loader = () => {}, users = 0, cleanup;
      const listeners = new Set();
      const publish = (value) => { snapshot = value; listeners.forEach((fn) => fn()); };
      return {
        getSnapshot: () => snapshot,
        subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        refresh: () => loader(),
        start() {
          if (users++ === 0) {
            let active = true, pending = false;
            const controller = new AbortController();
            loader = async () => {
              if (pending || !active) return;
              pending = true;
              try {
                const response = await fetch("/rhine-splash/balance", { cache: "no-store", signal: controller.signal });
                if (!response.ok) throw new Error("Balance unavailable");
                const value = await response.json();
                if (value?.status !== "no-key" && !(value?.status === "ready" && Array.isArray(value.balances) && value.balances.length)) throw new Error("Balance unavailable");
                if (active) publish({ status: value.status, value: value.status === "ready" ? value : snapshot.value });
              } catch { if (active) publish({ ...snapshot, status: "failed" }); }
              finally { pending = false; }
            };
            loader();
            const timer = setInterval(() => { usageTick.emit(); loader(); }, 60000);
            cleanup = () => { active = false; controller.abort(); clearInterval(timer); loader = () => {}; };
          }
          return () => { if (--users === 0) cleanup(); };
        }
      };
    })();

    function isNewer(latest, current) {
      const valid = (value) => typeof value === "string" && /^\d+\.\d+\.\d+$/.test(value);
      if (!valid(latest) || !valid(current)) return false;
      const a = latest.split(".").map(Number), b = current.split(".").map(Number);
      for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
      return false;
    }
    const updates = (() => {
      let snapshot = { latest: null, newer: false }, users = 0, cleanup;
      const listeners = new Set();
      const publish = (latest) => {
        const next = { latest, newer: isNewer(latest, VERSION) };
        if (next.latest === snapshot.latest && next.newer === snapshot.newer) return;
        snapshot = next;
        listeners.forEach((fn) => fn());
      };
      return {
        getSnapshot: () => snapshot,
        subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        start() {
          if (users++ === 0) {
            let active = true, pending = false, record;
            const controller = new AbortController();
            try { record = JSON.parse(localStorage.getItem("rhine-splash:update-check")); } catch {}
            const check = async () => {
              if (!active) return;
              if (live.getSnapshot().updateCheck === false || !VERSION) { publish(null); return; }
              if (pending) return;
              if (Number.isFinite(record?.at) && record.at <= Date.now() && Date.now() - record.at < 86400000) {
                publish(typeof record.latest === "string" && /^\d+\.\d+\.\d+$/.test(record.latest) ? record.latest : null);
                return;
              }
              pending = true;
              // Claim the slot first so other windows do not ask at the same time;
              // a failed check keeps the last answer and retries in an hour.
              const last = typeof record?.latest === "string" ? record.latest : null;
              record = { at: Date.now(), latest: last };
              try { localStorage.setItem("rhine-splash:update-check", JSON.stringify(record)); } catch {}
              try {
                const response = await fetch("/rhine-splash/update", {
                  headers: { "x-rhine-splash": "1" }, cache: "no-store", signal: controller.signal
                });
                if (!response.ok) throw new Error("Update unavailable");
                const value = await response.json();
                if (!(value?.status === "ready" && typeof value.latest === "string" && /^\d+\.\d+\.\d+$/.test(value.latest))) throw new Error("Update unavailable");
                record.latest = value.latest;
              } catch { record.at = Date.now() - 82800000; }
              finally { pending = false; }
              if (!active) return;
              try { localStorage.setItem("rhine-splash:update-check", JSON.stringify(record)); } catch {}
              publish(live.getSnapshot().updateCheck === false ? null : record.latest);
            };
            const guarded = () => { check().catch((error) => compat.report("settings", "crashed", String(error?.message || error))); };
            const unsubscribe = live.subscribe(guarded);
            const timer = setInterval(guarded, 60000);
            guarded();
            cleanup = () => { active = false; controller.abort(); unsubscribe(); clearInterval(timer); };
          }
          return () => { if (--users === 0) cleanup(); };
        }
      };
    })();

    function balanceAlertStep({ total, limit, state }) {
      const low = limit > 0 && total < limit;
      const alert = low && !(state?.fired && state.limit === limit);
      return { alert, low, state: { limit, fired: low } };
    }
    function balanceLow(snapshot, limit) {
      const main = preferredBalances(snapshot?.value)[0];
      return (snapshot?.status === "ready" || snapshot?.status === "failed") && !!main && limit > 0 && Number(main.total) < limit;
    }

    // Classify a conversation by its highest-priority to-do state.
    function todoKind(status) {
      return status?.pendingInteraction ? "pending" : status?.running === true ? "running"
        : status?.completionUnread === true ? "done" : null;
    }

    // Format the age of a known state timestamp.
    function todoAgo(at, now, t) {
      if (!Number.isFinite(at)) return "";
      const age = now - at;
      if (age < 60000) return t("todoNow");
      const unit = age < 3600000 ? 60000 : age < 86400000 ? 3600000 : 86400000;
      const key = age < 3600000 ? "todoMin" : age < 86400000 ? "todoHour" : "todoDay";
      return fill(t(key), { n: Math.max(1, Math.floor(age / unit)) });
    }

    // Build newest-first to-do groups from session status and list metadata.
    function todoGroups(statusMap, list, since, now, t) {
      const groups = { pending: [], done: [], running: [], count: 0 };
      for (const [id, status] of statusMap) {
        if (!Object.hasOwn(list.byId, id)) continue;
        const row = list.byId[id];
        if (row.origin === "subagent" || row.blank) continue;
        const kind = todoKind(status);
        if (kind === null) continue;
        const interaction = status.pendingInteraction;
        const label = kind === "pending"
          ? interaction.kind === "question" ? t("todoQuestion")
            : interaction.kind === "plan-review" ? t("todoPlan")
            : typeof interaction.toolName === "string" ? fill(t("todoApprovalTool"), { tool: interaction.toolName }) : t("todoApproval")
          : t(kind === "done" ? "todoFinished" : "todoRunning");
        let at = since.get(id)?.at;
        if (!Number.isFinite(at)) {
          at = kind !== "running"
            ? typeof row.updatedAt === "string" ? Date.parse(row.updatedAt) : row.updatedAt
            : null;
        }
        if (!Number.isFinite(at)) at = null;
        groups[kind].push({
          id, kind, title: row.title || row.displayTitle || t("ntfUntitled"),
          status: label, at, time: todoAgo(at, now, t)
        });
      }
      for (const kind of ["pending", "done", "running"]) {
        groups[kind].sort((a, b) => a.at === b.at ? 0 : a.at === null ? 1 : b.at === null ? -1 : b.at - a.at);
      }
      groups.count = groups.pending.length + groups.done.length;
      return groups;
    }

    function RowStatusTime({ sessionId, t, status, list }) {
      const config = useLive();
      const states = React.useSyncExternalStore(
        React.useCallback((fn) => status.subscribe(fn), [status]), () => status.getSnapshot()
      );
      const rows = React.useSyncExternalStore(
        React.useCallback((fn) => list.subscribe(fn), [list]), () => list.getSnapshot()
      );
      const [now, setNow] = React.useState(Date.now());
      React.useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(timer);
      }, []);
      const kind = todoKind(states.get(sessionId));
      if (config.rowStatus === false || kind === null) return null;
      const tracked = statusTimes.get(sessionId), row = rows?.byId?.[sessionId];
      const at = tracked?.kind === kind && tracked.at !== null ? tracked.at
        : typeof row?.updatedAt === "string" ? Date.parse(row.updatedAt) : row?.updatedAt;
      if (!Number.isFinite(at)) return null;
      const text = now - at < 60000 ? t({ pending: "rowJustPending", running: "rowJustRunning", done: "rowJustDone" }[kind])
        : fill(t({ pending: "rowPending", running: "rowRunning", done: "rowDone" }[kind]), { time: todoAgo(at, now, t) });
      return jsx("div", { className: "rl-row-time", "data-kind": kind, children: text });
    }

    // Fixed model slots: colour follows the model, never its rank.
    function modelSlot(model) {
      if (typeof model === "string" && (model.startsWith("deepseek-v4-flash") || model === "deepseek-flash")) return 1;
      if (typeof model === "string" && model.startsWith("deepseek-v4-pro")) return 2;
      return 3;
    }
    // Round a chart maximum up to 1, 2 or 5 × 10^n so the ticks read cleanly.
    function niceMax(value) {
      if (!(value > 0)) return 1;
      const step = Math.pow(10, Math.floor(Math.log10(value)));
      return [1, 2, 2.5, 5, 10].map((k) => k * step).find((k) => k >= value);
    }
    const compactMoney = (value, currency) => (currency === "USD" ? "$" : "¥") + (value === 0 ? "0" : value >= 100 ? String(Math.round(value)) : String(Number(value.toPrecision(value >= 1 ? 3 : 2))));
    const tokenText = (value) => value >= 1e6 ? (value / 1e6).toFixed(value >= 1e7 ? 0 : 1) + "M" : value >= 1e3 ? Math.round(value / 1e3) + "K" : String(Math.round(value));
    const percent = (value) => (value >= 0.1 || value === 0 ? Math.round(value * 100) : (value * 100).toFixed(1)) + "%";

    // One column chart: stacked segments per column, a tooltip that follows the
    // pointer or the arrow keys, an optional threshold line and a table twin.
    function CostColumns({ columns, series, currency, label, labels, threshold, thresholdLabel, band, bandLabel, table, t }) {
      const [active, setActive] = React.useState(null);
      const max = niceMax(Math.max(threshold || 0, ...columns.map((column) => column.total)));
      const money = (value) => moneyText(value, currency);
      const ticks = [max, max / 2, 0];
      const pick = active === null ? null : columns[active];
      const onKeyDown = (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const last = columns.length - 1, current = active ?? last;
        setActive(event.key === "Home" ? 0 : event.key === "End" ? last : Math.max(0, Math.min(last, current + (event.key === "ArrowLeft" ? -1 : 1))));
      };
      if (table) return jsx("div", { className: "rl-cp-tablewrap", children: jsxs("table", { className: "rl-cp-table", children: [
        jsx("thead", { children: jsxs("tr", { children: [jsx("th", { children: labels.head }), ...series.map((entry) => jsx("th", { className: "rl-cp-num", children: entry.label }, entry.key)), series.length > 1 ? jsx("th", { className: "rl-cp-num", children: t("cpTotalCol") }) : null] }) }),
        jsx("tbody", { children: [...columns].reverse().map((column) => jsxs("tr", { children: [
          jsx("td", { children: column.label }),
          ...series.map((entry) => jsx("td", { className: "rl-cp-num", children: money(column.parts[entry.key] || 0) }, entry.key)),
          series.length > 1 ? jsx("td", { className: "rl-cp-num", children: money(column.total) }) : null
        ] }, column.key)) })
      ] }) });
      return jsxs("div", { className: "rl-cp-plot", "data-count": columns.length, children: [
        jsx("div", { className: "rl-cp-yaxis", "aria-hidden": "true", children: ticks.map((tick) => jsx("span", { children: compactMoney(tick, currency) }, tick)) }),
        jsxs("div", { className: "rl-cp-area", role: "img", tabIndex: 0, "aria-label": label,
          onKeyDown, onFocus: () => setActive((current) => current ?? columns.length - 1), onBlur: () => setActive(null), onPointerLeave: () => setActive(null), children: [
            ticks.filter((tick) => tick > 0).map((tick) => jsx("i", { className: "rl-cp-rule", style: { "--y": String(tick / max) } }, "g" + tick)),
            band ? jsx("div", { className: "rl-cp-bands", "aria-hidden": "true", children: columns.map((column, index) => jsx("i", { "data-on": band[index] ? "true" : undefined }, column.key)) }) : null,
            jsx("div", { className: "rl-cp-cols", children: columns.map((column, index) => jsx("div", { className: "rl-cp-col", "data-active": active === index ? "true" : undefined, "data-mark": column.mark,
              onPointerEnter: () => setActive(index), children: jsx("div", { className: "rl-cp-stack", style: { "--h": String(column.total / max) },
                children: series.filter((entry) => column.parts[entry.key] > 0).map((entry) => jsx("i", { "data-slot": entry.slot, style: { flexGrow: column.parts[entry.key] } }, entry.key)) }) }, column.key)) }),
            threshold > 0 ? jsx("div", { className: "rl-cp-line", style: { "--y": String(threshold / max) }, children: jsx("span", { children: thresholdLabel }) }) : null,
            pick ? jsxs("div", { className: "rl-cp-tip", role: "status", style: { "--x": String((active + 0.5) / columns.length) }, "data-edge": active < columns.length / 2 ? "start" : "end", children: [
              jsx("b", { children: money(pick.total) }), jsx("span", { className: "rl-cp-tip-k", children: pick.title }),
              series.length > 1 ? series.filter((entry) => pick.parts[entry.key] > 0).map((entry) => jsxs("span", { className: "rl-cp-tip-row", children: [
                jsx("i", { "data-slot": entry.slot }), jsx("span", { children: entry.label }), jsx("span", { className: "rl-cp-num", children: money(pick.parts[entry.key]) })
              ] }, entry.key)) : null
            ] }) : null
          ] }),
        jsx("div", { className: "rl-cp-xaxis", "aria-hidden": "true", children: labels.ticks.map(([index, text]) => jsx("span", { style: { "--x": String((index + 0.5) / columns.length) }, children: text }, index)) }),
        bandLabel ? jsx("div", { className: "rl-cp-key", children: jsxs("span", { children: [jsx("i", { "data-band": "true" }), bandLabel] }) }) : null
      ] });
    }

    // The billing page: one range filter scoping every figure below it.
    function CostPage({ t, sessions, workspaces, open, saveSetting, getNavigation, back }) {
      const config = useLive();
      const list = React.useSyncExternalStore(
        React.useCallback((fn) => sessions.list.subscribe(fn), [sessions]),
        React.useCallback(() => sessions.list.getSnapshot(), [sessions])
      );
      const spaces = React.useSyncExternalStore(
        React.useCallback((fn) => workspaces ? workspaces.list.subscribe(fn) : () => {}, [workspaces]),
        React.useCallback(() => workspaces ? workspaces.list.getSnapshot() : null, [workspaces])
      );
      const balanceState = React.useSyncExternalStore(balance.subscribe, balance.getSnapshot);
      React.useSyncExternalStore(usageTick.subscribe, usageTick.getSnapshot);
      const [range, setRange] = React.useState(() => ({ "1": 1, "7": 7, "30": 30, "62": 62 })[storage.get("rhine-splash:cost-range")] || 7);
      const [now, setNow] = React.useState(Date.now());
      const [table, setTable] = React.useState(false);
      const [all, setAll] = React.useState(false);
      const [editing, setEditing] = React.useState(null);
      const editingRef = React.useRef(null);
      React.useEffect(() => balance.start(), []);
      React.useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(timer);
      }, []);
      React.useEffect(() => { if (config.billing === false) back(); }, [config.billing]);
      if (config.billing === false) return null;

      const log = readDayLog();
      const report = costReport({ log, now, range, list, workspaces: spaces, ledgers: readLedger, budgets: { daily: config.budgetDaily || 0, session: config.budgetSession || 0 } });
      const low = balanceLow(balanceState, config.balanceAlert);
      const balances = preferredBalances(balanceState.value);
      const currency = Object.keys(log.days).length ? report.currency : balances[0]?.currency || report.currency;
      const money = (value) => moneyText(value, currency);
      const symbol = (code) => code === "USD" ? "$" : "¥";
      const peak = isPeak(now);
      const rangeLabel = t({ 1: "costToday", 7: "costRange7", 30: "costRange30", 62: "cpRange62" }[range]);
      const empty = report.total === 0;

      // Figures.
      const delta = report.previous === null ? t("cpNoPrevious")
        : report.previous === 0 ? (report.total > 0 ? t("cpPrevZero") : t("cpNoChange"))
        : fill(t(range === 1 ? "cpVsYesterday" : "cpVsPrev"), { change: (report.total >= report.previous ? "+" : "−") + percent(Math.abs(report.total / report.previous - 1)) });
      const trend = report.previous ? (report.total > report.previous ? "up" : report.total < report.previous ? "down" : null) : null;
      const avg7 = costSummary(log, billingLedgers, now, 7).range / 7;
      const main = balances.find((entry) => entry.currency === currency) || balances[0];
      const showBalance = balanceState.status === "ready" || (balanceState.status === "failed" && balances.length > 0);
      const runway = showBalance && main && avg7 > 0 && main.currency === currency ? Math.floor(Number(main.total) / avg7) : null;
      const offShare = report.peak.known ? report.peak.offPeak / report.peak.known : 0;
      const tiles = [
        { kind: "total", label: fill(t("cpSpent"), { range: rangeLabel }), value: money(report.total), note: delta, trend },
        // A single day has no average; count the conversations that spent instead.
        range === 1 ? { kind: "average", label: t("cpConvs"), value: String(report.sessions.length), note: report.sessions.length ? fill(t("cpPerConv"), { amount: money(report.total / report.sessions.length) }) : "" }
          : { kind: "average", label: t("cpAverage"), value: money(report.average), note: fill(t("cpActive"), { n: report.activeDays }) },
        { kind: "cache", label: t("cpHitRate"), value: report.tokens.hit + report.tokens.miss ? percent(report.hitRate) : "—", note: report.cacheSaved > 0 ? fill(t("cpCacheSaved"), { amount: money(report.cacheSaved) }) : t("cpCacheNone") },
        { kind: "offpeak", label: t("cpOffPeak"), value: report.peak.known ? money(report.peak.offPeak) : "—", note: report.peak.known ? fill(t("cpOffPeakShare"), { pct: percent(offShare) }) : t("cpTrackedFrom") },
        { kind: "balance", label: t("billBalance"), value: showBalance && main ? symbol(main.currency) + Number(main.total).toFixed(2) : balanceState.status === "no-key" ? t("billNoKey") : balanceState.status === "failed" ? t("billFailed") : "—",
          note: runway === null ? (showBalance && main ? fill(t("billSplit"), { granted: symbol(main.currency) + Number(main.granted).toFixed(2), toppedUp: symbol(main.currency) + Number(main.toppedUp).toFixed(2) }) : "") : fill(t("cpRunway"), { n: runway }) }
      ];

      // Spending over time: days by model, or today's hours.
      const models = report.models.map((row) => row.model);
      const slotLabel = (slot) => slot === 3 ? t("cpOther") : models.find((model) => modelSlot(model) === slot) || t("cpOther");
      const slots = [1, 2, 3].filter((slot) => models.some((model) => modelSlot(model) === slot));
      const series = slots.map((slot) => ({ key: String(slot), slot, label: slotLabel(slot) }));
      const today = dayKey(now);
      const shortDay = (day) => day.slice(5).split("-").map(Number).join("/");
      const dayColumns = report.days.map((row) => {
        const parts = {};
        for (const [model, cost] of Object.entries(row.models || {})) parts[modelSlot(model)] = (parts[modelSlot(model)] || 0) + cost;
        return { key: row.day, label: shortDay(row.day), title: row.day === today ? t("costToday") + " · " + shortDay(row.day) : shortDay(row.day), total: row.cost, parts, mark: row.day === today ? "today" : undefined };
      });
      const hourColumns = (hours) => hours.map((cost, hour) => ({ key: "h" + hour, label: String(hour).padStart(2, "0") + ":00", title: String(hour).padStart(2, "0") + ":00–" + String(hour + 1).padStart(2, "0") + ":00", total: cost, parts: { h: cost } }));
      const hourly = range === 1;
      const timeline = hourly ? hourColumns(report.hours) : dayColumns;
      const timeTicks = hourly ? [[0, "00"], [6, "06"], [12, "12"], [18, "18"], [23, "23"]]
        : [[0, dayColumns[0].label], ...(range > 7 ? [[Math.floor((range - 1) / 2), dayColumns[Math.floor((range - 1) / 2)].label]] : []), [range - 1, t("costToday")]];

      // Where the money goes, by token bucket.
      const splitTotal = report.split.miss + report.split.hit + report.split.out;
      const buckets = [["out", t("cpOut")], ["miss", t("cpMiss")], ["hit", t("cpHit")]].map(([key, label]) => ({ key, label, cost: report.split[key], tokens: report.tokens[key], share: splitTotal ? report.split[key] / splitTotal : 0 }));
      const lead = buckets.reduce((best, row) => row.cost > best.cost ? row : best, buckets[0]);

      // Budgets, edited in place through the same settings store.
      const edit = (value) => { editingRef.current = value; setEditing(value); };
      const save = async () => {
        const draft = editingRef.current;
        if (!draft || draft.saving) return;
        const parsed = specs().find((entry) => entry.field === draft.field).parse(draft.text);
        if (!parsed) { edit({ ...draft, invalid: true, error: t("invalidMoney") }); return; }
        const saving = { ...draft, saving: true };
        edit(saving);
        try {
          await saveSetting(draft.field, parsed.value);
          if (editingRef.current === saving) edit(null);
        } catch (error) {
          if (editingRef.current === saving) edit({ ...draft, invalid: true, error: String(error?.message || error) });
        }
      };
      const limitControl = (field, limit) => editing?.field === field
        ? jsx("input", { className: "rl-cp-input", type: "text", inputMode: "decimal", "aria-label": t(field), autoFocus: true, value: editing.text,
          "aria-invalid": editing.invalid || undefined, title: editing.error, disabled: editing.saving,
          onChange: (event) => edit({ field, text: event.currentTarget.value }), onBlur: save,
          onKeyDown: (event) => {
            if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); edit(null); }
            if (event.key === "Enter") { event.preventDefault(); save(); }
          } })
        : jsx("button", { className: "rl-cp-limit", type: "button", title: t("costLimitEdit"), disabled: !saveSetting,
          onClick: () => edit({ field, text: String(limit) }), children: limit ? fill(t("costLimit"), { amount: money(limit) }) : t("costLimitOff") });
      const dailyLimit = report.budget.daily, dailyRatio = dailyLimit ? report.budget.today / dailyLimit : 0;
      const meterState = (ratio, limit) => !limit ? "off" : ratio >= 1 ? "over" : ratio >= 0.8 ? "warn" : "ok";

      const rows = all ? report.sessions : report.sessions.slice(0, 8);
      const when = (at) => at === null ? "" : new Intl.DateTimeFormat(undefined, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(at));
      const bar = (share, slot) => jsxs("span", { className: "rl-cp-share", children: [
        jsx("span", { className: "rl-cp-share-track", children: jsx("i", { "data-slot": slot, style: { "--w": String(share) } }) }),
        jsx("span", { className: "rl-cp-num", children: percent(share) })
      ] });
      const card = (index, title, extra, children, kind) => jsxs("section", { className: "rl-cp-card", "data-kind": kind, children: [
        jsxs("div", { className: "rl-cp-card-head", children: [jsx("span", { className: "rl-cp-idx", children: String(index).padStart(2, "0") }), jsx("h2", { children: title }), extra || null] }),
        children
      ] });
      const navigation = getNavigation?.();
      // The weekly entry previews the week the button opens: the last full week, or this one so far.
      const weekly = (() => {
        const runs = readRunLog(), last = shiftDay(weekStartOf(now), -7);
        let report = weeklyReport({ log, runs, weekStart: last, now });
        const lastEmpty = report.empty;
        if (lastEmpty) report = weeklyReport({ log, runs, weekStart: weekStartOf(now), now });
        let viewed = null;
        try { viewed = localStorage.getItem("rhine-splash:weekly-viewed") || localStorage.getItem("rhine-splash:weekly-seen"); } catch {}
        const meta = report.empty ? "" : [report.badge && weeklyBadgeText(report, t).name, moneyText(report.total, report.currency)].filter(Boolean).join(" · ");
        return { report, meta, fresh: !lastEmpty && viewed < last };
      })();

      return jsx("div", { className: "rl-cp", children: jsxs("div", { className: "rl-cp-inner", children: [
        jsxs("header", { className: "rl-cp-head", children: [
          jsxs("div", { className: "rl-cp-crumbs", children: [
            jsx("button", { type: "button", className: "rl-cp-back", onClick: back, children: t("cpBack") }),
            jsx("span", { className: "rl-cp-code", children: "RL · BILLING / LOCAL LEDGER · " + String(range).padStart(2, "0") + "D" })
          ] }),
          jsxs("div", { className: "rl-cp-titlebar", children: [
            jsx("h1", { className: "rl-cp-title", children: t("costTitle") }),
            jsx("span", { className: "rl-cp-period", "data-peak": peak ? "true" : undefined, children: peak ? t("billPeak") : t("billOffPeak") + " · " + t("costHalf") }),
            navigation ? jsx("button", { type: "button", className: "rl-cp-btn", onClick: () => navigation.openBundle("dsh-rhine-splash"), children: t("costSettings") }) : null
          ] }),
          jsxs("div", { className: "rl-cp-rangebar", children: [
            jsx("div", { className: "rl-cp-filters", role: "group", "aria-label": t("cpRangeLabel"), children: [1, 7, 30, 62].map((count) => jsx("button", {
              type: "button", "aria-pressed": range === count, onClick: () => { storage.set("rhine-splash:cost-range", String(count)); setRange(count); setAll(false); },
              children: t({ 1: "costToday", 7: "costRange7", 30: "costRange30", 62: "cpRange62" }[count])
            }, count)) }),
            jsxs("button", { type: "button", className: "rl-cp-weekly", onClick: openWeekly, "data-new": weekly.fresh ? "true" : undefined,
              "aria-label": t("wkOpen") + (weekly.meta ? " · " + weekly.meta : ""), children: [
                jsx("span", { className: "rl-cp-weekly-tag", children: "W" + String(weekly.report.week).padStart(2, "0") }),
                jsx("span", { children: t("wkOpen") }),
                weekly.meta && jsx("span", { className: "rl-cp-weekly-meta", children: weekly.meta }),
                jsx("i", { className: "rl-cp-weekly-go" })
              ] })
          ] })
        ] }),
        jsx("div", { className: "rl-cp-kpis", children: tiles.map((tile) => jsxs("div", { className: "rl-cp-kpi", "data-kind": tile.kind, "data-low": tile.kind === "balance" && low ? "true" : undefined, children: [
          jsx("span", { className: "rl-cp-kpi-k", children: tile.label }),
          jsx("b", { className: "rl-cp-kpi-v", children: tile.value }),
          jsx("span", { className: "rl-cp-kpi-d", "data-trend": tile.trend || undefined, children: tile.note })
        ] }, tile.kind)) }),
        card(1, t(hourly ? "cpHourly" : "cpDaily"), jsxs(React.Fragment, { children: [
          series.length > 1 && !hourly ? jsx("div", { className: "rl-cp-legend", children: series.map((entry) => jsxs("span", { children: [jsx("i", { "data-slot": entry.slot }), entry.label] }, entry.key)) }) : null,
          jsx("div", { className: "rl-cp-toggle", role: "group", "aria-label": t("cpView"), children: [[false, "cpChart"], [true, "cpTable"]].map(([value, key]) =>
            jsx("button", { type: "button", "aria-pressed": table === value, onClick: () => setTable(value), children: t(key) }, key)) })
        ] }), empty ? jsx("p", { className: "rl-cp-empty", children: t("cpNoData") }) : jsx(CostColumns, {
          columns: timeline, series: hourly ? [{ key: "h", slot: 0, label: t("cpTotalCol") }] : series, currency, table, t,
          label: t(hourly ? "cpHourly" : "cpDaily") + " · " + rangeLabel + " " + money(report.total),
          labels: { head: t(hourly ? "cpHour" : "cpDate"), ticks: timeTicks },
          threshold: hourly ? 0 : dailyLimit, thresholdLabel: fill(t("cpBudgetLine"), { amount: money(dailyLimit) })
        }), "time"),
        card(2, t("costByModel"), null, report.models.length ? jsx("div", { className: "rl-cp-tablewrap", children: jsxs("table", { className: "rl-cp-table rl-cp-models", children: [
            jsx("thead", { children: jsxs("tr", { children: [jsx("th", { children: t("cpModel") }), jsx("th", { className: "rl-cp-num", children: t("cpCost") }), jsx("th", { children: t("cpShare") }),
              jsx("th", { className: "rl-cp-num", children: t("cpHitRateCol") }), jsx("th", { className: "rl-cp-num", children: t("cpPerMillion") })] }) }),
            jsx("tbody", { children: report.models.map((row) => jsxs("tr", { title: fill(t("costTokens"), { miss: Math.trunc(row.miss).toLocaleString(), hit: Math.trunc(row.hit).toLocaleString(), out: Math.trunc(row.out).toLocaleString() }), children: [
              jsx("td", { children: jsxs("span", { className: "rl-cp-model", children: [jsx("i", { "data-slot": modelSlot(row.model) }), row.model] }) }),
              jsx("td", { className: "rl-cp-num rl-cp-strong", children: money(row.cost) }),
              jsx("td", { children: bar(row.share, modelSlot(row.model)) }),
              jsx("td", { className: "rl-cp-num", children: row.hit + row.miss ? percent(row.hitRate) : "—" }),
              jsx("td", { className: "rl-cp-num", children: row.perMillion ? money(row.perMillion) : "—" })
            ] }, row.model)) })
          ] }) }) : jsx("p", { className: "rl-cp-empty", children: t("cpNoData") }), "models"),
        jsxs("div", { className: "rl-cp-grid", children: [
          card(3, t("cpSplit"), null, splitTotal ? jsxs(React.Fragment, { children: [
            jsx("p", { className: "rl-cp-lead", children: fill(t("cpSplitLead"), { name: lead.label, pct: percent(lead.share) }) }),
            jsx("div", { className: "rl-cp-bars", children: buckets.map((row) => jsxs("div", { className: "rl-cp-barrow", children: [
              jsxs("div", { className: "rl-cp-barhead", children: [jsx("span", { children: row.label }), jsx("span", { className: "rl-cp-num rl-cp-strong", children: money(row.cost) })] }),
              jsx("div", { className: "rl-cp-share-track rl-cp-share-track--wide", children: jsx("i", { style: { "--w": String(row.share) } }) }),
              jsx("div", { className: "rl-cp-barfoot", children: fill(t("cpTokensShare"), { tokens: tokenText(row.tokens), pct: percent(row.share) }) })
            ] }, row.key)) }),
            report.cacheSaved > 0 ? jsx("p", { className: "rl-cp-note", children: fill(t("cpCacheNote"), { amount: money(report.cacheSaved), rate: percent(report.hitRate) }) }) : null
          ] }) : jsx("p", { className: "rl-cp-empty", children: t("cpNoData") }), "split"),
          card(4, t("cpHours"), report.hoursKnown ? jsx("span", { className: "rl-cp-aside", children: report.peak.known ? fill(t("cpHoursNote"), { peak: percent(1 - offShare), off: percent(offShare) }) : "" }) : null,
            report.hoursKnown ? jsxs(React.Fragment, { children: [
              jsx(CostColumns, { columns: hourColumns(report.hours), series: [{ key: "h", slot: 0, label: t("cpTotalCol") }], currency, t,
                label: t("cpHours") + " · " + rangeLabel, labels: { head: t("cpHour"), ticks: [[0, "00"], [6, "06"], [12, "12"], [18, "18"], [23, "23"]] },
                band: report.peakHours, bandLabel: t("cpPeakBand") }),
              report.hoursKnown < report.total * 0.995 ? jsx("p", { className: "rl-cp-note", children: fill(t("cpHoursPartial"), { pct: percent(report.hoursKnown / report.total) }) }) : null
            ] }) : jsx("p", { className: "rl-cp-empty", children: t("cpHoursEmpty") }), "hours")
        ] }),
        card(5, t("cpTop"), report.sessions.length > 8 ? jsx("button", { type: "button", className: "rl-cp-link", onClick: () => setAll(!all), children: all ? t("cpShowLess") : fill(t("cpShowAll"), { n: report.sessions.length }) }) : null,
          report.sessions.length ? jsx("div", { className: "rl-cp-tablewrap", children: jsxs("table", { className: "rl-cp-table rl-cp-convs", children: [
            jsx("thead", { children: jsxs("tr", { children: [jsx("th", { children: t("cpConv") }), jsx("th", { children: t("cpWorkspace") }), jsx("th", { children: t("cpModel") }),
              jsx("th", { className: "rl-cp-num", children: t("cpCost") }), jsx("th", { children: t("cpShare") }), jsx("th", { className: "rl-cp-num", children: t("cpLast") })] }) }),
            jsx("tbody", { children: rows.map((row) => {
              const available = Object.hasOwn(list?.byId || {}, row.id);
              return jsxs("tr", { children: [
                jsx("td", { className: "rl-cp-conv", children: available ? jsx("button", { type: "button", onClick: () => open(row.id), children: row.title || t("ntfUntitled") })
                  : jsx("span", { className: "rl-cp-gone", children: t("cpDeleted") }) }),
                jsx("td", { className: "rl-cp-dim", children: row.workspace || "—" }),
                jsx("td", { className: "rl-cp-dim", children: row.model ? jsxs("span", { className: "rl-cp-model", children: [jsx("i", { "data-slot": modelSlot(row.model) }), row.model] }) : "—" }),
                jsx("td", { className: "rl-cp-num rl-cp-strong", children: money(row.cost) }),
                jsx("td", { children: bar(row.share, 0) }),
                jsx("td", { className: "rl-cp-num rl-cp-dim", children: when(row.at) })
              ] }, row.id);
            }) })
          ] }) }) : jsx("p", { className: "rl-cp-empty", children: t("cpNoData") }), "convs"),
        jsxs("div", { className: "rl-cp-grid", children: [
          card(6, t("costBudget"), null, jsxs("div", { className: "rl-cp-budgets", children: [
            jsxs("div", { className: "rl-cp-meter", "data-state": meterState(dailyRatio, dailyLimit), children: [
              jsxs("div", { className: "rl-cp-barhead", children: [jsx("span", { children: t("budgetDaily") }), limitControl("budgetDaily", dailyLimit)] }),
              jsx("div", { className: "rl-cp-meter-track", children: jsx("i", { style: { "--w": String(Math.min(1, dailyRatio)) } }) }),
              jsx("div", { className: "rl-cp-barfoot", children: dailyLimit ? fill(t("cpTodayOf"), { spent: money(report.budget.today), pct: percent(dailyRatio) }) + (range > 1 ? " · " + fill(t("cpOverDays"), { n: report.budget.overDays }) : "") : t("cpBudgetOff") })
            ] }),
            jsxs("div", { className: "rl-cp-meter", "data-state": report.budget.session ? (report.budget.overSessions ? "over" : "ok") : "off", children: [
              jsxs("div", { className: "rl-cp-barhead", children: [jsx("span", { children: t("budgetSession") }), limitControl("budgetSession", report.budget.session)] }),
              jsx("div", { className: "rl-cp-barfoot", children: report.budget.session ? fill(t("cpOverSessions"), { n: report.budget.overSessions }) : t("cpBudgetOff") })
            ] }),
            jsx("p", { className: "rl-cp-note", children: t("toolsNote") })
          ] }), "budget"),
          report.workspaces.length ? card(7, t("cpByWorkspace"), null, jsx("div", { className: "rl-cp-bars rl-cp-bars--grid", children: report.workspaces.map((row) => jsxs("div", { className: "rl-cp-barrow", children: [
          jsxs("div", { className: "rl-cp-barhead", children: [jsx("span", { className: "rl-cp-ellipsis", children: row.title || t("cpNoWorkspace") }), jsx("span", { className: "rl-cp-num rl-cp-strong", children: money(row.cost) })] }),
          jsx("div", { className: "rl-cp-share-track rl-cp-share-track--wide", children: jsx("i", { style: { "--w": String(row.share) } }) }),
          jsx("div", { className: "rl-cp-barfoot", children: fill(t("cpConvCount"), { n: row.count }) + " · " + percent(row.share) })
        ] }, row.key)) }), "workspaces") : null
        ] }),
        jsx("footer", { className: "rl-cp-foot", children: t("costNote") })
      ] }) });
    }

    const NO_PANEL = { getSnapshot: () => null, subscribe: () => () => {} };
    function BillingWidget({ wide, t, selection, sessions, open, saveSetting, getNavigation, layout }) {
      const config = useLive();
      const selected = React.useSyncExternalStore(
        React.useCallback((fn) => selection.subscribe(fn), [selection]),
        React.useCallback(() => selection.getSnapshot(), [selection])
      );
      const list = React.useSyncExternalStore(
        React.useCallback((fn) => sessions.list.subscribe(fn), [sessions]),
        React.useCallback(() => sessions.list.getSnapshot(), [sessions])
      );
      const panelInfo = layout?.panelInfo || NO_PANEL;
      const panelState = React.useSyncExternalStore(
        React.useCallback((fn) => panelInfo.subscribe(fn), [panelInfo]), () => panelInfo.getSnapshot()
      );
      const active = panelState?.activePanelId === "rhine-cost";
      const balanceState = React.useSyncExternalStore(balance.subscribe, balance.getSnapshot);
      React.useSyncExternalStore(usageTick.subscribe, usageTick.getSnapshot);
      // "page" opens the cost page at once; "popup" (and any dsh without the
      // layout service) shows the small panel, whose chart opens the page.
      const mode = layout && config.costOpen !== "popup" ? "page" : "popup";
      const [isOpen, setOpen] = React.useState(false);
      const [now, setNow] = React.useState(Date.now());
      const [range, setRange] = React.useState(() => storage.get("rhine-splash:cost-range") === "30" ? 30 : 7);
      const [position, setPosition] = React.useState({ left: 8, bottom: 8, max: 200 });
      const [editing, setEditing] = React.useState(null);
      const editingRef = React.useRef(null);
      const triggerRef = React.useRef(null), panelRef = React.useRef(null);
      const visible = wide && config.billing !== false;
      React.useEffect(() => { if (!visible || mode === "page") setOpen(false); }, [visible, mode]);
      React.useLayoutEffect(() => {
        if (!isOpen || !visible) return;
        const place = () => {
          const rect = triggerRef.current?.getBoundingClientRect();
          if (!rect) return;
          setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 348)),
            bottom: window.innerHeight - rect.top + 8, max: Math.max(200, rect.top - 64) });
        };
        place();
        window.addEventListener("resize", place);
        return () => window.removeEventListener("resize", place);
      }, [isOpen, visible]);
      React.useLayoutEffect(() => { if (isOpen) panelRef.current?.focus(); }, [isOpen]);
      const close = () => { editingRef.current = null; setEditing(null); setOpen(false); };
      const escape = (event) => {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        event.preventDefault();
        close();
        triggerRef.current?.focus();
      };
      React.useEffect(() => {
        if (!isOpen || !visible) return;
        const timer = setInterval(() => setNow(Date.now()), 30000);
        const outside = (event) => {
          if (!panelRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) close();
        };
        document.addEventListener("pointerdown", outside, true);
        document.addEventListener("keydown", escape);
        return () => {
          clearInterval(timer);
          document.removeEventListener("pointerdown", outside, true);
          document.removeEventListener("keydown", escape);
        };
      }, [isOpen, visible]);
      if (!visible) return null;
      const sessionId = selected?.sessionId, ledger = sessionId ? readLedger(sessionId) : null;
      const log = readDayLog(), summary = costSummary(log, billingLedgers, now, range);
      const currency = Object.keys(log.days).length ? log.currency : preferredBalances(balanceState.value)[0]?.currency || ledger?.currency || log.currency;
      const money = (value) => moneyText(value, currency);
      const peak = isPeak(isOpen ? now : Date.now()), cost = ledger?.cost;
      const sessionMoney = (value) => moneyText(value, ledger?.currency || currency);
      const costText = cost == null ? "—" : sessionMoney(cost);
      const buckets = ledger?.seen || { miss: 0, hit: 0, out: 0 };
      const costTitle = t("billEstimate") + "\n" + fill(t("billTokens"), Object.fromEntries(
        Object.entries(buckets).map(([key, value]) => [key, Math.trunc(value).toLocaleString()])
      ));
      const symbol = (code) => code === "USD" ? "$" : "¥";
      const low = balanceLow(balanceState, config.balanceAlert);
      const balances = preferredBalances(balanceState.value);
      const showBalance = balanceState.status === "ready" || (balanceState.status === "failed" && balances.length > 0);
      const balanceText = showBalance ? balances.map((entry) => symbol(entry.currency) + Number(entry.total).toFixed(2)).join(" / ")
        : balanceState.status === "no-key" ? t("billNoKey") : balanceState.status === "failed" ? t("billFailed") : "—";
      const balanceTitle = showBalance ? balances.map((entry) => fill(t("billSplit"), {
        granted: symbol(entry.currency) + Number(entry.granted).toFixed(2), toppedUp: symbol(entry.currency) + Number(entry.toppedUp).toFixed(2)
      })).join(" / ") : "";
      const openPage = layout ? () => { close(); layout.selectPanel("rhine-cost"); } : null;
      const toggle = mode === "page" ? () => layout.selectPanel(active ? null : "rhine-cost")
        : () => { if (isOpen) close(); else { setNow(Date.now()); setOpen(true); } };
      const trigger = jsxs("div", { className: "rl-bill", "data-low": low ? "true" : undefined, ref: triggerRef, role: "button", tabIndex: 0,
        ...mode === "page" ? { "aria-current": active ? "page" : undefined, "data-open": active ? "true" : undefined }
          : { "aria-haspopup": "dialog", "aria-expanded": isOpen, "data-open": isOpen ? "true" : undefined },
        "aria-label": t("costOpen"),
        "data-peak": peak ? "true" : undefined, "data-state": balanceState.status,
        onClick: toggle, onKeyDown: (event) => {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(); }
        }, children: [
          jsxs("div", { className: "rl-bill-row rl-bill-row--cost", title: costTitle, children: [
            jsx("span", { className: "rl-bill-k", children: t("billCost") }), jsx("span", { className: "rl-bill-v", children: costText })
          ] }),
          jsxs("div", { className: "rl-bill-row rl-bill-row--balance", "data-low": low ? "true" : undefined, title: low ? fill(t("balanceLowTitle"), { limit: moneyText(config.balanceAlert, balances[0].currency) }) : balanceTitle, children: [
            jsx("span", { className: "rl-bill-k", children: t("billBalance") }), jsx("span", { className: "rl-bill-v", children: balanceText })
          ] }),
          jsx("span", { className: "rl-bill-tag", children: t(peak ? "billPeak" : "billOffPeak") })
        ] });
      if (!isOpen) return trigger;
      const chartLabel = fill(t("costChart"), { range: t(range === 7 ? "costRange7" : "costRange30") });
      const max = Math.max(...summary.days.map((row) => row.cost));
      const top = Object.entries(list.byId).flatMap(([id, row]) => {
        if (row.blank || row.origin === "subagent") return [];
        const entry = readLedger(id);
        const at = typeof row.updatedAt === "string" ? Date.parse(row.updatedAt) : row.updatedAt;
        const recent = Number.isFinite(at) && dayKey(at) >= summary.days[0].day && dayKey(at) <= dayKey(now);
        return entry?.cost > 0 && (summary.sessions.has(id) || recent) ? [{ id, row, ledger: entry }] : [];
      }).sort((a, b) => b.ledger.cost - a.ledger.cost).slice(0, 5);
      const edit = (value) => { editingRef.current = value; setEditing(value); };
      const save = async () => {
        const draft = editingRef.current;
        if (!draft || draft.saving) return;
        const parsed = specs().find((entry) => entry.field === draft.field).parse(draft.text);
        if (!parsed) { edit({ ...draft, invalid: true, error: t("invalidMoney") }); return; }
        const saving = { ...draft, saving: true };
        edit(saving);
        try {
          await saveSetting(draft.field, parsed.value);
          if (editingRef.current === saving) edit(null);
        } catch (error) {
          if (editingRef.current === saving) edit({ ...draft, invalid: true, error: String(error?.message || error) });
        }
      };
      const track = (share) => jsx("div", { className: "rl-cost-track", children: jsx("i", { style: { "--w": String(share) } }) });
      const navigation = getNavigation?.();
      const panel = jsxs("div", { className: "rl-cost-pop", ref: panelRef, role: "dialog", "aria-label": t("costTitle"), tabIndex: -1,
        style: { left: position.left, bottom: position.bottom, "--rl-cost-max": position.max + "px" }, onKeyDown: escape, children: [
          jsxs("div", { className: "rl-cost-head", children: [
            jsx("span", { className: "rl-cost-title", children: t("costTitle") }), jsx("span", { className: "rl-cost-code", children: "RL · BILLING" }),
            jsx("span", { className: "rl-cost-period", "data-peak": peak ? "true" : undefined, children: peak ? t("billPeak") : t("billOffPeak") + " · " + t("costHalf") })
          ] }),
          jsxs("div", { className: "rl-cost-body", children: [
            jsx("div", { className: "rl-cost-tiles", children: [["session", t("billCost"), costText], ["today", t("costToday"), money(summary.today)], ["range", t(range === 7 ? "costRange7" : "costRange30"), money(summary.range)]].map(([kind, label, value]) =>
              jsxs("div", { className: "rl-cost-tile", "data-kind": kind, children: [jsx("span", { className: "rl-cost-k", children: label }), jsx("b", { className: "rl-cost-v", children: value })] }, kind)) }),
            Object.keys(log.days).length ? jsxs(React.Fragment, { children: [
              jsxs("div", { className: "rl-cost-chart-head", children: [
                jsx("span", { className: "rl-cost-sec-label", children: chartLabel }),
                jsx("div", { className: "rl-cost-range", role: "group", "aria-label": t("costTitle"), children: [7, 30].map((count) => jsx("button", {
                  type: "button", "aria-pressed": range === count, onClick: () => { storage.set("rhine-splash:cost-range", String(count)); setRange(count); }, children: t(count === 7 ? "costDays7" : "costDays30")
                }, count)) })
              ] }),
              jsx("div", { className: "rl-cost-chart", "data-range": range, "aria-label": chartLabel + ", " + t("costToday") + " " + money(summary.today) + (openPage ? ", " + t("costMore") : ""),
                ...openPage ? { role: "button", tabIndex: 0, title: t("costChartOpen"), onClick: openPage, onKeyDown: (event) => {
                  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openPage(); }
                } } : { role: "img" },
                children: summary.days.map(({ day, cost }) => jsx("i", { className: "rl-cost-bar", style: { "--h": String(max ? cost / max : 0) },
                  "data-today": day === dayKey(now) ? "true" : undefined, title: day.slice(5).replace("-", "/") + " " + money(cost) }, day)) }),
              jsxs("div", { className: "rl-cost-axis", children: [jsx("span", { children: summary.days[0].day.slice(5).split("-").map(Number).join("/") }), jsx("span", { children: t("costToday") })] }),
              summary.models.length > 0 && jsxs("section", { className: "rl-cost-sec", children: [jsx("div", { className: "rl-cost-sec-label", children: t("costByModel") }),
                ...summary.models.map((row) => jsxs(React.Fragment, { children: [
                  jsxs("div", { className: "rl-cost-row", title: fill(t("costTokens"), Object.fromEntries(["miss", "hit", "out"].map((key) => [key, Math.trunc(row[key]).toLocaleString()]))), children: [
                    jsx("span", { className: "rl-cost-name", children: row.model }), jsx("span", { className: "rl-cost-amt", children: money(row.cost) })
                  ] }), track(row.share)
                ] }, row.model))
              ] })
            ] }) : jsx("p", { className: "rl-cost-empty", children: t("costEmpty") }),
            top.length > 0 && jsxs("section", { className: "rl-cost-sec", children: [jsx("div", { className: "rl-cost-sec-label", children: t("costTop") }),
              ...top.map(({ id, row, ledger }) => jsxs("button", { className: "rl-cost-conv", type: "button", onClick: () => { close(); open(id); }, children: [
                jsx("span", { className: "rl-cost-name", children: row.title || row.displayTitle || t("ntfUntitled") }), jsx("span", { className: "rl-cost-amt", children: moneyText(ledger.cost, ledger.currency) })
              ] }, id))
            ] }),
            jsxs("section", { className: "rl-cost-sec rl-cost-budgets", children: [jsx("div", { className: "rl-cost-sec-label", children: t("costBudget") }),
              ...[["budgetDaily", t("costToday"), summary.today], ["budgetSession", t("billCost"), cost ?? 0]].map(([field, label, spent]) => {
                const limit = config[field] || 0, isEditing = editing?.field === field;
                return jsxs("div", { className: "rl-cost-budget", "data-state": limit === 0 ? "off" : spent >= limit ? "over" : spent >= 0.8 * limit ? "warn" : "ok", children: [
                  jsxs("div", { className: "rl-cost-row", children: [
                    jsx("span", { className: "rl-cost-name", children: label }),
                    isEditing ? jsx("input", { className: "rl-cost-input", type: "text", inputMode: "decimal", "aria-label": t(field), autoFocus: true, value: editing.text,
                      "aria-invalid": editing.invalid || undefined, title: editing.error, disabled: editing.saving,
                      onChange: (event) => edit({ field, text: event.currentTarget.value }), onBlur: save,
                      onKeyDown: (event) => {
                        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); edit(null); }
                        if (event.key === "Enter") { event.preventDefault(); save(); }
                      }
                    }) : jsx("button", { className: "rl-cost-limit", type: "button", title: t("costLimitEdit"), disabled: !saveSetting,
                      onClick: () => edit({ field, text: String(limit) }), children: limit ? fill(t("costLimit"), { amount: field === "budgetSession" ? sessionMoney(limit) : money(limit) }) : t("costLimitOff") }),
                    jsx("span", { className: "rl-cost-pct", children: limit ? Math.round(spent / limit * 100) + "%" : "" })
                  ] }), track(limit ? Math.min(1, spent / limit) : 0)
                ] }, field);
              })
            ] })
          ] }),
          jsxs("div", { className: "rl-cost-foot", children: [jsx("span", { className: "rl-cost-balance", "data-low": low ? "true" : undefined, title: balanceTitle, children: t("billBalance") + " " + balanceText }),
            openPage ? jsx("button", { className: "rl-cost-settings rl-cost-more", type: "button", children: t("costMore"), onClick: openPage }) : null,
            navigation ? jsx("button", { className: "rl-cost-settings", type: "button", children: t("costSettings"), onClick: () => { close(); navigation.openBundle("dsh-rhine-splash"); } }) : null
          ] }),
          jsx("p", { className: "rl-cost-note", children: t("costNote") })
        ] });
      return jsxs(React.Fragment, { children: [trigger, createPortal(panel, document.body)] });
    }

    // Show the sidebar to-do trigger and its conversation panel.
    function TodoWidget({ wide, t, status, list, selection, since, open }) {
      const config = useLive();
      const statusSnapshot = React.useSyncExternalStore(
        React.useCallback((fn) => status.subscribe(fn), [status]),
        React.useCallback(() => status.getSnapshot(), [status])
      );
      const listSnapshot = React.useSyncExternalStore(
        React.useCallback((fn) => list.subscribe(fn), [list]),
        React.useCallback(() => list.getSnapshot(), [list])
      );
      const selected = React.useSyncExternalStore(
        React.useCallback((fn) => selection.subscribe(fn), [selection]),
        React.useCallback(() => selection.getSnapshot(), [selection])
      );
      const [isOpen, setOpen] = React.useState(false);
      const [now, setNow] = React.useState(Date.now());
      const [position, setPosition] = React.useState({ side: "top", left: 8, bottom: 8, max: 160 });
      const triggerRef = React.useRef(null);
      const panelRef = React.useRef(null);
      const groups = todoGroups(statusSnapshot, listSnapshot, since, now, t);
      const selectedId = selected?.sessionId;
      const mode = wide ? "bar" : "rail";
      const tone = groups.pending.length ? "pending" : groups.done.length ? "done" : "idle";

      React.useLayoutEffect(() => {
        if (!isOpen) return;
        const place = () => {
          const rect = triggerRef.current?.getBoundingClientRect();
          if (!rect) return;
          setPosition(mode === "rail" ? {
            side: "right", left: rect.right + 8, bottom: window.innerHeight - rect.bottom,
            max: Math.max(160, rect.bottom - 64)
          } : {
            side: "top", left: Math.max(8, Math.min(rect.left, window.innerWidth - 328)),
            bottom: window.innerHeight - rect.top + 8, max: Math.max(160, rect.top - 64)
          });
        };
        place();
        window.addEventListener("resize", place);
        return () => window.removeEventListener("resize", place);
      }, [isOpen, mode]);

      React.useLayoutEffect(() => {
        if (isOpen) (panelRef.current?.querySelector(".rl-todo-row") || panelRef.current)?.focus();
      }, [isOpen]);

      React.useEffect(() => {
        if (!isOpen) return;
        const timer = setInterval(() => setNow(Date.now()), 30000);
        const outside = (event) => {
          if (!panelRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) setOpen(false);
        };
        const escape = (event) => {
          if (event.key !== "Escape" || event.defaultPrevented) return;
          event.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        };
        document.addEventListener("pointerdown", outside, true);
        document.addEventListener("keydown", escape);
        return () => {
          clearInterval(timer);
          document.removeEventListener("pointerdown", outside, true);
          document.removeEventListener("keydown", escape);
        };
      }, [isOpen]);

      const toggle = () => {
        if (!isOpen) setNow(Date.now());
        setOpen(!isOpen);
      };
      const keys = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
          return;
        }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        const rows = [...panelRef.current.querySelectorAll(".rl-todo-row")];
        if (!rows.length) return;
        event.preventDefault();
        const index = rows.indexOf(document.activeElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? rows.length - 1
          : event.key === "ArrowDown" ? (index + 1) % rows.length
          : index < 0 ? rows.length - 1 : (index - 1 + rows.length) % rows.length;
        rows[next].focus();
      };

      if (config.todoCenter === false) return null;
      const label = t("todoOpen") + " · " + fill(t("todoSummary"), { n: groups.count });
      const { side, left, bottom, max } = position;
      const panel = isOpen ? jsxs("div", {
        className: "rl-todo-pop", role: "dialog", "aria-label": t("todo"), "data-side": side,
        tabIndex: -1, ref: panelRef, onKeyDown: keys, style: { left, bottom, "--rl-todo-max": max + "px" },
        children: [
          jsxs("div", { className: "rl-todo-head", children: [
            jsx("span", { className: "rl-todo-title", children: t("todo") }),
            jsx("span", { className: "rl-todo-code", children: "RL · TODO" }),
            jsx("span", { className: "rl-todo-sum", children: fill(t("todoSummary"), { n: groups.count }) })
          ] }),
          jsxs("div", { className: "rl-todo-list", children: [
            ...["pending", "done", "running"].filter((kind) => groups[kind].length).map((kind) =>
              jsxs("section", { className: "rl-todo-group", "data-kind": kind, children: [
                jsxs("div", { className: "rl-todo-gh", children: [
                  jsx("i", { className: "rl-todo-pip" }),
                  jsx("span", { children: t(kind === "pending" ? "todoPending" : kind === "done" ? "todoDone" : "todoRunning") }),
                  jsx("b", { children: groups[kind].length })
                ] }),
                ...groups[kind].map((row) => jsxs("button", {
                  className: "rl-todo-row", type: "button", "data-kind": kind,
                  "data-current": row.id === selectedId ? "true" : undefined,
                  onClick: () => { setOpen(false); open(row.id); },
                  children: [
                    jsx("i", { className: "rl-todo-bar" }),
                    jsxs("span", { className: "rl-todo-main", children: [
                      jsx("span", { className: "rl-todo-name", title: row.title, children: row.title }),
                      jsx("span", { className: "rl-todo-status", children: row.status })
                    ] }),
                    jsx("span", { className: "rl-todo-time", children: row.time })
                  ]
                }, row.id))
              ] }, kind)
            ),
            !groups.count && !groups.running.length ? jsxs("div", { className: "rl-todo-empty", children: [
              jsx("i", { className: "rl-todo-pip" }),
              jsx("span", { className: "rl-todo-empty-code", children: "ALL CLEAR" }),
              jsx("span", { className: "rl-todo-empty-text", children: t("todoEmpty") })
            ] }) : null
          ] })
        ]
      }) : null;
      return jsxs(React.Fragment, { children: [
        jsxs("button", {
          type: "button", ref: triggerRef, className: "rl-todo-btn", "data-mode": mode, "data-tone": tone,
          "data-running": groups.running.length ? "true" : undefined, "data-open": isOpen ? "true" : undefined,
          "aria-haspopup": "dialog", "aria-expanded": isOpen, "aria-label": label, title: label, onClick: toggle,
          children: mode === "rail" ? [
            jsx("span", { className: "rl-todo-btn-icon", "aria-hidden": true, children: jsx(P.IconChecklistOutlineRegular, {}) }),
            groups.count ? jsx("b", { className: "rl-todo-btn-badge", children: groups.count }) : null
          ] : [
            jsx("span", { className: "rl-todo-btn-tag", children: t("todo") }),
            jsx("span", { className: "rl-todo-btn-n", children: groups.count }),
            jsx("span", { className: "rl-todo-btn-sub", children: groups.running.length ? fill(t("todoRunningCount"), { n: groups.running.length }) : "" }),
            jsx("i", { className: "rl-todo-btn-pip" })
          ]
        }),
        panel ? createPortal(panel, document.body) : null
      ] });
    }

    const storage = {
      get(key) { try { return localStorage.getItem(key); } catch { return null; } },
      set(key, value) { try { localStorage.setItem(key, value); } catch {} }
    };
    function pickRandom(choices, key) {
      const last = storage.get(key);
      const pool = choices.filter((choice) => choice !== last);
      const pick = pool[Math.floor(Math.random() * pool.length)] ?? choices[0];
      storage.set(key, pick);
      return pick;
    }
    function cssString(text) {
      return '"' + String(text).replace(/[\\"\n\r]/g, (c) => "\\" + c.charCodeAt(0).toString(16) + " ") + '"';
    }

    function normalize(input, previous = CONFIG) {
      const next = { ...previous };
      for (const [key, spec] of Object.entries(FIELDS)) {
        const value = spec.aliases?.[input?.[key]] ?? input?.[key];
        const valid = spec.type === "switch" ? typeof value === "boolean"
          : ["choice", "swatch"].includes(spec.type) ? spec.choices.includes(value)
          : spec.type === "color" ? validColor(value)
          : spec.type === "money" ? typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100000
          : spec.type === "number" ? typeof value === "number" && Number.isFinite(value) && value >= (spec.min ?? 0) && value <= (spec.max ?? 15000) && (!spec.integer || Number.isInteger(value))
          : typeof value === "string";
        if (valid) next[key] = value;
      }
      return Object.freeze(next);
    }
    let liveSnapshot = normalize(CONFIG);
    const liveListeners = new Set();
    const live = {
      getSnapshot: () => liveSnapshot,
      subscribe(fn) { liveListeners.add(fn); return () => liveListeners.delete(fn); }
    };
    function applyRoot(config) {
      const root = document.documentElement;
      root.toggleAttribute("data-rl-ui", config.uiTheme !== false);
      if (config.uiTheme !== false && config.rowStatus !== false) root.setAttribute("data-rl-rows", "on");
      else root.removeAttribute("data-rl-rows");
      root.dataset.rlAccent = config.accent;
      root.dataset.rlBase = config.base;
      if (config.accent === "custom") root.style.setProperty("--rl-accent-custom", config.accentColor);
      else root.style.removeProperty("--rl-accent-custom");
    }
    function useLive() { return React.useSyncExternalStore(live.subscribe, live.getSnapshot); }

    function registerLive(ctx, scope) {
      const absent = missing(ctx, ["effect", "configForms.get"]);
      const unavailable = missing(scope, ["getSnapshot", "subscribe"]).map((path) => "configForms.get()." + path);
      if (absent.length || unavailable.length) { compat.report("live", "missing", [...absent, ...unavailable].join(", ")); return; }
      let failed = false;
      const update = () => {
        if (failed) return;
        try {
          const snapshot = scope.getSnapshot();
          if (snapshot.status !== "ready") return;
          const raw = snapshot.value || {};
          // Same migration as the host: an old custom splash accent becomes the
          // custom interface accent. Only raw settings carry the user's value.
          const input = raw.accent === "rhine" && validColor(raw.accentLight) && raw.accentLight.toLowerCase() !== "#e46f24"
            ? { ...raw, accent: "custom", accentColor: raw.accentLight } : raw;
          const next = normalize(input, live.getSnapshot());
          if (Object.keys(next).some((key) => next[key] !== liveSnapshot[key])) {
            liveSnapshot = next;
            liveListeners.forEach((fn) => fn());
          }
          applyRoot(next);
        } catch (error) {
          failed = true;
          compat.report("live", "crashed", String(error?.message || error));
        }
      };
      ctx.effect(() => scope.subscribe(update));
      ctx.effect(() => () => {
        for (const name of ["data-rl-ui", "data-rl-rows", "data-rl-accent", "data-rl-base"]) document.documentElement.removeAttribute(name);
        document.documentElement.style.removeProperty("--rl-accent-custom");
      });
      update();
      compat.ready("live");
    }

    const compatRegistered = new Set();
    const compatListeners = new Set();
    let compatSnapshot = Object.freeze([]);
    // Keep the first failure per feature and a stable, immutable snapshot for React.
    const compat = {
      report(feature, reason, detail) {
        if (compatSnapshot.some((issue) => issue.feature === feature)) return;
        compatSnapshot = Object.freeze([...compatSnapshot, Object.freeze({ feature, reason, detail })]);
        console.warn("rhine-splash: " + feature + " disabled (" + reason + ")", detail);
        compatListeners.forEach((listener) => listener());
      },
      ready(feature) { compatRegistered.add(feature); },
      getSnapshot() { return compatSnapshot; },
      subscribe(listener) { compatListeners.add(listener); return () => compatListeners.delete(listener); },
      reset() {
        compatRegistered.clear();
        if (compatSnapshot.length) {
          compatSnapshot = Object.freeze([]);
          compatListeners.forEach((listener) => listener());
        }
        compatListeners.clear();
      }
    };
    function missing(scope, paths) {
      return paths.filter((path) => typeof path.split(".").reduce((value, key) => value?.[key], scope) !== "function");
    }
    class SafeBoundary extends React.Component {
      state = { failed: false };
      static getDerivedStateFromError() { return { failed: true }; }
      componentDidCatch(error) {
        compat.report(this.props.feature, "crashed", String(error?.message || error));
      }
      render() { return this.state.failed ? null : this.props.children; }
    }
    function safe(feature, Component) {
      return function SafeComponent(props) {
        return jsx(SafeBoundary, { feature, children: jsx(Component, props) });
      };
    }

    // Add the blank conversation background effect.
    function registerHeroBackground(ctx) {
      ctx.effect(() => {
        let random;
        const update = () => {
          try {
            const config = live.getSnapshot();
            const mode = heroBackgrounds.includes(config.heroBackground) ? config.heroBackground : "random";
            const root = document.documentElement;
            if (config.heroMark === "bold") root.dataset.rlMark = "bold";
            else delete root.dataset.rlMark;
            if (mode === "off") {
              delete root.dataset.rlHero;
              root.style.removeProperty("--rl-hb-label");
              return;
            }
            root.dataset.rlHero = mode === "random" ? (random ??= pickRandom(["plain", "diagonal", "horizon", "grid"], "rhine-splash:hero-last")) : mode;
            const code = typeof config.code === "string" && config.code ? config.code : "RL-DSH/0.2";
            root.style.setProperty("--rl-hb-label", cssString(`${code} · TERMINAL READY`));
          } catch (error) { compat.report("brand", "crashed", String(error?.message || error)); }
        };
        const unsubscribe = live.subscribe(update);
        update();
        return () => {
          unsubscribe();
          delete document.documentElement.dataset.rlHero;
          delete document.documentElement.dataset.rlMark;
          document.documentElement.style.removeProperty("--rl-hb-label");
        };
      });
    }

    // Add resume playback, cleanup and window return triggers.
    function registerResume(ctx) {
      let playing = null;
      // Start only once the window is painting again (requestAnimationFrame
      // does not run while it is hidden or occluded) and the OS has finished
      // bringing it forward, so the opening is not played to nobody; remove it
      // when its own animations finish, since their start can lag the append.
      const playResume = (kind, settle = 0) => {
        if (playing || !RESUME_MS[kind] || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const entry = { node: null, timer: 0, frame: 0 };
        playing = entry;
        const finish = () => {
          cancelAnimationFrame(entry.frame);
          clearTimeout(entry.timer);
          entry.node?.remove();
          if (playing === entry) playing = null;
        };
        entry.finish = finish;
        const start = () => {
          if (playing !== entry) return;
          if (document.visibilityState !== "visible") { finish(); return; }
          entry.node = resumeLayer(document, kind);
          document.body.append(entry.node);
          entry.timer = setTimeout(finish, RESUME_MS[kind] + 2000);
          Promise.all(entry.node.getAnimations({ subtree: true }).map((animation) => animation.finished)).then(finish, finish);
        };
        entry.frame = requestAnimationFrame(() => {
          entry.frame = requestAnimationFrame(() => { entry.timer = setTimeout(start, settle); });
        });
      };
      const resumeKind = (mode) => mode === "random" || mode === "off" || !resumeEffects.includes(mode) ? pickRandom(["scan", "iris", "glitch"], "rhine-splash:resume-last") : mode;
      ctx.effect(() => () => { playing?.finish(); });
      ctx.effect(() => {
        const AWAY_MS = 30000;
        let leftAt = 0, wasHidden = false, blurTimer = 0;
        const leave = () => { if (!leftAt) leftAt = Date.now(); };
        const back = () => {
          clearTimeout(blurTimer);
          // Not on screen yet (e.g. focus while still minimized): keep the
          // away state for the visibilitychange that follows.
          if (!leftAt || document.visibilityState !== "visible") return;
          const away = Date.now() - leftAt;
          const hidden = wasHidden;
          leftAt = 0;
          wasHidden = false;
          if (document.getElementById("rhine-splash")) return;
          const config = live.getSnapshot();
          if (config.resumeEffect === "off") return;
          const mode = resumeEffects.includes(config.resumeEffect) ? config.resumeEffect : "random";
          const trigger = resumeTriggers.includes(config.resumeTrigger) ? config.resumeTrigger : "hidden";
          if (trigger === "away" && away < AWAY_MS) return;
          if (trigger === "hidden" && !hidden) return;
          // Minimize / hide / Space returns animate the window in; wait longer.
          playResume(resumeKind(mode), hidden ? 300 : 90);
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
      return { preview: (mode) => playResume(resumeKind(mode)) };
    }

    // Add Rhine notices for completed runs and pending interactions.
    function inQuietHours(date, from, to) {
      const hour = date.getHours();
      return from === to ? false : from < to ? hour >= from && hour < to : hour >= from || hour < to;
    }

    function registerNotify(ctx, t) {
      const on = (key, config = live.getSnapshot()) => config[key] !== false;
      const away = () => document.visibilityState !== "visible" || !document.hasFocus();
      const stamp = () => new Date().toTimeString().slice(0, 5);
      const statusText = (event) => event.status ?? (event.kind === "done" ? t("ntfDone")
        : event.pending === "question" ? t("ntfQuestion") : event.pending === "plan-review" ? t("ntfPlan") : t("ntfApproval"));
      const starts = new Map();
      const cards = new Map();
      const removers = new Map();
      const queued = new Map();
      let lastChime = -Infinity, previewDone = true, disposed = false;
      const dismiss = (card) => {
        if (card.dataset.leaving !== undefined || !removers.has(card)) return;
        card.dataset.leaving = "";
        for (const [id, visible] of cards) if (visible === card) cards.delete(id);
        const cleanup = removers.get(card);
        const remove = () => removers.get(card)?.();
        const finish = (event) => {
          if (event.target === card && !event.pseudoElement) remove();
        };
        card.addEventListener("animationend", finish);
        const timer = setTimeout(remove, 260);
        removers.set(card, () => {
          clearTimeout(timer);
          card.removeEventListener("animationend", finish);
          cleanup();
        });
      };
      const showCard = (event) => {
        if (disposed) return;
        const old = cards.get(event.id);
        if (old) removers.get(old)();
        if (cards.size >= 3) dismiss(cards.values().next().value);
        const card = noticeCard(document, {
          kind: event.kind, title: event.title, status: statusText(event),
          hint: t("ntfOpen"), stamp: stamp(), closeLabel: t("ntfClose")
        });
        let timer = 0;
        const remove = () => {
          clearTimeout(timer);
          card.remove();
          if (cards.get(event.id) === card) cards.delete(event.id);
          removers.delete(card);
        };
        removers.set(card, remove);
        const open = () => { event.open(); dismiss(card); };
        card.addEventListener("click", open);
        card.addEventListener("keydown", (key) => {
          if (key.target === card && (key.key === "Enter" || key.key === " ")) {
            key.preventDefault();
            open();
          }
        });
        card.querySelector(".rl-ntf-close").addEventListener("click", (click) => {
          click.stopPropagation();
          dismiss(card);
        });
        const bar = card.querySelector(".rl-ntf-bar");
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
          timer = setTimeout(() => dismiss(card), NOTICE_MS);
        } else {
          bar.addEventListener("animationend", () => dismiss(card));
        }
        cards.set(event.id, card);
        noticeHost(document).prepend(card);
      };
      // The Windows desktop app's own web notifications never reach the screen (Electron runs without
      // the Start-menu AppUserModelID), so the host sends a native toast under the Harness identity.
      const windowsDesktop = () => globalThis.location?.protocol === "dsh-app:" && document.documentElement?.dataset?.platform === "win32";
      const showToastViaHost = (event) => {
        fetch("/rhine-splash/notify", {
          method: "POST",
          headers: { "content-type": "application/json", "x-rhine-splash": "1" },
          body: JSON.stringify({ title: event.title, body: statusText(event), tag: String(event.id) })
        }).catch(() => {});
        return true;
      };
      const showSystem = (event) => {
        try {
          if (disposed) return false;
          if (windowsDesktop()) return showToastViaHost(event);
          if (!("Notification" in window) || Notification.permission !== "granted") return false;
          const notification = new Notification(event.title, {
            body: statusText(event), tag: "rhine-splash:" + event.id, silent: true
          });
          notification.onclick = () => { window.focus(); event.open(); notification.close(); };
          return true;
        } catch { return false; }
      };
      const chime = (kind, config) => {
        if (!on("notifySound", config) || Date.now() - lastChime < 1500) return;
        lastChime = Date.now();
        playChime(kind);
      };
      const emit = (event, config = live.getSnapshot()) => {
        const quiet = config.quietHours && inQuietHours(new Date(), config.quietFrom, config.quietTo);
        if (away()) {
          const system = !quiet && on("notifySystem", config) && showSystem(event);
          if (on("notifyToast", config)) {
            if (document.visibilityState === "visible") {
              showCard(event);
            } else {
              queued.delete(event.id);
              queued.set(event.id, event);
              if (queued.size > 3) queued.delete(queued.keys().next().value);
            }
          }
          if (!quiet && (system || on("notifyToast", config))) chime(event.kind, config);
        } else if (on("notifyToast", config)) {
          showCard(event);
          if (!quiet) chime(event.kind, config);
        }
      };
      ctx.effect(() => {
        const flush = () => {
          if (away()) return;
          for (const event of queued.values()) showCard(event);
          queued.clear();
        };
        window.addEventListener("focus", flush);
        document.addEventListener("visibilitychange", flush);
        return () => {
          disposed = true;
          window.removeEventListener("focus", flush);
          document.removeEventListener("visibilitychange", flush);
          for (const remove of removers.values()) remove();
          cards.clear();
          queued.clear();
        };
      });
        ctx.inject(["uiSession", "uiWorkspace", "sessions"], (scope) => {
          const absent = missing(scope, ["effect", "uiSession.sessionStatus.getSnapshot", "uiSession.sessionStatus.subscribe", "sessions.list.getSnapshot", "sessions.list.subscribe", "uiWorkspace.selection.getSnapshot", "uiWorkspace.selection.subscribe", "uiWorkspace.openSession"]);
          if (absent.length) { compat.report("notify", "missing", absent.join(", ")); return; }
          let previous = null;
          let failed = false;
          const check = () => {
            if (failed) return;
            try {
              const next = scope.uiSession.sessionStatus.getSnapshot();
              if (previous === null) { previous = next; return; }
              const { byId } = scope.sessions.list.getSnapshot();
              const selected = scope.uiWorkspace.selection.getSnapshot()?.sessionId;
              for (const [id, now] of next) {
                if (!Object.hasOwn(byId, id)) continue;
                const row = byId[id];
                const before = previous.get(id);
                if (now.running && !before?.running) starts.set(id, Date.now());
                const started = starts.get(id);
                if (!now.running) starts.delete(id);
                const short = started !== undefined && !away() && Date.now() - started < (live.getSnapshot().notifyMinRun ?? 10) * 1000;
                const scene = away() ? "notifyAway" : selected === id ? "notifyCurrent" : "notifyOthers";
                if (!on(scene)) continue;
                const title = row.title || row.displayTitle || t("ntfUntitled");
                const open = () => { try { scope.uiWorkspace.openSession(id); } catch {} };
                if (before?.running === true && now.running === false && !now.pendingInteraction && !short) {
                  emit({ id, kind: "done", title, open });
                }
                if (!before?.pendingInteraction && now.pendingInteraction) {
                  emit({ id, kind: "pending", pending: now.pendingInteraction.kind, title, open });
                }
              }
              for (const id of starts.keys()) if (!next.has(id) || !Object.hasOwn(byId, id)) starts.delete(id);
              previous = next;
            } catch (error) {
              failed = true;
              compat.report("notify", "crashed", String(error?.message || error));
            }
          };
          scope.effect(() => scope.uiSession.sessionStatus.subscribe(check));
          check();
          compat.ready("notify");
        });
      return {
        alert(event) {
          try { emit({ ...event, kind: "pending" }); }
          catch (error) { compat.report("notify", "crashed", String(error?.message || error)); }
        },
        preview(config) {
          const kind = previewDone ? "done" : "pending";
          previewDone = !previewDone;
          const event = { id: "preview", kind, pending: "approval", title: t("ntfSample"), open: () => {} };
          if (on("notifyToast", config)) showCard(event);
          if (on("notifySystem", config) && windowsDesktop()) {
            showSystem(event);
          } else if (on("notifySystem", config) && "Notification" in window) {
            if (Notification.permission === "default") {
              Notification.requestPermission().then((state) => {
                if (state === "granted") showSystem(event);
              }).catch(() => {});
            } else {
              showSystem(event);
            }
          }
          chime(kind, config);
        }
      };
    }

    const WHATS_NEW = { "0.2.8": 6 };
    const WELCOME = 5;
    function whatsNewFor({ current, seen, hasHistory }) {
      if (!current || seen === current) return null;
      const welcome = !seen && !hasHistory;
      const count = welcome ? WELCOME : Object.hasOwn(WHATS_NEW, current) ? WHATS_NEW[current] : 0;
      return count ? { kind: welcome ? "welcome" : "update", version: current,
        items: Array.from({ length: count }, (_, i) => "wn_" + (welcome ? "welcome" : current.replaceAll(".", "_")) + "_" + (i + 1)) } : null;
    }
    const whatsNewState = (() => {
      let snapshot = { entry: null };
      const listeners = new Set();
      return {
        getSnapshot: () => snapshot,
        subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        set(entry) { snapshot = { entry }; listeners.forEach((fn) => fn()); }
      };
    })();
    function WhatsNewCard({ t, getNavigation }) {
      const { entry } = React.useSyncExternalStore(whatsNewState.subscribe, whatsNewState.getSnapshot);
      React.useEffect(() => {
        if (!entry) return;
        const escape = (event) => { if (event.key === "Escape") whatsNewState.set(null); };
        document.addEventListener("keydown", escape);
        return () => document.removeEventListener("keydown", escape);
      }, [entry]);
      if (!entry) return null;
      const close = () => whatsNewState.set(null);
      const navigation = getNavigation();
      return createPortal(jsxs("div", { className: "rl-wn", role: "dialog", "aria-modal": "false", "aria-labelledby": "rl-wn-title", "data-kind": entry.kind, children: [
        jsxs("div", { className: "rl-wn-head", children: [
          jsx("span", { className: "rl-wn-tag", children: t("wn_label_" + entry.kind) }),
          jsx("span", { className: "rl-wn-ver", children: "v" + entry.version }),
          jsx("button", { type: "button", className: "rl-wn-x", "aria-label": t("wn_close_aria"), onClick: close, children: "×" })
        ] }),
        jsx("h2", { id: "rl-wn-title", className: "rl-wn-title", children: fill(t("wn_title_" + entry.kind), { version: entry.version }) }),
        jsx("ol", { className: "rl-wn-list", children: entry.items.map((key, i) => jsxs("li", { className: "rl-wn-item", children: [
          jsx("span", { className: "rl-wn-num", children: String(i + 1).padStart(2, "0") }),
          jsx("span", { className: "rl-wn-text", children: t(key) })
        ] }, key)) }),
        jsxs("div", { className: "rl-wn-actions", children: [
          navigation && jsx("button", { type: "button", className: "rl-wn-btn rl-wn-btn--primary", onClick: () => { navigation.openBundle("dsh-rhine-splash"); close(); }, children: t("wn_open") }),
          entry.kind === "update" && jsx("a", { className: "rl-wn-btn", href: "https://github.com/Respawn-ID/dsh-rhine-splash/blob/main/CHANGELOG.md", target: "_blank", rel: "noreferrer", children: t("wn_log") }),
          jsx("button", { type: "button", className: "rl-wn-btn", onClick: close, children: t("wn_ok") })
        ] })
      ] }), document.body);
    }
    function registerWhatsNew(ctx, t) {
      let navigation;
      ctx.inject(["pluginNavigation"], (scope) => {
        if (typeof scope.pluginNavigation?.openBundle !== "function") return;
        navigation = scope.pluginNavigation;
        scope.effect(() => () => { navigation = undefined; });
      });
      ctx.inject(["slots"], (scope) => {
        const absent = missing(scope, ["effect", "slots.inject", "slots.register"]);
        if (absent.length) { compat.report("whatsNew", "missing", absent.join(", ")); return; }
        scope.slots.inject("shell.overlay", () => scope.slots.register({
          name: "shell.overlay", id: "rhine-whats-new", locale: NS, inject: () => ({ getNavigation: () => navigation })
        }, safe("whatsNew", WhatsNewCard)));
        scope.effect(() => {
          let seen, hasHistory = false;
          try {
            seen = localStorage.getItem("rhine-splash:seen-version");
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key?.startsWith("rhine-splash:") && !["rhine-splash:seen-version", "rhine-splash:splash-seen"].includes(key)) { hasHistory = true; break; }
            }
          } catch {}
          const remember = () => { if (VERSION) try { localStorage.setItem("rhine-splash:seen-version", VERSION); } catch {} };
          const entry = whatsNewFor({ current: VERSION, seen, hasHistory });
          if (!entry) { remember(); return; }
          const start = Date.now();
          let timer = 0, waited = -300, elapsed = 0;
          const check = () => {
            try {
              if (document.getElementById("rhine-splash") || document.visibilityState !== "visible") {
                waited = -300;
              } else {
                waited += 300;
                if (waited >= 1200) { remember(); whatsNewState.set(entry); return; }
              }
              elapsed += 300;
              if (elapsed < 20000 && Date.now() - start < 20000) timer = setTimeout(check, 300);
            } catch (error) { compat.report("whatsNew", "crashed", String(error?.message || error)); }
          };
          timer = setTimeout(check, 300);
          return () => { clearTimeout(timer); whatsNewState.set(null); };
        });
      });
    }

    const weeklyState = (() => {
      let snapshot = { weekStart: null };
      const listeners = new Set();
      return {
        getSnapshot: () => snapshot,
        subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        set(weekStart) { snapshot = { weekStart }; listeners.forEach((fn) => fn()); }
      };
    })();
    function openWeekly() {
      const now = Date.now(), log = readDayLog(), runs = readRunLog(), last = shiftDay(weekStartOf(now), -7);
      weeklyState.set(weeklyReport({ log, runs, weekStart: last, now }).empty ? weekStartOf(now) : last);
    }
    // The report figures, shared by the dialog and the image.
    function weeklyCells(report, t) {
      const money = (value) => moneyText(value, report.currency), pct = (value) => Math.round(value * 100) + "%";
      const model = report.models[0], hour = report.busiest?.hour;
      const clock = (h) => String(h % 24).padStart(2, "0") + ":00";
      return [
        ["avg", "wkAvg", money(report.avg), fill(t("wkActiveDays"), { n: report.activeDays })],
        ["conversations", "wkConvs", fill(t("wkConvCount"), { n: report.conversations })],
        ["model", "wkModel", model?.model || "—", model ? fill(t("wkShare"), { share: pct(model.share) }) : null],
        ["busiest", "wkBusiest", hour === undefined ? "—" : clock(hour) + "–" + clock(hour + 1), report.busiest ? money(report.busiest.cost) : t("wkNoHours")],
        ["hit", "wkHit", report.hitRate === null ? "—" : pct(report.hitRate)],
        ["offPeak", "wkOffPeak", report.offPeakShare === null ? "—" : pct(report.offPeakShare)],
        ["runs", "wkRuns", report.runs ? fill(t("wkRunCount"), { n: report.runs.count }) : "—", report.runs ? fill(t("wkRunTotal"), { duration: durationText(report.runs.ms, t) }) : t("wkNoRuns")],
        ["tokens", "wkTokens", report.tokens ? fill(t("wkTokensValue"), { n: tokenWan(report.tokens) }) : "—", report.books > 0 ? fill(t("wkBooks"), { n: report.books }) : null]
      ].map(([key, label, value, sub]) => ({ key, label: t(label), value, sub: sub || null }));
    }
    // Tokens in units of 10 000, as people say them in Chinese.
    function tokenWan(tokens) {
      const wan = tokens / 10000;
      return wan >= 100 ? Math.round(wan).toLocaleString() : wan >= 1 ? String(Math.round(wan * 10) / 10) : String(Math.round(wan * 100) / 100);
    }
    function weeklyHighlights(report, t) {
      const money = (value) => moneyText(value, report.currency);
      return [
        ["topDay", "wkTopDay", report.topDay ? fill(t("wkTopDayValue"), { weekday: t("wkDay" + report.topDay.index), money: money(report.topDay.cost) }) : "—"],
        ["topConv", "wkTopConv", report.topConversation ? money(report.topConversation.cost) : "—"],
        ["longest", "wkLongest", report.runs ? durationText(report.runs.longest, t) : "—"],
        ["streak", "wkStreak", report.streak ? fill(t("wkStreakValue"), { n: report.streak }) : "—"]
      ].map(([key, label, value]) => ({ key, label: t(label), value }));
    }
    function weeklyDelta(report, t) {
      const change = report.change;
      return { trend: change === null || Math.abs(change) < 0.005 ? "flat" : change > 0 ? "up" : "down",
        delta: change === null ? t("wkDeltaNone") : fill(t("wkDelta"), { change: (change < 0 ? "−" : "+") + Math.round(Math.abs(change) * 100) + "%" }) };
    }
    function weeklyAverage(report, t) {
      if (report.average4 === null) return null;
      const text = fill(t("wkAvg4"), { money: moneyText(report.average4, report.currency) });
      return report.vsAverage === null || Math.abs(report.vsAverage) < 0.005 ? text
        : text + " · " + fill(t("wkVsAvg"), { dir: t(report.vsAverage > 0 ? "wkVsUp" : "wkVsDown"), pct: Math.round(Math.abs(report.vsAverage) * 100) + "%" });
    }
    function weeklySaved(report, t) {
      const money = (value) => moneyText(value, report.currency);
      if (report.offPeakSaved > 0 && report.cacheSaved > 0) return fill(t("wkSaved"), { cache: money(report.cacheSaved), offPeak: money(report.offPeakSaved) });
      return report.cacheSaved > 0 ? fill(t("wkSavedCache"), { cache: money(report.cacheSaved) }) : null;
    }
    // Draw the weekly report as a 1080×1760 archive sheet in the current theme
    // and accent. It carries statistics only: no conversation titles.
    function paintWeekly(report, { t, dark }) {
      const W = 1080, H = 1760, M = 72;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const g = canvas.getContext("2d");
      let accent = "";
      try { accent = getComputedStyle(document.body).getPropertyValue("--dsw-static-deepseek-500").trim(); } catch {}
      if (!accent) accent = dark ? "#f0893e" : "#e46f24";
      const C = dark
        ? { bg: "#171614", ink: "#f6f5f1", ink2: "#aca89e", ink3: "#7d7971", line: "rgba(255,255,255,.12)", hair: "rgba(255,255,255,.06)", dot: "rgba(255,255,255,.06)", empty: "rgba(255,255,255,.07)" }
        : { bg: "#f8f6f1", ink: "#12110f", ink2: "#5f5c56", ink3: "#949087", line: "rgba(18,17,15,.14)", hair: "rgba(18,17,15,.07)", dot: "rgba(18,17,15,.07)", empty: "rgba(18,17,15,.06)" };
      const lime = "#a5c22a";
      const SANS = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",system-ui,sans-serif';
      const MONO = 'ui-monospace,"SF Mono",Menlo,"Cascadia Mono",Consolas,monospace';
      const spaced = "letterSpacing" in g;
      const write = (value, x, y, { size, weight = 400, mono = false, color = C.ink, align = "left", spacing = 0, max = 0 }) => {
        let px = size;
        const set = () => { g.font = `${weight} ${px}px ${mono ? MONO : SANS}`; };
        set();
        if (spaced) g.letterSpacing = spacing + "px";
        // Shrink to fit, then cut with an ellipsis as a last resort.
        while (max && px > size * 0.6 && g.measureText(value).width > max) { px -= 1; set(); }
        let shown = String(value);
        while (max && shown.length > 1 && g.measureText(shown).width > max) shown = shown.slice(0, -2) + "…";
        g.fillStyle = color;
        g.textAlign = align;
        g.textBaseline = "alphabetic";
        g.fillText(shown, x, y);
        if (spaced) g.letterSpacing = "0px";
      };
      const rule = (x1, y, x2, color = C.line, width = 1) => { g.fillStyle = color; g.fillRect(x1, y, x2 - x1, width); };
      const bracket = (x, y, dx, dy, color, size = 40, width = 3) => {
        g.fillStyle = color;
        g.fillRect(dx > 0 ? x : x - size, dy > 0 ? y : y - width, size, width);
        g.fillRect(dx > 0 ? x : x - width, dy > 0 ? y : y - size, width, size);
      };

      // Paper, dot field and frame.
      g.fillStyle = C.bg;
      g.fillRect(0, 0, W, H);
      g.fillStyle = C.dot;
      for (let y = 24; y < H; y += 24) for (let x = 24; x < W; x += 24) g.fillRect(x - 1, y - 1, 2, 2);
      bracket(36, 36, 1, 1, accent);
      bracket(W - 36, H - 36, -1, -1, accent);
      bracket(W - 36, 36, -1, 1, C.ink3, 24, 2);
      bracket(36, H - 36, 1, -1, C.ink3, 24, 2);

      // Header and title.
      const range = (day) => day.slice(5).split("-").map(Number).join(".");
      write("RHINE LAB · WEEKLY REPORT", M, 112, { size: 20, weight: 600, mono: true, color: C.ink3, spacing: 4 });
      write("RL-DSH · W" + String(report.week).padStart(2, "0"), W - M, 112, { size: 20, weight: 600, mono: true, color: C.ink3, spacing: 4, align: "right" });
      rule(M, 136, W - M);
      g.fillStyle = accent;
      g.fillRect(M, 176, 6, 104);
      write(t("wkTitle"), M + 30, 262, { size: 92, weight: 700, spacing: 4 });
      const subtitle = [report.start.slice(0, 4), fill(t("wkWeek"), { week: report.week }), range(report.start) + " – " + range(report.end)]
        .concat(report.current ? [t("wkLive")] : []).join("  ·  ");
      write(subtitle, M + 32, 322, { size: 30, color: C.ink2, max: 560 });

      // The evaluation stamp, slightly turned, top right.
      if (report.badge) {
        const { name, reason } = weeklyBadgeText(report, t);
        g.save();
        g.translate(W - M - 150, 236);
        g.rotate(-0.05);
        g.strokeStyle = accent;
        g.lineWidth = 4;
        g.strokeRect(-150, -88, 300, 176);
        g.lineWidth = 1.5;
        g.strokeRect(-140, -78, 280, 156);
        write("RL-EVAL · " + t("wkBadge"), 0, -40, { size: 18, weight: 600, mono: true, color: accent, align: "center", spacing: 2, max: 250 });
        write(name, 0, 16, { size: 46, weight: 800, color: accent, align: "center", spacing: 4, max: 260 });
        write(reason, 0, 56, { size: 20, color: C.ink2, align: "center", max: 260 });
        g.restore();
      }

      if (report.empty) {
        write(t("wkEmpty"), W / 2, 760, { size: 36, color: C.ink3, align: "center" });
      } else {
        // Total, change, and the four-week average.
        write(t(report.current ? "wkTotalLive" : "wkTotal"), M, 410, { size: 28, color: C.ink3 });
        write(moneyText(report.total, report.currency), M - 4, 540, { size: 136, weight: 700, spacing: -2, max: W - 2 * M });
        const { trend, delta } = weeklyDelta(report, t);
        let deltaX = M;
        if (trend === "up" || trend === "down") {
          g.fillStyle = trend === "up" ? accent : lime;
          g.beginPath();
          if (trend === "up") { g.moveTo(M, 590); g.lineTo(M + 22, 590); g.lineTo(M + 11, 572); }
          else { g.moveTo(M, 574); g.lineTo(M + 22, 574); g.lineTo(M + 11, 592); }
          g.fill();
          deltaX = M + 36;
        }
        write(delta, deltaX, 592, { size: 28, color: C.ink2 });
        const average = weeklyAverage(report, t);
        if (average) write(average, M, 636, { size: 24, color: C.ink3, max: W - 2 * M });

        // Seven days, Monday first.
        const top = 690, base = 900, inner = W - 2 * M, col = inner / 7, barW = Math.min(84, col - 36);
        const max = Math.max(...report.days.map((row) => row.cost), 0);
        const today = report.current ? dayKey(Date.now()) : null;
        rule(M, base, W - M, C.line, 2);
        report.days.forEach((row, i) => {
          const cx = M + col * i + col / 2;
          const h = max > 0 ? Math.max(row.cost > 0 ? 4 : 0, (row.cost / max) * (base - top - 46)) : 0;
          if (row.cost > 0) {
            g.fillStyle = accent;
            g.globalAlpha = row.day === today ? 0.55 : 1;
            g.fillRect(cx - barW / 2, base - h, barW, h);
            g.globalAlpha = 1;
            write(moneyText(row.cost, report.currency), cx, base - h - 14, { size: 20, weight: 500, mono: true, color: C.ink2, align: "center", max: col - 8 });
          } else {
            g.fillStyle = C.ink3;
            g.fillRect(cx - barW / 2, base - 4, barW, 2);
          }
          write(t("wkDay" + i), cx, base + 44, { size: 24, weight: 600, mono: true, color: row.day === today ? accent : C.ink3, align: "center" });
        });

        // Hour of day: 24 cells shaded by spending, the busiest one framed.
        write(t("wkHoursTitle"), M, 1000, { size: 18, weight: 600, mono: true, color: C.ink3, spacing: 3 });
        const cell = inner / 24, hourMax = report.hours ? Math.max(...report.hours, 0) : 0;
        for (let hour = 0; hour < 24; hour++) {
          const x = M + cell * hour, value = report.hours?.[hour] || 0;
          if (hourMax > 0 && value > 0) {
            g.fillStyle = accent;
            g.globalAlpha = 0.14 + 0.86 * value / hourMax;
          } else g.fillStyle = C.empty;
          g.fillRect(x + 1.5, 1016, cell - 3, 36);
          g.globalAlpha = 1;
          if (report.busiest?.hour === hour && hourMax > 0) { g.strokeStyle = C.ink; g.lineWidth = 2; g.strokeRect(x - 1, 1013, cell + 2, 42); }
        }
        if (!report.hours) write(t("wkNoHours"), W / 2, 1042, { size: 20, color: C.ink3, align: "center" });
        ["00", "06", "12", "18", "24"].forEach((label, i) => write(label, M + inner * i / 4, 1084, { size: 18, weight: 600, mono: true, color: C.ink3, align: i === 0 ? "left" : i === 4 ? "right" : "center" }));

        // Eight figures in two rows of four.
        const cellW = inner / 4;
        weeklyCells(report, t).forEach((item, i) => {
          const x = M + cellW * (i % 4), y = [1120, 1250][Math.floor(i / 4)];
          rule(x, y, x + cellW - 24, i < 4 ? C.line : C.hair, 2);
          write(item.label, x, y + 40, { size: 24, color: C.ink3, max: cellW - 32 });
          write(item.value, x, y + 92, { size: item.key === "model" ? 30 : 40, weight: 700, mono: item.key === "model", max: cellW - 32 });
          if (item.sub) write(item.sub, x, y + 126, { size: 21, color: C.ink3, max: cellW - 32 });
        });

        // Highlights of the week.
        rule(M, 1404, W - M, C.line, 2);
        write(t("wkHighlights"), M, 1442, { size: 18, weight: 600, mono: true, color: C.ink3, spacing: 3 });
        weeklyHighlights(report, t).forEach((item, i) => {
          const x = M + cellW * i;
          g.fillStyle = accent;
          g.fillRect(x, 1464, 8, 8);
          write(item.label, x + 18, 1473, { size: 22, color: C.ink3, max: cellW - 40 });
          write(item.value, x, 1522, { size: 32, weight: 700, max: cellW - 24 });
        });

        const saved = weeklySaved(report, t);
        if (saved) {
          g.fillStyle = lime;
          g.fillRect(M, 1568, 12, 12);
          write(saved, M + 26, 1582, { size: 24, color: C.ink2, max: W - 2 * M - 26 });
        }
      }

      // Footer: where the sheet comes from and how to get the plugin, so a
      // shared image leads back to it.
      rule(M, H - 128, W - M, C.line);
      g.font = "600 16px " + MONO;
      if (spaced) g.letterSpacing = "2px";
      const tagW = g.measureText("RL · PLUGIN").width + 22;
      if (spaced) g.letterSpacing = "0px";
      g.fillStyle = accent;
      g.fillRect(M, H - 104, tagW, 30);
      write("RL · PLUGIN", M + 11, H - 83, { size: 16, weight: 600, mono: true, color: dark ? C.bg : "#fff", spacing: 2 });
      write(t("wkShareName"), M + tagW + 14, H - 80, { size: 24, weight: 700 });
      g.font = "700 24px " + SANS;
      write("· " + t("wkShareWhat"), M + tagW + 14 + g.measureText(t("wkShareName")).width + 10, H - 80, { size: 22, color: C.ink2 });
      write(t("wkStatsOnly"), W - M, H - 81, { size: 19, color: C.ink3, align: "right" });
      const how = t("wkShareHow") + " ";
      write(how, M, H - 42, { size: 21, color: C.ink3 });
      g.font = "400 21px " + SANS;
      write("dsh-rhine-splash", M + g.measureText(how).width, H - 42, { size: 21, weight: 700, mono: true, color: accent });
      write("github.com/Respawn-ID/dsh-rhine-splash", W - M, H - 42, { size: 17, weight: 500, mono: true, color: C.ink3, align: "right" });
      return canvas;
    }
    async function exportWeekly(report, mode, { t }) {
      try {
        const canvas = paintWeekly(report, { t, dark: document.body.hasAttribute("data-ds-dark-theme") });
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        if (!blob) return false;
        if (mode === "copy") await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        else if (mode === "save") {
          const url = URL.createObjectURL(blob), link = document.createElement("a");
          const year = shiftDay(report.start, 3).slice(0, 4);
          link.href = url;
          link.download = `rhine-weekly-${year}-W${report.week}.png`;
          try { document.body.append(link); link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000); }
        } else return false;
        return true;
      } catch { return false; }
    }
    function WeeklyReport({ t, getLayout }) {
      const { weekStart } = React.useSyncExternalStore(weeklyState.subscribe, weeklyState.getSnapshot);
      const closeRef = React.useRef(null), copyTimer = React.useRef(0), generation = React.useRef(0);
      const [copied, setCopied] = React.useState("wkCopy");
      React.useEffect(() => {
        if (!weekStart) return;
        const previous = document.activeElement;
        closeRef.current?.focus();
        const escape = (event) => { if (event.key === "Escape") { event.preventDefault(); weeklyState.set(null); } };
        document.addEventListener("keydown", escape);
        return () => { document.removeEventListener("keydown", escape); previous?.focus?.(); };
      }, [!!weekStart]);
      React.useEffect(() => {
        if (weekStart && weekStart === shiftDay(weekStartOf(Date.now()), -7)) try { localStorage.setItem("rhine-splash:weekly-viewed", weekStart); } catch {}
        generation.current++;
        setCopied("wkCopy");
        return () => { generation.current++; clearTimeout(copyTimer.current); };
      }, [weekStart]);
      if (!weekStart) return null;
      const now = Date.now(), log = readDayLog(), runs = readRunLog();
      const report = weeklyReport({ log, runs, weekStart, now }), weeks = reportWeeks({ log, runs, now });
      const index = weeks.indexOf(weekStart), canPrev = index >= 0 && index < weeks.length - 1, canNext = weekStart < weeks[0];
      const close = () => weeklyState.set(null);
      const step = (offset) => { if (offset < 0 ? canPrev : canNext) weeklyState.set(shiftDay(weekStart, offset * 7)); };
      const money = (value) => moneyText(value, report.currency);
      const cells = weeklyCells(report, t), { trend, delta } = weeklyDelta(report, t);
      const badge = report.badge ? weeklyBadgeText(report, t) : null, average = weeklyAverage(report, t), saved = weeklySaved(report, t);
      const hourMax = report.hours ? Math.max(...report.hours) : 0;
      const labels = ["wkMon", "wkTue", "wkWed", "wkThu", "wkFri", "wkSat", "wkSun"].map((key) => t(key));
      const max = Math.max(...report.days.map((row) => row.cost));
      const dateLabel = (day) => day.slice(5).split("-").map(Number).join(".");
      const layout = getLayout?.();
      const copy = async () => {
        const current = generation.current;
        const success = await exportWeekly(report, "copy", { t });
        if (current !== generation.current) return;
        clearTimeout(copyTimer.current);
        setCopied(success ? "wkCopied" : "wkCopyFailed");
        if (success) copyTimer.current = setTimeout(() => setCopied("wkCopy"), 1500);
      };
      return createPortal(jsx("div", { className: "rl-wk-scrim", "data-open": true,
        onClick: (event) => { if (event.target === event.currentTarget) close(); },
        children: jsxs("section", { className: "rl-wk", role: "dialog", "aria-modal": "true", "aria-labelledby": "rl-wk-title", "data-current": report.current ? "true" : undefined,
          onKeyDown: (event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); step(event.key === "ArrowLeft" ? -1 : 1); }
          }, children: [
            jsxs("header", { className: "rl-wk-head", children: [
              jsx("span", { className: "rl-wk-tag", children: fill(t("wkWeek"), { week: report.week }) }),
              jsx("span", { className: "rl-wk-range", children: dateLabel(report.start) + " – " + dateLabel(report.end) }),
              report.current && jsx("span", { className: "rl-wk-live", children: t("wkLive") }),
              jsxs("nav", { className: "rl-wk-nav", children: [
                jsx("button", { type: "button", className: "rl-wk-step", "aria-label": t("wkPrev"), disabled: !canPrev, onClick: () => step(-1), children: "‹" }),
                jsx("button", { type: "button", className: "rl-wk-step", "aria-label": t("wkNext"), disabled: !canNext, onClick: () => step(1), children: "›" })
              ] }),
              jsx("button", { type: "button", className: "rl-wk-x", ref: closeRef, "aria-label": t("wkClose"), onClick: close, children: "×" })
            ] }),
            jsxs("div", { className: "rl-wk-titlerow", children: [
              jsx("h2", { id: "rl-wk-title", className: "rl-wk-title", children: t("wkTitle") }),
              badge && jsxs("div", { className: "rl-wk-stamp", children: [
                jsx("span", { className: "rl-wk-stamp-k", children: t("wkBadge") }),
                jsx("b", { className: "rl-wk-stamp-name", children: badge.name }),
                jsx("span", { className: "rl-wk-stamp-why", children: badge.reason })
              ] }, report.start)
            ] }),
            report.empty ? jsx("p", { className: "rl-wk-empty", children: t("wkEmpty") }) : jsxs(React.Fragment, { children: [
              jsxs("div", { className: "rl-wk-hero", children: [
                jsx("span", { className: "rl-wk-k", children: t(report.current ? "wkTotalLive" : "wkTotal") }),
                jsx("b", { className: "rl-wk-total", children: money(report.total) }),
                jsx("span", { className: "rl-wk-delta", "data-trend": trend, children: delta }),
                average && jsx("span", { className: "rl-wk-avg", children: average })
              ] }),
              jsxs("div", { className: "rl-wk-body", children: [
                jsxs("div", { children: [
              jsx("div", { className: "rl-wk-days", role: "img", "aria-label": report.days.map((row, i) => labels[i] + " " + money(row.cost)).join("，"), children: report.days.map((row, i) => jsxs("div", {
                className: "rl-wk-day", "data-today": report.current && row.day === dayKey(now) ? "true" : undefined, "data-zero": row.cost === 0 ? "true" : undefined,
                children: [jsx("i", { className: "rl-wk-bar", style: { "--h": max ? row.cost / max : 0 } }), jsx("span", { className: "rl-wk-dl", children: labels[i] })]
              }, row.day)) }),
                jsx("p", { className: "rl-wk-sec", children: t("wkHoursTitle") }),
                report.hours ? jsx("div", { className: "rl-wk-hours", role: "img", "aria-label": t("wkHoursTitle"), children: report.hours.map((cost, hour) => jsx("i", {
                  className: "rl-wk-hour", title: String(hour).padStart(2, "0") + ":00 " + money(cost), style: { "--a": hourMax ? cost / hourMax : 0 },
                  "data-top": report.busiest?.hour === hour && hourMax ? "true" : undefined
                }, hour)) }) : jsx("p", { className: "rl-wk-sub", children: t("wkNoHours") }),
                report.hours && jsx("div", { className: "rl-wk-hticks", children: ["00", "06", "12", "18", "24"].map((label) => jsx("span", { children: label }, label)) })
                ] }),
                jsxs("div", { children: [
                  jsx("p", { className: "rl-wk-sec", children: t("wkHighlights") }),
                  jsx("ul", { className: "rl-wk-best", children: weeklyHighlights(report, t).map((item) => jsxs("li", { "data-key": item.key, children: [
                    jsx("span", { children: item.label }), jsx("b", { children: item.value })
                  ] }, item.key)) })
                ] })
              ] }),
              jsx("dl", { className: "rl-wk-grid", children: cells.map(({ key, label, value, sub }) => jsxs("div", { className: "rl-wk-cell", "data-key": key, children: [
                jsx("dt", { children: label }), jsx("dd", { children: value }), sub && jsx("dd", { className: "rl-wk-sub", children: sub })
              ] }, key)) }),
              saved && jsx("p", { className: "rl-wk-saved", children: saved }),
              jsx("p", { className: "rl-wk-note", children: t("wkPrivacy") })
            ] }),
            jsxs("div", { className: "rl-wk-actions", children: [
              jsx("button", { type: "button", className: "rl-wk-btn rl-wk-btn--primary", onClick: () => exportWeekly(report, "save", { t }), children: t("wkSave") }),
              jsx("button", { type: "button", className: "rl-wk-btn", onClick: copy, children: t(copied) }),
              layout && jsx("button", { type: "button", className: "rl-wk-btn", onClick: () => { layout.selectPanel("rhine-cost"); close(); }, children: t("wkCost") })
            ] })
          ] })
      }), document.body);
    }
    function registerWeekly(ctx, t) {
      let layout;
      ctx.inject(["layout"], (scope) => {
        if (typeof scope.layout?.selectPanel !== "function") return;
        layout = scope.layout;
        scope.effect(() => () => { layout = undefined; });
      });
      ctx.inject(["slots"], (scope) => {
        const absent = missing(scope, ["effect", "slots.inject", "slots.register"]);
        if (absent.length) { compat.report("weekly", "missing", absent.join(", ")); return; }
        scope.slots.inject("shell.overlay", () => scope.slots.register({
          name: "shell.overlay", id: "rhine-weekly", locale: NS, inject: () => ({ getLayout: () => layout })
        }, safe("weekly", WeeklyReport)));
        compat.ready("weekly");
        scope.effect(() => {
          const start = () => {
            const now = Date.now(), last = shiftDay(weekStartOf(now), -7);
            let seen, history = false;
            try {
              seen = localStorage.getItem("rhine-splash:weekly-seen");
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith("rhine-splash:") && !["rhine-splash:weekly-seen", "rhine-splash:run-days", "rhine-splash:seen-version"].includes(key)) { history = true; break; }
              }
            } catch {}
            const remember = () => { try { localStorage.setItem("rhine-splash:weekly-seen", last); } catch {} };
            if (seen === last) return;
            if (!history || weeklyReport({ log: readDayLog(), runs: readRunLog(), weekStart: last, now }).empty) { remember(); return; }
            let timer = 0, elapsed = 0, waited = -300, finished = false, checkedAt = now;
            const check = () => {
              try {
                const stamp = Date.now(), delta = Math.max(300, stamp - checkedAt);
                checkedAt = stamp;
                if (live.getSnapshot().weeklyReport === false) { waited = -300; return; }
                if (whatsNewState.getSnapshot().entry) { waited = -300; return; }
                elapsed += delta;
                if (elapsed >= 20000) { finished = true; return; }
                if (document.getElementById("rhine-splash") || document.visibilityState !== "visible") waited = -300;
                else {
                  waited += 300;
                  if (waited >= 1200) { remember(); weeklyState.set(last); finished = true; return; }
                }
              } catch (error) { finished = true; compat.report("weekly", "crashed", String(error?.message || error)); }
              finally { if (!finished) timer = setTimeout(check, 300); }
            };
            timer = setTimeout(check, 300);
            return () => clearTimeout(timer);
          };
          let started = false, stop;
          const changed = () => {
            try {
              if (started || live.getSnapshot().weeklyReport === false) return;
              started = true;
              stop = start();
            } catch (error) { compat.report("weekly", "crashed", String(error?.message || error)); }
          };
          const unsubscribe = live.subscribe(changed);
          changed();
          return () => { unsubscribe(); stop?.(); weeklyState.set(null); };
        });
      });
    }

    // Add archive deletion and the archived conversations settings section.
    function registerArchives(ctx, t) {
      ctx.inject(["slots", "workspaces", "sessions"], (scope) => {
        const absent = missing(scope, ["slots.inject", "slots.register", "slots.entries", "workspaces.list.getSnapshot", "workspaces.list.subscribe", "workspaces.unarchiveSession", "sessions.list.getSnapshot", "sessions.list.subscribe"]);
        if (absent.length) { compat.report("archives", "missing", absent.join(", ")); return; }
        scope.slots.inject("sidebar.workspaces.session.menu.item", () => scope.slots.register({
          name: "sidebar.workspaces.session.menu.item", id: "rhine-delete", order: 460, locale: NS,
          inject: () => ({ workspaces: scope.workspaces, sessions: scope.sessions })
        }, safe("archives", DeleteSessionMenuItem)));
        scope.slots.inject("shell.overlay", () => scope.slots.register({
          name: "shell.overlay", id: "rhine-delete-confirm", locale: NS
        }, safe("archives", DeleteConfirmDialog)));
        scope.slots.inject("settings.section", () => {
          if (scope.slots.entries("settings.section").some((entry) => entry.options?.id === "archived-sessions")) return undefined;
          try {
            return scope.slots.register({
              name: "settings.section", id: "archived-sessions", order: 25, label: () => t("archives"), locale: NS,
              inject: () => ({ workspaces: scope.workspaces, sessions: scope.sessions })
            }, safe("archives", ArchiveSection));
          } catch (error) {
            compat.report("archives", "crashed", String(error?.message || error));
            return undefined;
          }
        });
        compat.ready("archives");
      });
    }

    // Add the shared interface styles.
    function registerStyles(ctx) {
      ctx.effect(() => {
        const style = document.createElement("style");
        style.textContent = CSS;
        document.head.append(style);
        return () => style.remove();
      });
    }

    // Add sidebar brand slots and the optional hero mark.
    function registerBrand(ctx) {
      const absent = missing(ctx, ["slots.inject", "slots.register", "effect"]);
      if (absent.length) { compat.report("brand", "missing", absent.join(", ")); return; }
      ctx.slots.inject("sidebar.brand.mark", () => ctx.slots.inject("sidebar.brand.name", function* () {
        yield ctx.slots.register({ name: "sidebar.brand.mark" }, safe("brand", Mark));
        yield ctx.slots.register({ name: "sidebar.brand.name" }, safe("brand", Name));
      }));
      ctx.effect(() => {
        let remove = null;
        const update = () => {
          try {
            const config = live.getSnapshot();
            const enabled = config.brand !== false && (BRAND.heroes?.[config.logo] || BRAND.hero);
            if (enabled && !remove) remove = ctx.slots.inject("conversation.hero.brand.mark", function* () {
              yield ctx.slots.register({ name: "conversation.hero.brand.mark" }, safe("brand", Hero));
            });
            else if (!enabled && remove) { remove(); remove = null; }
          } catch (error) { compat.report("brand", "crashed", String(error?.message || error)); }
        };
        const unsubscribe = live.subscribe(update);
        update();
        return () => { unsubscribe(); remove?.(); };
      });
      compat.ready("brand");
    }

    // Record every loaded conversation, independently of the selected session.
    function registerBilling(ctx, { notify, saveSetting }) {
      ctx.inject(["slots", "uiWorkspace", "sessions", "modelDirectories", "remote", "remote.session"], (scope) => {
        const absent = missing(scope, ["effect", "slots.inject", "slots.register", "uiWorkspace.selection.getSnapshot", "uiWorkspace.selection.subscribe", "uiWorkspace.openSession", "sessions.list.getSnapshot", "sessions.list.subscribe", "sessions.binding", "modelDirectories.directoryFor"]);
        if (absent.length) { compat.report("billing", "missing", absent.join(", ")); return; }
        const tracked = new Map();
        let debounce = 0;
        const guarded = (fn) => (...args) => {
          try { return fn(...args); }
          catch (error) { compat.report("billing", "crashed", String(error?.message || error)); }
        };
        const currency = () => preferredBalances(balance.getSnapshot().value)[0]?.currency || "CNY";
        const update = (id, face) => {
          const usage = face.getSnapshot();
          if (!usage) return;
          let model;
          try { model = scope.modelDirectories.directoryFor(id).store.getSnapshot().current?.model; } catch {}
          const previous = readLedger(id);
          const ledger = recordUsage(id, usage, model, currency());
          if (!ledger) return;
          // Only fresh spending can cross a budget: setting or lowering a
          // limit must not replay alerts for money already spent.
          const spentNow = previous != null && previous.cost != null && ledger.cost != null && ledger.cost > previous.cost;
          const config = live.getSnapshot();
          const today = spentNow ? costSummary(readDayLog(), billingLedgers, Date.now(), 1).today : 0;
          const row = scope.sessions.list.getSnapshot().byId[id];
          const t = ctx.locale.bind(NS);
          for (const event of spentNow ? budgetThresholds({ now: Date.now(), sessionId: id, daily: today, session: ledger.cost, budgetDaily: config.budgetDaily, budgetSession: config.budgetSession }) : []) {
            const daily = event.scope === "daily";
            const code = daily ? readDayLog().currency : ledger.currency;
            notify.alert({ id: `budget:${daily ? dayKey(Date.now()) : id}:${event.level}:${event.scope}`,
              title: fill(t(event.level === 100 ? "budgetOver" : "budgetNear"), { scope: t(daily ? "budgetScopeToday" : "budgetScopeSession") })
                + (daily ? "" : " · " + (row?.title || row?.displayTitle || t("ntfUntitled"))),
              status: fill(t("budgetStatus"), { spent: moneyText(event.spent, code), limit: moneyText(event.limit, code) }),
              open: daily ? () => {} : () => scope.uiWorkspace.openSession(id)
            });
          }
          if (!previous || ["miss", "hit", "out"].some((key) => ledger.seen[key] !== previous.seen[key])) {
            clearTimeout(debounce);
            debounce = setTimeout(guarded(() => balance.refresh()), 4000);
          }
        };
        const scan = guarded(() => {
          const rows = scope.sessions.list.getSnapshot().byId;
          for (const [id, entry] of tracked) {
            const row = rows[id];
            if (!row || row.blank || row.origin === "subagent" || scope.sessions.binding(id) !== entry.binding) {
              entry.dispose();
              tracked.delete(id);
            }
          }
          for (const [id, row] of Object.entries(rows)) {
            if (tracked.has(id) || row.blank || row.origin === "subagent") continue;
            const binding = scope.sessions.binding(id);
            if (!binding) continue;
            const face = binding.session.projections.faceOf("tokenUsage");
            if (!face || typeof face.getSnapshot !== "function" || typeof face.subscribe !== "function") continue;
            const record = guarded(() => update(id, face));
            const remove = face.subscribe(record);
            let directory;
            try { directory = scope.modelDirectories.directoryFor(id).store; } catch {}
            const removeModel = directory?.subscribe?.(record);
            tracked.set(id, { binding, dispose: () => { remove?.(); removeModel?.(); } });
            record();
          }
        });
        scope.effect(() => balance.start());
        scope.effect(() => scope.sessions.list.subscribe(scan));
        scope.effect(() => balance.subscribe(guarded(() => { for (const [id, entry] of tracked) update(id, entry.binding.session.projections.faceOf("tokenUsage")); })));
        // Optional services have their own scopes so their absence never blocks recording.
        scope.inject(["uiSession"], (optional) => {
          if (typeof optional.uiSession?.sessionStatus?.subscribe === "function") optional.effect(() => optional.uiSession.sessionStatus.subscribe(scan));
          scan();
        });
        let navigation, layout, workspaces = null;
        scope.inject(["workspaces"], (optional) => { workspaces = optional.workspaces; });
        scope.inject(["layout"], (optional) => {
          const absent = missing(optional, ["layout.selectPanel", "layout.panelInfo.getSnapshot", "layout.panelInfo.subscribe"]);
          if (absent.length) { compat.report("cost", "missing", absent.join(", ")); return; }
          layout = optional.layout;
          scope.slots.inject("main", () => scope.slots.register({
            name: "main", key: "rhine-cost", locale: NS,
            inject: () => ({ sessions: scope.sessions, workspaces, open: (id) => scope.uiWorkspace.openSession(id),
              saveSetting, getNavigation: () => navigation, back: () => layout.selectPanel(null), panelInfo: layout.panelInfo })
          }, safe("cost", CostPage)));
          compat.ready("cost");
        });
        scope.effect(() => {
          let previousLimit;
          if (balanceAlertsCache === undefined) try { balanceAlertsCache = JSON.parse(localStorage.getItem("rhine-splash:balance-alert")); } catch {}
          const checkBalance = guarded((cached = false) => {
            const snapshot = balance.getSnapshot(), limit = live.getSnapshot().balanceAlert || 0;
            if (snapshot.status !== "ready" && !(cached && snapshot.status === "failed")) return;
            const main = preferredBalances(snapshot.value)[0];
            if (!main) return;
            const total = Number(main.total);
            const step = balanceAlertStep({ total, limit, state: balanceAlertsCache });
            const state = balanceAlertsCache = step.state;
            records.queue({ type: "alerts", balance: state });
            try { localStorage.setItem("rhine-splash:balance-alert", JSON.stringify(state)); } catch {}
            if (!step.alert) return;
            const t = ctx.locale.bind(NS);
            notify.alert({ id: "balance-low", title: fill(t("balanceLow"), { balance: moneyText(total, main.currency) }),
              status: fill(t("balanceLowStatus"), { limit: moneyText(limit, main.currency) }),
              open: () => { if (layout) layout.selectPanel("rhine-cost"); }
            });
          });
          const removeBalance = balance.subscribe(checkBalance);
          const removeLive = live.subscribe(guarded(() => {
            const limit = live.getSnapshot().balanceAlert;
            if (limit === previousLimit) return;
            previousLimit = limit;
            checkBalance(true);
          }));
          previousLimit = live.getSnapshot().balanceAlert;
          checkBalance();
          return () => { removeBalance(); removeLive(); };
        });
        // Without a layout service the page never registers and the absence check reports cost.
        scope.inject(["pluginNavigation"], (optional) => {
          if (typeof optional.pluginNavigation?.openBundle !== "function") return;
          navigation = optional.pluginNavigation;
          usageTick.emit();
          optional.effect(() => () => { navigation = undefined; usageTick.emit(); });
        });
        scope.effect(() => () => {
          clearTimeout(debounce);
          for (const entry of tracked.values()) entry.dispose();
          tracked.clear();
        });
        scan();
        scope.slots.inject("sidebar.footer.action", () => scope.slots.register({
          name: "sidebar.footer.action", id: "rhine-billing", order: -10, locale: NS,
          inject: () => ({ selection: scope.uiWorkspace.selection, sessions: scope.sessions, open: (id) => scope.uiWorkspace.openSession(id), saveSetting, getNavigation: () => navigation, layout })
        }, safe("billing", BillingWidget)));
        compat.ready("billing");
      });
    }

    const statusTimes = new Map();
    const runTimes = new Map();
    function registerStatusTimes(ctx) {
      ctx.inject(["slots", "uiSession", "sessions"], (scope) => {
        const absent = missing(scope, ["effect", "slots.inject", "slots.register", "uiSession.sessionStatus.getSnapshot", "uiSession.sessionStatus.subscribe", "sessions.list.getSnapshot", "sessions.list.subscribe"]);
        if (absent.length) { compat.report("todo", "missing", absent.join(", ")); return; }
        const status = scope.uiSession.sessionStatus, list = scope.sessions.list;
        let tracked = false;
        let failed = false;
        const track = () => {
          if (failed) return;
          try {
            const snapshot = status.getSnapshot(), rows = list.getSnapshot(), settled = rows?.phase === "ready", now = Date.now(), stamp = settled && tracked ? now : null;
            for (const [id, value] of snapshot) {
              const kind = todoKind(value);
              if (kind === null) statusTimes.delete(id);
              else if (statusTimes.get(id)?.kind !== kind) statusTimes.set(id, { kind, at: stamp });
              const row = Object.hasOwn(rows?.byId || {}, id) ? rows.byId[id] : undefined;
              if (!row || row.blank || row.origin === "subagent") { runTimes.delete(id); continue; }
              let run = runTimes.get(id);
              if (!run && value.running) {
                run = { activeSince: null, ms: 0, known: stamp !== null };
                runTimes.set(id, run);
              }
              if (!run) continue;
              if (!settled) run.known = false;
              const active = value.running === true && !value.pendingInteraction;
              if (active && run.activeSince === null) run.activeSince = now;
              if (!active && run.activeSince !== null) { run.ms += Math.max(0, now - run.activeSince); run.activeSince = null; }
              if (!value.running) {
                if (run.known && run.ms >= 1000) writeRunLog(addRun(readRunLog(), { day: dayKey(now), ms: run.ms }), { sessionId: id, day: dayKey(now), ms: run.ms, endedAt: now });
                runTimes.delete(id);
              }
            }
            for (const id of statusTimes.keys()) if (!snapshot.has(id)) statusTimes.delete(id);
            for (const id of runTimes.keys()) if (!snapshot.has(id)) runTimes.delete(id);
            if (settled) tracked = true;
          } catch (error) {
            failed = true;
            compat.report("todo", "crashed", String(error?.message || error));
          }
        };
        scope.effect(() => status.subscribe(track));
        scope.effect(() => list.subscribe(track));
        scope.effect(() => () => { statusTimes.clear(); runTimes.clear(); });
        track();
        scope.slots.inject("sidebar.session.row.hover", () => scope.slots.register({
          name: "sidebar.session.row.hover", id: "rhine-status-time", order: 20, locale: NS,
          inject: () => ({ status, list })
        }, safe("todo", RowStatusTime)));
      });
    }

    // Add the to-do center slot and /todo command.
    function registerTodo(ctx, t) {
      ctx.inject(["slots", "uiSession", "uiWorkspace", "sessions"], (scope) => {
        // commandUi is declared by the plugin itself, not by this inject scope.
        const absent = [...missing(ctx, ["commandUi.register"]), ...missing(scope, ["effect", "slots.inject", "slots.register", "uiSession.sessionStatus.getSnapshot", "uiSession.sessionStatus.subscribe", "sessions.list.getSnapshot", "sessions.list.subscribe", "uiWorkspace.selection.getSnapshot", "uiWorkspace.selection.subscribe", "uiWorkspace.openSession"])];
        if (absent.length) { compat.report("todo", "missing", absent.join(", ")); return; }
        const status = scope.uiSession.sessionStatus, list = scope.sessions.list, selection = scope.uiWorkspace.selection;
        const since = statusTimes;
        const open = (id) => { try { scope.uiWorkspace.openSession(id); } catch {} };
        scope.slots.inject("sidebar.footer.action", () => scope.slots.register({
          name: "sidebar.footer.action", id: "rhine-todo", order: -20, locale: NS,
          inject: () => ({ status, list, selection, since, open })
        }, safe("todo", TodoWidget)));
        scope.effect(() => ctx.commandUi.register({
          name: "todo", label: () => t("todoCommand"), description: () => t("todoCommandDescription"),
          icon: P.IconChecklistOutlineRegular || P.IconPlayOutlineRegular, available: () => live.getSnapshot().todoCenter !== false,
          ui: { kind: "popupSelect", searchMode: "fuzzy-label",
            searchLabels: () => ({ placeholder: t("todoSearch"), empty: t("todoEmpty"), noResults: t("noResults") }),
            options: async () => {
              const groups = todoGroups(status.getSnapshot(), list.getSnapshot(), since, Date.now(), t);
              return ["pending", "done", "running"].flatMap((kind) => groups[kind].map((row) => ({
                id: row.id, label: row.title,
                group: { name: row.kind, label: t(kind === "pending" ? "todoPending" : kind === "done" ? "todoDone" : "todoRunning") },
                detail: row.time ? row.status + " · " + row.time : row.status
              })));
            },
            onSelect: async (selected) => {
              if (Object.hasOwn(list.getSnapshot().byId, selected.id)) open(selected.id);
            }
          }
        }));
        compat.ready("todo");
      });
    }

    const NO_DIRECTORY = (() => {
      const state = { current: null, groups: [], status: "unavailable" };
      return { subscribe: () => () => {}, getSnapshot: () => state };
    })();
    // Add the reasoning effort control.
    function registerEffort(ctx, t) {
      ctx.inject(["slots", "modelDirectories", "sessions", "remote", "remote.session"], (scope) => {
        const absent = missing(scope, ["slots.inject", "slots.register", "modelDirectories.directoryFor", "sessions.subagentAddress"]);
        if (absent.length) { compat.report("effort", "missing", absent.join(", ")); return; }
        const models = scope.modelDirectories;
        const sessions = scope.sessions;
        scope.effect(() => {
          window.addEventListener("keydown", onInstantKey, true);
          return () => window.removeEventListener("keydown", onInstantKey, true);
        });
        scope.slots.inject("conversation.input.right", () => scope.slots.register({
          name: "conversation.input.right", id: "rhine-effort", order: 0, locale: NS,
          inject: (sessionId) => {
            // dsh retires a slot entry whose inject throws, for every later
            // session too; a session without a scope yet just hides the slider.
            let directory;
            try { directory = models.directoryFor(sessionId); }
            catch { return { available: false, directory: NO_DIRECTORY, load: () => {}, select: () => Promise.resolve(undefined) }; }
            const available = sessions.subagentAddress(sessionId) === undefined;
            return { available, directory: directory.store,
              load: () => { if (available) directory.load().catch(() => {}); },
              select: (selection) => available ? directory.select(selection) : Promise.resolve(undefined)
            };
          }
        }, safe("effort", EffortControl)));
        scope.inject(["uiSession"], (inner) => {
          if (missing(inner, ["uiSession.sessionStatus.getSnapshot", "uiSession.sessionStatus.subscribe", "sessions.binding"]).length) return;
          registerAnswerNow(inner, models, sessions, t);
        });
        compat.ready("effort");
      });
    }

    // Answer now: switch to "off" (applies to the next request), stop the
    // reply, wait until the session is idle, send a short follow-up, and when
    // that reply ends restore the previous level if it is still "off". The
    // flow lives here, not in the button, so it outlives the composer.
    function registerAnswerNow(scope, models, sessions, t) {
      const status = scope.uiSession.sessionStatus;
      const answering = new Map();
      let ids = new Set();
      const listeners = new Set();
      const publish = () => { ids = new Set(answering.keys()); listeners.forEach((fn) => fn()); };
      const busy = { getSnapshot: () => ids, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
      const finish = (id) => {
        const entry = answering.get(id);
        if (!entry) return;
        clearTimeout(entry.timer);
        clearTimeout(entry.idleTimer);
        answering.delete(id);
        publish();
        if (effortNow(entry.directory.store.getSnapshot()).effort === "off") {
          entry.directory.select({ provider: entry.provider, model: entry.model, reasoningEffort: entry.back }).catch(() => {});
        }
      };
      const send = (id, entry) => {
        entry.phase = "sent";
        entry.session.prompt([{ type: "text", text: ANSWER_MARK + t("answerNowPrompt") }], "queue")
          .then((result) => { if (result?.ok === false) finish(id); }, () => finish(id));
      };
      const check = () => {
        if (!answering.size) return;
        const snapshot = status.getSnapshot();
        for (const [id, entry] of answering) {
          const running = snapshot?.get?.(id)?.running === true;
          if (entry.phase === "stopping" && !running) send(id, entry);
          else if (entry.phase === "sent" && running) entry.phase = "answering";
          else if (entry.phase === "answering" && !running) finish(id);
        }
      };
      const answer = async (id) => {
        if (answering.has(id)) return;
        let directory, session;
        try { directory = models.directoryFor(id); session = sessions.binding(id)?.session; } catch { return; }
        const { current, effort, offered } = effortNow(directory?.store.getSnapshot());
        if (!session || !current || !offered || effort === "off") return;
        const entry = { phase: "starting", back: effort, provider: current.provider, model: current.model, directory, session };
        // Safety net: never leave a conversation without thinking for long.
        entry.timer = setTimeout(() => finish(id), 120000);
        answering.set(id, entry);
        publish();
        try {
          await directory.select({ provider: current.provider, model: current.model, reasoningEffort: "off" });
          const stopped = await session.cancel();
          if (stopped?.ok === false) { finish(id); return; }
        } catch { finish(id); return; }
        if (!answering.has(id)) return;
        entry.phase = "stopping";
        // A stop that never shows as idle still gets its follow-up.
        entry.idleTimer = setTimeout(() => { if (entry.phase === "stopping") send(id, entry); }, 4000);
        check();
      };
      scope.effect(() => {
        const stop = status.subscribe(() => {
          try { check(); } catch (error) { compat.report("effort", "crashed", String(error?.message || error)); }
        });
        return () => {
          stop();
          for (const id of [...answering.keys()]) finish(id);
        };
      });
      scope.slots.inject("conversation.input.right", () => scope.slots.register({
        name: "conversation.input.right", id: "rhine-answer-now", order: -1, locale: NS,
        inject: (sessionId) => {
          let directory;
          try { directory = models.directoryFor(sessionId); }
          catch { return { available: false, sessionId, directory: NO_DIRECTORY, status, busy, answer }; }
          return { available: sessions.subagentAddress(sessionId) === undefined, sessionId, directory: directory.store, status, busy, answer };
        }
      }, safe("effort", AnswerNow)));
      // Hide the follow-up: a user-text rule (the extension point dsh's own
      // goal and reference plugins use) claims a message that starts with the
      // mark, and its node renders only a hidden marker for the CSS above.
      scope.inject(["uiConversation"], (convo) => {
        if (missing(convo, ["uiConversation.userText.register"]).length) return;
        convo.effect(() => convo.uiConversation.userText.register({
          id: "rhine-answer-now", order: -1000,
          match: (text, from) => from === 0 && text.startsWith(ANSWER_MARK) ? { id: "rhine-answer-now", start: 0, end: text.length, data: {} } : undefined
        }));
        convo.slots.inject("conversation.user.text.node", () => convo.slots.register({
          name: "conversation.user.text.node", key: "rhine-answer-now", priority: 100
        }, AnswerNowMark));
      });
    }

    // Add the config form, autosave and plugin settings page.
    function registerSettings(ctx, t, runPreview, scope) {
      const absent = missing(ctx, ["effect", "configForms.get", "configForms.whileServed", "slots.inject", "slots.register", "slots.entries"]);
      if (absent.length) { compat.report("settings", "missing", absent.join(", ")); return; }
      const unavailable = missing(scope, ["getSnapshot", "subscribe"]);
      if (unavailable.length) { compat.report("settings", "missing", unavailable.map((path) => "configForms.get()." + path).join(", ")); return; }
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
      ctx.effect(() => updates.start());
      ctx.effect(() => ctx.configForms.whileServed(["rhine-splash"], () => {
        const inject = () => ({ hooks: { rhineSplash: store, rhineCompat: compat, rhineUpdate: updates, rhineRecords: records }, ...form.actions(), scheduleSave, runPreview });
        const removeConfig = ctx.slots.inject("plugins.row.config", () => ctx.slots.register({
          name: "plugins.row.config", key: "dsh-rhine-splash#rhine-splash", locale: NS, inject
        }, safe("settings", Card)));
        const removeSection = ctx.slots.inject("settings.section", () => {
          try {
            if (ctx.slots.entries("settings.section").some((entry) => entry.options?.id === "rhine-splash")) return undefined;
            return ctx.slots.register({
              name: "settings.section", id: "rhine-splash", order: 30, label: () => t("settingsNav"), locale: NS, inject
            }, safe("settings", SettingsSection));
          } catch (error) {
            compat.report("settings", "crashed", String(error?.message || error));
            return undefined;
          }
        });
        return () => { removeSection?.(); removeConfig?.(); };
      }));
      compat.ready("settings");
      const saveSetting = async (field, value) => {
        const draft = new P.SettingsFormModel(scope, specs());
        try {
          if (!draft.shell().available || !draft.shell().writable) throw new Error(t("readOnly"));
          draft.actions().edit(field, String(value));
          await draft.save();
          if (draft.shell().failed || draft.shell().dirty) throw new Error(t("saveFailed"));
        } finally { draft.dispose(); }
      };
      return { scope, staged: stagedConfig, saveSetting };
    }

    // Add the /splash preview and settings command.
    function registerCommand(ctx, t, scope, runPreview) {
      const absent = missing(ctx, ["effect", "commandUi.register", "configForms.get"]);
      if (absent.length) { compat.report("command", "missing", absent.join(", ")); return; }
      const unavailable = missing(scope, ["getSnapshot", "subscribe"]);
      if (unavailable.length) { compat.report("command", "missing", unavailable.map((path) => "configForms.get()." + path).join(", ")); return; }
      const current = (field) => scope.getSnapshot().value?.[field] ?? CONFIG[field];
      const option = (id, label, group, field, value) => ({ id, label: t(label),
        group: { name: group, label: t(group) },
        ...(field ? { active: current(field) === value, detail: t(NEXT_LAUNCH.includes(FIELDS[field].section) ? "nextLaunch" : "appliesNow") } : {})
      });
      ctx.effect(() => ctx.commandUi.register({
        name: "splash", label: () => t("command"), description: () => t("commandDescription"), icon: P.IconPlayOutlineRegular,
        // dsh lists a contribution only when available() says so; without it
        // the whole slash menu fails.
        available: () => true,
        ui: { kind: "popupSelect", searchMode: "fuzzy-label",
          searchLabels: () => ({ placeholder: t("search"), empty: t("empty"), noResults: t("noResults") }),
          options: async () => {
            const rows = PREVIEWS.map((entry) => option(entry.id, entry.command, "actions"));
            if (scope.getSnapshot().status !== "ready" || !scope.getSnapshot().writable) return rows;
            for (const [field, spec] of Object.entries(FIELDS)) {
              if (!spec.command) continue;
              if (spec.type === "switch") {
                for (const value of [true, false]) rows.push({
                  ...option(`${field}:${value}`, field, field, field, value),
                  label: fill(t("switchRow"), { name: t(field), state: t(value ? "stateOn" : "stateOff") })
                });
              } else if (["choice", "swatch"].includes(spec.type)) {
                for (const value of spec.choices) rows.push(option(`${field}:${value}`, (spec.label || "") + value, field, field, value));
              }
            }
            return rows;
          },
          onSelect: async (selected) => {
            if (PREVIEWS.some((entry) => entry.id === selected.id)) { runPreview(selected.id); return; }
            const [field, raw] = selected.id.split(":");
            const spec = Object.hasOwn(FIELDS, field) ? FIELDS[field] : undefined;
            if (!spec?.command || !(spec.type === "switch" ? ["true", "false"].includes(raw) : ["choice", "swatch"].includes(spec.type) && spec.choices.includes(raw))) return;
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
      compat.ready("command");
    }

    function apply(ctx) {
      ctx.effect(() => records.start());
      const scope = typeof ctx.configForms?.get === "function" ? ctx.configForms.get("rhine-splash") : undefined;
      registerLive(ctx, scope);
      const expected = ["live", "brand", "settings", "command", "archives", "billing", "cost", "effort", "todo", "notify"];
      const enabled = (feature) => {
        const config = live.getSnapshot();
        if (feature === "cost" && compat.getSnapshot().some((issue) => issue.feature === "billing")) return false;
        if (feature === "notify") return ["notifySystem", "notifyToast", "notifySound"].some((key) => config[key] !== false) &&
          ["notifyCurrent", "notifyOthers", "notifyAway"].some((key) => config[key] !== false);
        if (feature === "todo") return config.todoCenter !== false || config.rowStatus !== false;
        const key = { brand: "brand", billing: "billing", cost: "billing", effort: "effortSlider" }[feature];
        return !key || config[key] !== false;
      };
      ctx.effect(() => {
        const timer = setTimeout(() => {
          for (const feature of expected) {
            if (enabled(feature) && !compatRegistered.has(feature) && !compat.getSnapshot().some((issue) => issue.feature === feature)) compat.report(feature, "absent", "");
          }
        }, 20000);
        return () => clearTimeout(timer);
      });
      ctx.effect(() => () => compat.reset());
      ctx.effect(() => ctx.locale.register(NS, { zh, en }));
      const t = ctx.locale.bind(NS);
      const notify = registerNotify(ctx, t);
      registerWhatsNew(ctx, t);
      registerWeekly(ctx, t);
      registerHeroBackground(ctx);
      const resume = registerResume(ctx);
      registerArchives(ctx, t);
      registerStyles(ctx);
      registerBrand(ctx);
      registerStatusTimes(ctx);
      registerTodo(ctx, t);
      registerEffort(ctx, t);
      const previews = {};
      const runPreview = (id) => previews[id]?.();
      const settings = registerSettings(ctx, t, runPreview, scope);
      registerBilling(ctx, { notify, saveSetting: settings?.saveSetting });
      const staged = () => settings?.staged() || CONFIG;
      previews.preview = () => globalThis.__rhineSplash?.replay({ ...staged(), enabled: true });
      previews.previewResume = () => resume.preview(staged().resumeEffect);
      previews.previewNotify = () => notify.preview(staged());
      registerCommand(ctx, t, scope, runPreview);
    }
    module.exports = { inject: ["slots", "locale", "configForms", "commandUi"], apply,
      internals: { records, weeklyBadgeText, isPeak, priceOf, costOf, billingLedgers, weeklyCells, weeklyDelta, weeklyHighlights, weeklyAverage, weeklySaved, tokenWan, readRunLog, addRun, writeRunLog, runTimes, weekStartOf, isoWeek, weeklyReport, reportWeeks, durationText, weeklyState, WeeklyReport, openWeekly, paintWeekly, exportWeekly, whatsNewFor, WHATS_NEW, whatsNewState, WhatsNewCard, Card, SettingsSection, updates, balanceAlertStep, balanceLow, inQuietHours, instantBack, ANSWER_MARK, AnswerNowMark, dayKey, readDayLog, addToDayLog, writeDayLog, rangeDays, costSummary, costReport, readLedger, usageBuckets, recordUsage, budgetThresholds, balance, usageTick, registerNotify, normalize, live, applyRoot, specs, NEXT_LAUNCH, FIELDS, SECTIONS, PREVIEWS, zh, en, fill, todoKind, todoAgo, todoGroups, statusTimes, missing, compat, safe, deleteRequest, CostPage, BillingWidget } };
    return module.exports;
  }
});

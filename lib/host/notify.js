import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { readJson, refuseRequest, reply } from './http.js';

/**
 * The AppUserModelID of the Harness Start-menu shortcut. The desktop app never calls
 * `app.setAppUserModelId`, so Electron's own web notifications run under an id with no
 * shortcut and Windows drops them; toasts sent under this id show as DeepSeek Harness.
 */
export const DESKTOP_APP_ID = 'com.deepseek.dsh';

// Reads its input from RHINE_TOAST (base64 JSON) so nothing is interpolated into the script.
// A click opens dsh://open, which Harness registers and answers by focusing its window.
const SCRIPT = String.raw`$ErrorActionPreference = 'Stop'
$in = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:RHINE_TOAST)) | ConvertFrom-Json
[void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
[void][Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime]
$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($in.app)
$setting = [string]$notifier.Setting
if ($setting -like 'Disabled*') { Write-Output "blocked"; exit 0 }
$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml('<toast activationType="protocol" launch="dsh://open"><visual><binding template="ToastGeneric"><text></text><text></text></binding></visual><audio silent="true"/></toast>')
$texts = $xml.GetElementsByTagName('text')
[void]$texts.Item(0).AppendChild($xml.CreateTextNode([string]$in.title))
[void]$texts.Item(1).AppendChild($xml.CreateTextNode([string]$in.body))
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
$toast.Tag = [string]$in.tag
$toast.Group = 'rhine-splash'
$notifier.Show($toast)
Write-Output 'shown'`;

/** Validate a toast request: short single-line strings only. */
export function toastPayload(body) {
  const text = (value, max) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : undefined;
  const title = text(body?.title, 120), status = text(body?.body, 200);
  const tag = typeof body?.tag === 'string' ? body.tag.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) : '';
  if (!title || status === undefined) return null;
  return { app: DESKTOP_APP_ID, title, body: status, tag: tag || 'rhine' };
}

/** Show one Windows toast through Windows PowerShell; resolves `shown`, `blocked` or `failed`. */
export function showWindowsToast(payload, { spawnProcess = spawn, timeout = 15000 } = {}) {
  const shell = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  return new Promise((resolve) => {
    let output = '', settled = false;
    const finish = (status) => { if (!settled) { settled = true; clearTimeout(timer); resolve(status); } };
    let child;
    try {
      child = spawnProcess(shell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
        '-EncodedCommand', Buffer.from(SCRIPT, 'utf16le').toString('base64')], {
        env: { ...process.env, RHINE_TOAST: Buffer.from(JSON.stringify(payload)).toString('base64') },
        stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true,
      });
    } catch { resolve('failed'); return; }
    const timer = setTimeout(() => { child.kill(); finish('failed'); }, timeout);
    child.stdout?.on('data', (chunk) => { output += chunk; });
    child.once('error', () => finish('failed'));
    child.once('close', (code) => {
      const status = output.trim().split(/\s+/).pop();
      finish(code === 0 && (status === 'shown' || status === 'blocked') ? status : 'failed');
    });
  });
}

/** Return the route registrar for Windows toasts, used by the desktop client on Windows. */
export function registerNotify(ctx, { platform = process.platform, show = showWindowsToast } = {}) {
  let running = 0;
  return (child) => {
    child.effect(() => child.webServer.register({
      kind: 'exact', path: '/rhine-splash/notify',
      handler: async (req, res) => {
        if (refuseRequest(ctx, req, res, 'POST')) return;
        if (platform !== 'win32') { reply(res, 404, { status: 'unsupported' }); return; }
        try {
          const body = await readJson(req, 2048);
          const payload = body ? toastPayload(body) : null;
          if (!payload) { reply(res, 400, { status: 'invalid' }); return; }
          // Each toast is one short-lived PowerShell; a burst beyond a few is dropped.
          if (running >= 3) { reply(res, 429, { status: 'busy' }); return; }
          running++;
          try { reply(res, 200, { status: await show(payload) }); }
          finally { running--; }
        } catch {
          reply(res, 500, { status: 'failed' });
        }
      },
    }));
  };
}

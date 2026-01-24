import { exec, execFile } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

interface WindowInfo {
  title: string;
  processName: string;
  pid?: number;
}

// Window info caching to reduce system calls
const WINDOW_CACHE_TTL = 200; // ms
let lastWindowInfo: { timestamp: number; info: WindowInfo } | null = null;
let inFlightRequest: Promise<WindowInfo> | null = null;

async function getWindowsActiveWindow(): Promise<WindowInfo> {
  try {
    const script = `
      Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class Win32 {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Auto)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@;
      $hwnd = [Win32]::GetForegroundWindow();
      $sb = New-Object System.Text.StringBuilder 1024;
      [Win32]::GetWindowText($hwnd, $sb, $sb.Capacity) | Out-Null;
      $pid = 0;
      [Win32]::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null;
      $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue;
      $info = [PSCustomObject]@{
        processName = if ($proc) { $proc.ProcessName } else { "" };
        title = $sb.ToString();
        pid = [int]$pid
      };
      $info | ConvertTo-Json -Compress
    `;

    const { stdout } = await execFileAsync('powershell', [
      '-NoProfile',
      '-Command',
      script,
    ]);

    const parsed = JSON.parse(stdout.trim());
    return {
      title: parsed.title || 'No Window Title',
      processName: parsed.processName || 'Unknown',
      pid: parsed.pid,
    };
  } catch (error) {
    console.error('Error getting Windows active window:', error);
    return { title: 'Unknown', processName: 'Unknown' };
  }
}

async function getMacActiveWindow(): Promise<WindowInfo> {
  try {
    const script = `
      tell application "System Events"
        set frontApp to first application process whose frontmost is true
        set appName to name of frontApp
        set windowTitle to ""
        try
          set windowTitle to name of first window of frontApp
        end try
        return {appName, windowTitle}
      end tell
    `;

    const { stdout } = await execAsync(`osascript -e '${script}'`);
    const [processName, title] = stdout
      .trim()
      .split(',')
      .map((s) => s.trim());

    return {
      title: title || 'No Window Title',
      processName: processName,
    };
  } catch (error) {
    console.error('Error getting macOS active window:', error);
    return { title: 'Unknown', processName: 'Unknown' };
  }
}

async function getLinuxActiveWindow(): Promise<WindowInfo> {
  try {
    // First try xdotool
    const { stdout: windowId } = await execAsync('xdotool getactivewindow');
    const { stdout: windowInfo } = await execAsync(
      `xdotool getwindowname ${windowId}`,
    );
    const { stdout: pid } = await execAsync(`xdotool getwindowpid ${windowId}`);
    const { stdout: processName } = await execAsync(`ps -p ${pid} -o comm=`);

    return {
      title: windowInfo.trim(),
      processName: processName.trim(),
      pid: parseInt(pid.trim(), 10),
    };
  } catch (error) {
    try {
      // Fallback to wmctrl
      const { stdout } = await execAsync('wmctrl -l -p');
      const activeWindow = stdout
        .split('\n')
        .find((line) => line.includes('* '));

      if (activeWindow) {
        const [_, pid, machine, title] = activeWindow.split(/\s+/, 4);
        const { stdout: processName } = await execAsync(
          `ps -p ${pid} -o comm=`,
        );

        return {
          title: title.trim(),
          processName: processName.trim(),
          pid: parseInt(pid, 10),
        };
      }
    } catch (fallbackError) {
      console.error('Error getting Linux active window:', fallbackError);
    }
    return { title: 'Unknown', processName: 'Unknown' };
  }
}

export async function getCurrentWindow(): Promise<WindowInfo> {
  const now = Date.now();

  // Return cached result if still valid
  if (lastWindowInfo && now - lastWindowInfo.timestamp < WINDOW_CACHE_TTL) {
    return lastWindowInfo.info;
  }

  // Return in-flight request if one exists (request deduplication)
  if (inFlightRequest) {
    return inFlightRequest;
  }

  // Create new request
  inFlightRequest = (async () => {
    let info: WindowInfo;
    switch (process.platform) {
      case 'win32':
        info = await getWindowsActiveWindow();
        break;
      case 'darwin':
        info = await getMacActiveWindow();
        break;
      case 'linux':
        info = await getLinuxActiveWindow();
        break;
      default:
        info = { title: 'Unknown', processName: 'Unknown' };
    }

    lastWindowInfo = { timestamp: Date.now(), info };
    return info;
  })();

  try {
    return await inFlightRequest;
  } finally {
    inFlightRequest = null;
  }
}

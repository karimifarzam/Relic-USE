import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface WindowInfo {
  title: string;
  processName: string;
  pid?: number;
}

async function getWindowsActiveWindow(): Promise<WindowInfo> {
  return {
    title: 'test',
    processName: 'test',
    pid: 1,
  };
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
  switch (process.platform) {
    case 'win32':
      return getWindowsActiveWindow();
    case 'darwin':
      return getMacActiveWindow();
    case 'linux':
      return getLinuxActiveWindow();
    default:
      return { title: 'Unknown', processName: 'Unknown' };
  }
}

// Typed contract between Electron main, the preload bridge and the renderer.
// Everything the renderer can ask the machine to do is declared here; nothing else is exposed.

import type { EventAutomation } from './events.ts'
import type { MenuBarLayout } from './menu-bar.ts'
import type { OfficeApp } from './office/files.ts'
import type { ColorScheme, ThemeColors } from './theme.ts'

/** `waiting`: there is no NasTech Agent to start yet; the shell starts one as soon as it is installed. */
export type BackendPhase = 'idle' | 'resolving' | 'waiting' | 'starting' | 'ready' | 'restarting' | 'failed' | 'stopped'

export interface BackendRuntime {
  /** How the runtime was found: env override, managed install, PATH shim, or a backend already running (BANTU_OS_BACKEND_URL). */
  kind: 'env' | 'managed' | 'path' | 'attached'
  label: string
  /** Source checkout root when known (managed install / env override). */
  root?: string
  command: string[]
}

export interface BackendState {
  phase: BackendPhase
  attempt: number
  runtime?: BackendRuntime
  wsUrl?: string
  baseUrl?: string
  port?: number
  error?: string
  logTail: string[]
  /** Another app's messaging gateway on this NasTech home (NasTech Desktop, say): its pid. */
  sharedGateway?: number
  /** Why the system tools could not be set up in NasTech this start (a failed `nastech` step). */
  bridgeError?: string
  /** While waiting on the Bantu OS image: how installing NasTech Agent goes (offline, installing, retrying). */
  install?: string
}

export interface RestRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
}

export interface SystemInfo {
  hostname: string
  platform: NodeJS.Platform
  arch: string
  osVersion: string
  osName: string
  cpuModel: string
  cpuCount: number
  totalMemory: number
  userName: string
  /** Account display name when the platform exposes one. */
  fullName?: string
  homeDir: string
}

export interface DiskUsage {
  mount: string
  total: number
  free: number
  used: number
}

export interface BatteryStatus {
  present: boolean
  percent?: number
  charging?: boolean
}

export interface SystemStats {
  sampledAt: number
  cpuPercent: number
  loadAverage: [number, number, number]
  memoryTotal: number
  memoryUsed: number
  memoryFree: number
  uptimeSeconds: number
  disks: DiskUsage[]
  battery: BatteryStatus
}

export interface ProcessInfo {
  pid: number
  ppid: number
  user: string
  cpuPercent: number
  memPercent: number
  rssBytes: number
  command: string
  name: string
}

/** The menu bar's quick panels. */
export type StatusPanelId = 'wifi' | 'bluetooth' | 'audio' | 'display' | 'power' | 'clock'

export interface WifiNetwork {
  ssid: string
  /** 0 to 100. */
  signal: number
  secure: boolean
  active: boolean
  /** A saved connection exists, so it joins without a password. */
  known: boolean
}

export interface WifiState {
  /** False when there is no Wi-Fi hardware or no NetworkManager. */
  available: boolean
  enabled: boolean
  connected?: string
  networks: WifiNetwork[]
}

export interface BluetoothDevice {
  address: string
  name: string
  paired: boolean
  connected: boolean
  /** freedesktop icon name such as audio-headphones or input-mouse. */
  icon?: string
  battery?: number
}

export interface BluetoothState {
  available: boolean
  powered: boolean
  devices: BluetoothDevice[]
}

export interface AudioDevice {
  /** The PipeWire/PulseAudio node name (what the default and volume calls take). */
  id: string
  name: string
  isDefault: boolean
  /** 0 to 150. */
  volume: number
  muted: boolean
}

export interface AudioState {
  available: boolean
  outputs: AudioDevice[]
  inputs: AudioDevice[]
}

export interface DisplayMode {
  width: number
  height: number
  /** Hz. */
  refresh: number
}

export interface DisplayInfo {
  name: string
  label: string
  enabled: boolean
  width: number
  height: number
  refresh: number
  scale: number
  modes: DisplayMode[]
}

export interface DisplayState {
  available: boolean
  displays: DisplayInfo[]
  /** Built-in backlight, 0 to 100, when there is one. */
  brightness?: number
}

export interface PowerState {
  available: boolean
  battery: BatteryStatus
  /** e.g. "about 3 hours left" or "full in 40 minutes". */
  timeRemaining?: string
  /** power-profiles-daemon: performance, balanced, power-saver. */
  profile?: string
  profiles: string[]
}

export type StatusPanelState =
  | { panel: 'wifi'; wifi: WifiState }
  | { panel: 'bluetooth'; bluetooth: BluetoothState }
  | { panel: 'audio'; audio: AudioState }
  | { panel: 'display'; display: DisplayState }
  | { panel: 'power'; power: PowerState }

/** What the quick panels can change. */
export type ControlAction =
  | { panel: 'wifi'; action: 'enable'; enabled: boolean }
  | { panel: 'wifi'; action: 'scan' }
  | { panel: 'wifi'; action: 'connect'; ssid: string; password?: string }
  | { panel: 'wifi'; action: 'disconnect' }
  | { panel: 'wifi'; action: 'forget'; ssid: string }
  | { panel: 'bluetooth'; action: 'power'; enabled: boolean }
  | { panel: 'bluetooth'; action: 'scan' }
  | { panel: 'bluetooth'; action: 'connect' | 'disconnect' | 'pair' | 'remove'; address: string }
  | { panel: 'audio'; action: 'default'; kind: 'output' | 'input'; id: string }
  | { panel: 'audio'; action: 'volume'; kind: 'output' | 'input'; id?: string; percent?: number; muted?: boolean }
  | { panel: 'display'; action: 'brightness'; percent: number }
  | { panel: 'display'; action: 'scale'; name: string; scale: number }
  | { panel: 'display'; action: 'mode'; name: string; mode: DisplayMode }
  | { panel: 'display'; action: 'enable'; name: string; enabled: boolean }
  | { panel: 'power'; action: 'profile'; profile: string }

export interface InstalledApp {
  name: string
  path: string
  bundleId?: string
  /** LSApplicationCategoryType, e.g. public.app-category.developer-tools. */
  category?: string
}

export interface NetworkStatus {
  online: boolean
  defaultInterface?: string
  ipv4?: string
  wifi?: { connected: boolean; ssid?: string; interface?: string }
}

export interface CalendarEvent {
  id: string
  title: string
  start: number
  end: number
  allDay: boolean
  location?: string
  notes?: string
  calendar?: string
  url?: string
}

export interface CalendarResult {
  status: 'authorized' | 'denied' | 'not-determined' | 'restricted' | 'unavailable'
  events: CalendarEvent[]
  error?: string
}

export interface RecentFile {
  path: string
  name: string
  extension: string
  size: number
  modifiedAt: number
  lastUsedAt: number
  kind: 'file' | 'directory'
}

/** A project folder with recent activity: a git repository or any folder under the projects roots. */
export interface ProjectActivity {
  path: string
  name: string
  /** Current branch; absent when the folder is not a git repository. */
  branch?: string
  /** Files with uncommitted changes. */
  changed: number
  /** The first few of them, relative to the folder. */
  changedFiles: string[]
  /** The last few commits, newest first. */
  commits: { subject: string; at: number }[]
  /** Newest change seen (a commit, a changed file or the folder itself), epoch ms. */
  touchedAt: number
}

/**
 * What Bantu OS can see of the user's recent work, for "Pick up where you left off": documents,
 * project folders and running apps, minus everything the user excluded. Never window titles or
 * screen contents.
 */
export interface ContextSnapshot {
  takenAt: number
  files: RecentFile[]
  projects: ProjectActivity[]
  /** Names of the apps running now. */
  apps: string[]
}

/** The user came back after sleep, a locked screen or a long idle stretch. */
export interface ContextReturn {
  reason: 'resume' | 'unlock' | 'idle'
  awayMs: number
}

export interface ContinuityItem {
  kind: 'file' | 'folder' | 'project' | 'chat'
  /** Absolute path, or the stored session id for chats. */
  ref: string
  label: string
}

/** One piece of work NasTech thinks the user will want to resume. */
export interface ContinuityThread {
  id: string
  title: string
  summary: string
  /** Where the work stopped, in one short sentence. */
  stopped: string
  /** A suggested next step; the user starts it. */
  next?: { label: string; prompt: string }
  items: ContinuityItem[]
}

export interface ContinuityPrefs {
  /** Null until the user answers the offer on the Overview: the catch-up sends names to the model provider. */
  enabled: boolean | null
  /** Folders (absolute paths) and words Bantu never looks at; a word hides any path, chat or event containing it. */
  exclude: string[]
  /** Threads from the last catch-up. */
  threads?: ContinuityThread[]
  updatedAt?: number
  /** Ids of threads the user dismissed. */
  dismissed?: string[]
}

/** A program on this computer crashed: a macOS crash report or a Linux core dump. */
export interface CrashReport {
  id: string
  /** The program's name as people know it ("Safari", "firefox"). */
  app: string
  pid?: number
  /** Executable path, when the report names it. */
  exe?: string
  /** macOS: the `.ips` crash report file. */
  reportPath?: string
  /** Signal or exception, e.g. "SIGSEGV" or "EXC_BAD_ACCESS (SIGSEGV)". */
  reason?: string
  /** Epoch ms. */
  at: number
  source: 'macos' | 'coredump'
}

export interface CrashHelpPrefs {
  /** Offer to have NasTech diagnose crashes (on by default). */
  enabled: boolean
  /** Program names whose crashes stay quiet (compared case-insensitively). */
  muted: string[]
}

export interface ImageInfo {
  width: number
  height: number
}

export interface DirEntry {
  name: string
  path: string
  kind: 'file' | 'directory' | 'symlink' | 'other'
  size: number
  modifiedAt: number
  hidden: boolean
  extension: string
}

export interface FilePreview {
  path: string
  kind: 'text' | 'image' | 'binary' | 'too-large' | 'directory'
  size: number
  /** Text content (utf-8) or a data URL for images. */
  content?: string
  truncated?: boolean
  mime?: string
}

export interface TerminalCreateOptions {
  cwd?: string
  cols: number
  rows: number
  /** A coding agent from the install catalog (its id) to run in the tab instead of a bare shell. */
  program?: string
}

/** One entry of the install catalog (linux/catalog/*.json), with its state on this machine. */
export interface CatalogEntryView {
  id: string
  label: string
  description: string
  group: string
  installed: boolean
  /** Installed by one of the catalog's own methods, so removing it from here works. */
  removable?: boolean
  /** It can be installed here (the right OS, architecture, package manager). */
  available: boolean
  /** How it would install: flatpak, dnf, pacman, aur, npm, mise, script, webapp, link, brew, brew-cask. */
  method: string | null
  /** Why it cannot be installed here. */
  reason?: string
  /** A coding agent that runs in the Terminal. */
  terminal?: boolean
  /** A terminal app Super+Return can open instead of Bantu's terminal. */
  terminalApp?: string
  /** A local model server NasTech can use. */
  nastech?: 'ollama' | 'lmstudio'
  bin?: string
  /** For `link` installs: the download page. */
  url?: string
}

export interface CatalogGroupView {
  id: string
  label: string
  description: string
  entries: CatalogEntryView[]
}

export interface SetupState {
  /** The Bantu OS image has not been set up by its owner yet. */
  needed: boolean
  user: string
  /** The name Bantu greets with (blank until setup asks). */
  name: string
}

export interface SetupResult {
  ok: boolean
  error?: string
}

export interface CatalogResult {
  ok: boolean
  /** The last lines of the installer's output. */
  output: string
}

export interface TerminalHandle {
  id: string
  pid: number
  shell: string
}

export interface SpaceDef {
  id: string
  name: string
  color: string
  cwd?: string
}

/** Which pipeline turns speech into a NasTech turn and back. See docs/VOICE.md. */
export type VoiceEngine = 'chained' | 'live'

export interface VoicePrefs {
  /** Master switch: when off, no microphone is ever opened and the orb stays hidden. */
  enabled: boolean
  engine: VoiceEngine
  /** Arm the backend "hey nastech" detector with client-captured audio while the shell runs. */
  wakeWord: boolean
  /** Electron accelerator toggling a conversation from anywhere (empty disables the hotkey). */
  hotkey: string
  /** Seconds the mic keeps listening for a follow-up after NasTech finishes speaking. */
  followUpSeconds: number
  /** Speak `notification.show` bodies (missions, reminders) aloud while voice is enabled. */
  announceNotifications: boolean
  /** Show NasTech's own tool results on screen (memory, automations, files) even outside a voice conversation. */
  followNasTech: boolean
  /** Set once Bantu OS has tuned local speech recognition (model + vocabulary), so a later user choice is never overwritten. */
  sttTuned: boolean
  /** Live engine: close the paid session after this many idle seconds. */
  liveIdleSeconds: number
  /** Live engine: refuse to open new sessions once today's minutes reach this cap (0 = no cap). */
  liveDailyCapMinutes: number
  /** Live engine: seconds of session time used on `day` (YYYY-MM-DD, local). */
  liveUsage: { day: string; seconds: number }
}

export type MicPermission = 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown'

/** Keyboard modifiers for `EditAction` key presses (Electron accelerator names). */
export type KeyModifier = 'shift' | 'control' | 'alt' | 'meta'

/** Text and editing actions performed on whatever is focused in a Bantu OS window. */
export type EditAction =
  | { kind: 'insert'; text: string }
  | { kind: 'key'; key: string; modifiers?: KeyModifier[] }
  | { kind: 'copy' | 'cut' | 'paste' | 'selectAll' | 'undo' | 'redo' | 'delete' | 'unselect' }

/** Main -> renderer: run a registry command, list the catalogue, or describe the shell state. */
export type OsControlRequest =
  | { requestId: string; kind: 'run'; command: string; args: Record<string, unknown>; source: 'agent' | 'cli' | 'plugin' }
  | { requestId: string; kind: 'list' }
  | { requestId: string; kind: 'state' }

export interface OsControlReply {
  requestId: string
  /** A `CommandResult`, a command list, or a state snapshot; `error` when the renderer failed outright. */
  result?: unknown
  error?: string
}

/** Authenticated WebSocket endpoints the renderer may dial besides the gateway. */
export type AudioWsKind = 'speak-stream'

export interface BantuOSPrefs {
  fullscreenOnLaunch: boolean
  reduceMotion: boolean
  accent: 'blue' | 'ice' | 'violet'
  theme: 'ocean' | 'graphite'
  /** The installed theme in use (a folder name under the theme directories). */
  themeName?: string
  /** Colours of a theme without a hand-tuned preset; the shell derives its whole palette from them. */
  themeColors?: ThemeColors
  themeScheme?: ColorScheme
  /** Restyle Bantu OS when NasTech's skin changes (`/skin` in a chat). */
  followNasTechSkin?: boolean
  /** Font families for the interface and for code, tried before the built-in stacks. */
  fonts?: { ui?: string; mono?: string }
  /** Show the model plan's usage as a small meter in the menu bar. */
  usageInMenuBar?: boolean
  /** The menu bar's items (order, hidden ones) and clock; `normalizeMenuBar` fills the gaps. */
  menuBar?: MenuBarLayout
  /** NasTech automations that run when something happens rather than on a schedule. */
  eventAutomations?: EventAutomation[]
  /** Toasts, system notifications and spoken announcements stay quiet; the bell still collects them. */
  doNotDisturb?: boolean
  /** The drawn wallpaper and a clock after this many idle minutes. */
  screensaver?: { enabled: boolean; afterMinutes: number }
  /** Bantu OS Linux: minutes of inactivity before locking, turning the screens off and suspending (0 = never). */
  idle?: IdleTimings
  /** Bantu OS Linux: Bantu's keys, or Omarchy-style Super+C, X and V for copy, cut and paste everywhere. */
  keymap?: 'bantu' | 'omarchy'
  /** Bantu OS Linux: the terminal Super+Return opens: Bantu's own, or a catalog terminal (ghostty, alacritty, kitty, foot). */
  defaultTerminal?: string
  /** Absolute path or file:// URL of a custom wallpaper image. */
  wallpaper?: string
  defaultCwd?: string
  /** Where "build …" creates project folders (default ~/Projects). */
  projectsRoot?: string
  spaces: SpaceDef[]
  activeSpace: string
  favorites: string[]
  /** Files the user removed from Recents (the system's own recent list is left alone). */
  hiddenRecents?: string[]
  /** Persisted window bounds per app id. */
  windowBounds?: Record<string, { x: number; y: number; width: number; height: number }>
  /** Main-window sidebar: expanded width in px and whether it is collapsed to icons. */
  sidebar?: { width: number; collapsed: boolean }
  /** Slide the Dock off-screen until the cursor reaches the bottom edge (default on). */
  dockAutoHide?: boolean
  /** The name on the comments and notes the person adds in Bantu Office, once they confirmed it; unset until then. */
  commentName?: string
  voice: VoicePrefs
  continuity: ContinuityPrefs
  crashHelp: CrashHelpPrefs
}

export type ScreenshotMode = 'region' | 'window' | 'screen'

/** macOS capture tools (Bantu OS Linux runs its own through the CLI). */
export type CaptureTool = 'colour' | 'qr' | 'text'

export interface CaptureToolResult {
  /** What was copied: #rrggbb, the code's contents, or the text read. Empty when nothing was found. */
  text?: string
  lines?: number
  /** Escape before anything was picked or selected. */
  cancelled?: boolean
}

export interface RecordingState {
  recording: boolean
  /** The file being written, then the finished one. */
  file?: string
  startedAt?: number
  audio?: boolean
}

export interface IdleTimings {
  lockAfter: number
  screenOffAfter: number
  suspendAfter: number
}

/** Quick switches in the menu bar and the control menu. */
export type SwitchName = 'nightLight' | 'doNotDisturb' | 'stayAwake' | 'screensaver'

export interface SwitchState {
  /** Warmer colours: wlsunset on Bantu OS Linux; null where Bantu OS cannot switch it (macOS has Night Shift). */
  nightLight: boolean | null
  doNotDisturb: boolean
  /** The screens stay on and nothing locks or sleeps on its own. */
  stayAwake: boolean
  screensaver: boolean
}

export interface AuditEntry {
  ts: string
  tool: string
  tier: string
  action?: string
  decision: string
  ok: boolean
  error?: string
  summary?: string
  args?: Record<string, unknown>
}

export interface WindowState {
  fullscreen: boolean
  focused: boolean
}

/**
 * How the shell is composed on screen.
 * - `desktop`: one fullscreen window draws wallpaper, menu bar, dock and windows (macOS, cage).
 * - `panels`: a real compositor (niri) manages every window; the shell is several windows, one per surface.
 */
export type ShellMode = 'desktop' | 'panels'

/** Which part of the shell a renderer window is. `window:<appId>` hosts one floating NasTech app. */
export type ShellSurface = 'desktop' | 'menubar' | 'dock' | 'main' | 'command' | 'panel' | 'screensaver' | 'wallpaper' | 'emoji' | `window:${string}`

/** A window the compositor manages (any client, including the shell's own windows). */
export interface WmWindow {
  id: number
  title: string
  appId: string
  pid: number | null
  workspaceId: number | null
  focused: boolean
  floating: boolean
  urgent: boolean
  /** True for the shell's own windows (menu bar, dock, NasTech window, floating apps). */
  ours: boolean
}

export interface WmWorkspace {
  id: number
  idx: number
  name: string | null
  output: string | null
  active: boolean
  focused: boolean
  activeWindowId: number | null
}

export interface WmState {
  /** False when no compositor IPC is available (desktop mode). */
  available: boolean
  windows: WmWindow[]
  workspaces: WmWorkspace[]
  focusedWindowId: number | null
}

/** Compositor actions the renderer may request. Arguments mirror `niri msg action`. */
export type WmAction =
  | { type: 'focus-window'; id: number }
  | { type: 'close-window'; id: number }
  | { type: 'focus-workspace'; ref: string | number }
  | { type: 'move-window-to-workspace'; id: number; ref: string | number }
  | { type: 'toggle-floating'; id: number }
  | { type: 'fullscreen'; id: number }
  | { type: 'maximize-column' }
  | { type: 'toggle-overview' }
  | { type: 'screenshot'; what: 'screen' | 'window' | 'select' }
  | { type: 'raw'; args: string[] }

/** A command delivered to a surface: from the `bantu-os` CLI (hotkeys), or relayed between surfaces. */
export interface ShellCommand {
  type: string
  args?: string[]
  text?: string
  attachments?: string[]
  /** The compositor's focused window when the command was issued (context for "ask"). */
  context?: WmWindow | null
  payload?: Record<string, unknown>
}

/** A rectangle in the renderer's CSS pixels; main converts to device-independent pixels. */
export interface WebViewBounds {
  x: number
  y: number
  width: number
  height: number
  /** Corner radius matching the frame around the view (CSS px). */
  radius?: number
}

export interface WebOpenOptions {
  /** Fixed window title; when omitted the page title is reported through `title` events. */
  title?: string
  /** Previews only: the project folder whose local files the preview may show. */
  root?: string
}

/** Main -> renderer: lifecycle of one embedded web view (`window.bantuOS.web`). */
export type WebViewEvent =
  | { id: string; type: 'title'; title: string }
  | { id: string; type: 'url'; url: string }
  | { id: string; type: 'loading'; loading: boolean }
  | { id: string; type: 'error'; error: string }
  | { id: string; type: 'closed' }

/** One entry of a project listing (`fs.listTree`), for the Studio's file tree. */
export interface TreeEntry {
  path: string
  kind: 'file' | 'directory'
}

/** Main -> renderer: files changed under a watched project folder (`fs.watchTree`). */
export interface TreeChangedEvent {
  watchId: string
  paths: string[]
}

export interface EnvInfo {
  platform: NodeJS.Platform
  nastechHome: string
  homeDir: string
  version: string
  isDev: boolean
  shellMode: ShellMode
}

/** Channel names, table-driven so preload and main cannot drift. */
export const IPC = {
  backendGetState: 'bantu-os:backend:get-state',
  backendState: 'bantu-os:backend:state',
  backendRestart: 'bantu-os:backend:restart',
  backendRest: 'bantu-os:backend:rest',
  backendLogTail: 'bantu-os:backend:log-tail',

  systemInfo: 'bantu-os:system:info',
  systemStats: 'bantu-os:system:stats',
  systemStatsPush: 'bantu-os:system:stats-push',
  systemStatsSubscribe: 'bantu-os:system:stats-subscribe',
  systemProcesses: 'bantu-os:system:processes',

  appsList: 'bantu-os:apps:list',
  appsLaunch: 'bantu-os:apps:launch',
  appsIcon: 'bantu-os:apps:icon',

  fsHome: 'bantu-os:fs:home',
  fsReadDir: 'bantu-os:fs:read-dir',
  fsReadFile: 'bantu-os:fs:read-file',
  fsReveal: 'bantu-os:fs:reveal',
  fsOpenPath: 'bantu-os:fs:open-path',
  fsOpenIn: 'bantu-os:fs:open-in',
  fsRecent: 'bantu-os:fs:recent',
  /** Find files by name under the home folder (Spotlight on macOS). */
  fsFind: 'bantu-os:fs:find',
  fsThumbnail: 'bantu-os:fs:thumbnail',
  fsImageInfo: 'bantu-os:fs:image-info',
  fsWriteText: 'bantu-os:fs:write-text',
  fsMkdir: 'bantu-os:fs:mkdir',
  fsRename: 'bantu-os:fs:rename',
  fsTrash: 'bantu-os:fs:trash',
  fsExportPdf: 'bantu-os:fs:export-pdf',
  fsPickFiles: 'bantu-os:fs:pick-files',
  fsDirSize: 'bantu-os:fs:dir-size',
  /** A bounded recursive listing of a project folder (build output and dependencies skipped). */
  fsListTree: 'bantu-os:fs:list-tree',
  fsWatchTree: 'bantu-os:fs:watch-tree',
  fsUnwatchTree: 'bantu-os:fs:unwatch-tree',
  /** Main -> renderer: `TreeChangedEvent`. */
  fsTreeChanged: 'bantu-os:fs:tree-changed',

  systemNetwork: 'bantu-os:system:network',
  calendarToday: 'bantu-os:calendar:today',

  /** Recent documents, project folders and running apps, for "Pick up where you left off". */
  contextSnapshot: 'bantu-os:context:snapshot',
  /** Main tells the windows the user is back after sleep, a lock or a long idle stretch. */
  contextReturned: 'bantu-os:context:returned',

  /** The crashes seen since Bantu OS started, newest first (offers arrive as a `crash` ShellCommand). */
  crashRecent: 'bantu-os:crash:recent',

  /** Installed themes (built in and the user's own). */
  themeList: 'bantu-os:theme:list',
  /** Apply a theme everywhere: the shell, NasTech's skin and, on Bantu OS Linux, the whole session. */
  themeApply: 'bantu-os:theme:apply',
  /** Save a theme the shell made (from an image) into the user's theme folder. */
  themeSave: 'bantu-os:theme:save',
  /** A small PNG of an image (data URL) to take theme colours from. */
  themeSample: 'bantu-os:theme:sample',
  /** Install a theme from a git repository (colours and images only). */
  themeInstall: 'bantu-os:theme:install',
  /** Font families installed on this computer. */
  fontsList: 'bantu-os:fonts:list',

  /** Let the person select part of the screen; resolves with the PNG's path, or null when cancelled. */
  captureRegion: 'bantu-os:capture:region',
  /** A screenshot of a region, the focused window or the whole screen, saved where screenshots go. */
  captureScreenshot: 'bantu-os:capture:screenshot',
  /** Start, stop or toggle a screen recording; resolves with the recording state. */
  captureRecord: 'bantu-os:capture:record',
  captureRecordState: 'bantu-os:capture:record-state',
  captureTool: 'bantu-os:capture:tool',
  /** Main -> renderer: a recording started or stopped (`RecordingState`). */
  captureRecordChanged: 'bantu-os:capture:record-changed',
  /** An image file as a data URL, for the markup editor. */
  captureReadImage: 'bantu-os:capture:read-image',
  /** Write a PNG (data URL) inside the home folder. */
  captureSaveImage: 'bantu-os:capture:save-image',
  /** Put an image (a file or a data URL) on the clipboard. */
  captureCopyImage: 'bantu-os:capture:copy-image',
  /** Ask the OS for camera access (macOS), for the camera bubble. */
  cameraRequest: 'bantu-os:camera:request',

  /** Type text into whatever app is focused (wtype on Wayland, a paste on macOS). */
  dictationType: 'bantu-os:dictation:type',

  /** The install catalog: groups of software with their state here, and installing or removing one. */
  catalogList: 'bantu-os:catalog:list',
  catalogInstall: 'bantu-os:catalog:install',
  catalogRemove: 'bantu-os:catalog:remove',
  /** Models a local server (Ollama, LM Studio) has, for "Use with NasTech". */
  catalogLocalModels: 'bantu-os:catalog:local-models',

  /** Widget plugins (ADR-019): the installed ones, turning one on or off, git installs, and their messages. */
  pluginsList: 'bantu-os:plugins:list',
  pluginsSetEnabled: 'bantu-os:plugins:set-enabled',
  pluginsAdd: 'bantu-os:plugins:add',
  pluginsUpdate: 'bantu-os:plugins:update',
  pluginsRemove: 'bantu-os:plugins:remove',
  pluginCall: 'bantu-os:plugins:call',
  /** main → renderer: the plugin list changed (installed, enabled, files saved). */
  pluginsChanged: 'bantu-os:plugins:changed',

  /** First-boot setup on the Bantu OS image: whether it is due, the name, the password, done. */
  setupState: 'bantu-os:setup:state',
  setupName: 'bantu-os:setup:name',
  setupPassword: 'bantu-os:setup:password',
  setupFinish: 'bantu-os:setup:finish',

  /** The events main emitted lately (`BantuEvent[]`, newest first), for Settings and the agent. */
  eventsRecent: 'bantu-os:events:recent',

  /** A quick panel's state (Wi-Fi networks, Bluetooth devices, audio devices, displays, power). */
  controlsStatus: 'bantu-os:controls:status',
  /** Change something from a quick panel (`ControlAction`); resolves with the panel's new state. */
  controlsAction: 'bantu-os:controls:action',

  switchesGet: 'bantu-os:switches:get',
  /** Turn one switch on or off; resolves with every switch's state. */
  switchesSet: 'bantu-os:switches:set',
  /** Main -> renderer: a switch changed (from the CLI, a hotkey or another window). */
  switchesChanged: 'bantu-os:switches:changed',

  /** The notification history (the last week), kept across restarts. */
  notificationsLoad: 'bantu-os:notifications:load',
  notificationsSave: 'bantu-os:notifications:save',

  terminalCreate: 'bantu-os:terminal:create',
  terminalWrite: 'bantu-os:terminal:write',
  terminalResize: 'bantu-os:terminal:resize',
  terminalDispose: 'bantu-os:terminal:dispose',
  terminalData: 'bantu-os:terminal:data',
  terminalExit: 'bantu-os:terminal:exit',

  notifyNative: 'bantu-os:notify:native',

  windowState: 'bantu-os:window:state',
  windowGetState: 'bantu-os:window:get-state',
  windowToggleFullscreen: 'bantu-os:window:toggle-fullscreen',
  windowQuit: 'bantu-os:window:quit',

  shellOpenExternal: 'bantu-os:shell:open-external',

  // Embedded web views: http(s) pages rendered inside a Bantu OS window, never the system browser.
  /** Perform an `EditAction` in this window (or in one of its web views). */
  editAction: 'bantu-os:edit:action',
  webOpen: 'bantu-os:web:open',
  /** Show a local file (PDF, image, text, media) in a locked-down viewer view. */
  webOpenFile: 'bantu-os:web:open-file',
  webSetBounds: 'bantu-os:web:set-bounds',
  webClose: 'bantu-os:web:close',
  /** Studio preview: a web page or a file inside the project folder. */
  webOpenPreview: 'bantu-os:web:open-preview',
  webNavigate: 'bantu-os:web:navigate',
  webReload: 'bantu-os:web:reload',
  /** Main -> renderer: title/url/loading changes and `closed`. */
  webEvent: 'bantu-os:web:event',

  prefsGet: 'bantu-os:prefs:get',
  prefsSet: 'bantu-os:prefs:set',
  prefsChanged: 'bantu-os:prefs:changed',

  bridgePolicyRead: 'bantu-os:bridge:policy-read',
  bridgePolicyWrite: 'bantu-os:bridge:policy-write',
  bridgeAuditRead: 'bantu-os:bridge:audit-read',

  envInfo: 'bantu-os:env:info',

  // OS control: main asks the NasTech window to run a registry command (from the control socket /
  // the agent's os_ui tool) and the window replies.
  osControlRequest: 'bantu-os:os-control:request',
  osControlReply: 'bantu-os:os-control:reply',

  // Voice: microphone permission, tokenized audio WebSocket URLs, the global hotkey.
  voiceRequestMicrophone: 'bantu-os:voice:request-microphone',
  voiceMicrophoneStatus: 'bantu-os:voice:microphone-status',
  voiceAudioWsUrl: 'bantu-os:voice:audio-ws-url',
  /** Main -> renderer: the global voice hotkey was pressed. */
  voiceHotkey: 'bantu-os:voice:hotkey',

  // Panels mode: surfaces, cross-window relay, compositor state.
  shellOpen: 'bantu-os:shell:open',
  shellClose: 'bantu-os:shell:close',
  shellRelay: 'bantu-os:shell:relay',
  shellCommand: 'bantu-os:shell:command',
  shellResize: 'bantu-os:shell:resize',
  shellWallpaperFrame: 'bantu-os:shell:wallpaper-frame',
  wmGetState: 'bantu-os:wm:get-state',
  wmState: 'bantu-os:wm:state',
  wmAction: 'bantu-os:wm:action',

  // Phase 2: system services reachable from any surface.
  /** Run a `bantu-os` CLI command (install, reminder, notice, ocr, …); resolves with its output. */
  shellBantuOs: 'bantu-os:shell:bantu-os',
  menuExtensions: 'bantu-os:menu:extensions',
  menuExtensionRun: 'bantu-os:menu:extension-run',
  brandingGet: 'bantu-os:branding:get',
  brandingSet: 'bantu-os:branding:set',
  brandingChanged: 'bantu-os:branding:changed',
  /** Power actions: suspend | reboot | poweroff | logout | lock. */
  shellPower: 'bantu-os:shell:power',
  /** Clipboard history (cliphist): list entries / paste one back to the clipboard. */
  clipboardHistory: 'bantu-os:clipboard:history',
  clipboardPaste: 'bantu-os:clipboard:paste',
  /** Desktop notifications from other apps (org.freedesktop.Notifications), pushed to the NasTech window. */
  notificationsIncoming: 'bantu-os:notifications:incoming',
  notificationsAction: 'bantu-os:notifications:action',

  // Bantu Canvas: `.comp` projects (a manifest and PNG layers), images to open and export, live reload.
  canvasPickOpen: 'bantu-os:canvas:pick-open',
  canvasPickSave: 'bantu-os:canvas:pick-save',
  canvasRead: 'bantu-os:canvas:read',
  canvasReadAsset: 'bantu-os:canvas:read-asset',
  canvasWrite: 'bantu-os:canvas:write',
  canvasReadImage: 'bantu-os:canvas:read-image',
  /** A layered file (PSD, PSB) read in parts, so a large one need not cross in one message. */
  canvasReadPart: 'bantu-os:canvas:read-part',
  /** A colour table (`.cube`) for a Color Lookup layer, as its bytes. */
  canvasReadTable: 'bantu-os:canvas:read-table',
  canvasWriteFile: 'bantu-os:canvas:write-file',
  /** An export written a part at a time: PNG rows compressed by main, or bytes as they are. */
  canvasStreamBegin: 'bantu-os:canvas:stream-begin',
  canvasStreamWrite: 'bantu-os:canvas:stream-write',
  canvasStreamEnd: 'bantu-os:canvas:stream-end',
  canvasStreamAbort: 'bantu-os:canvas:stream-abort',
  canvasWatch: 'bantu-os:canvas:watch',
  canvasUnwatch: 'bantu-os:canvas:unwatch',
  canvasExists: 'bantu-os:canvas:exists',
  canvasFetch: 'bantu-os:canvas:fetch',
  canvasReport: 'bantu-os:canvas:report',
  canvasPresence: 'bantu-os:canvas:presence',
  /** Copied pixels onto the system clipboard as a PNG, and an image off it for Paste. */
  canvasCopyImage: 'bantu-os:canvas:copy-image',
  canvasPasteImage: 'bantu-os:canvas:paste-image',
  /** Main -> renderer: an open project changed on disk (NasTech, a script, Compositor). */
  canvasChanged: 'bantu-os:canvas:changed',
  /** On-device models: what is downloaded, downloads (asked for by the person), and removal. */
  canvasModels: 'bantu-os:canvas:models',
  canvasModelDownload: 'bantu-os:canvas:model-download',
  canvasModelCancel: 'bantu-os:canvas:model-cancel',
  canvasModelRemove: 'bantu-os:canvas:model-remove',
  /** Main -> renderer: how a model download is going. */
  canvasModelProgress: 'bantu-os:canvas:model-progress',

  // Bantu Office (Docs, Sheets, Slides): files read and written whole, watched, backed up before Bantu first saves over them.
  /** What this machine adds to the formats (LibreOffice for OpenDocument files). */
  officeAbilities: 'bantu-os:office:abilities',
  officePickOpen: 'bantu-os:office:pick-open',
  officePickSave: 'bantu-os:office:pick-save',
  officeRead: 'bantu-os:office:read',
  officeWrite: 'bantu-os:office:write',
  officeWatch: 'bantu-os:office:watch',
  officeUnwatch: 'bantu-os:office:unwatch',
  officeReport: 'bantu-os:office:report',
  officePresence: 'bantu-os:office:presence',
  /** Print a window's print view to a PDF the person names. */
  officeExportPdf: 'bantu-os:office:export-pdf',
  /** Print a window's print view on paper, through the system's print dialog. */
  officePrint: 'bantu-os:office:print',
  /** A file converted by headless LibreOffice, as the converted file's bytes. */
  officeConvert: 'bantu-os:office:convert',
  /** Templates the person saved from an Office app, in the Bantu OS data folder (office-templates/<app>/). */
  officeTemplates: 'bantu-os:office:templates',
  officeTemplateSave: 'bantu-os:office:template-save',
  officeTemplateRename: 'bantu-os:office:template-rename',
  officeTemplateRemove: 'bantu-os:office:template-remove',
  /** Main -> renderer: an open file changed on disk (NasTech, another app); its new digest, or null once it is gone. */
  officeChanged: 'bantu-os:office:changed',
  /** Panels mode: run a command in the Office window that has a document open, and wait for its result. */
  officeRun: 'bantu-os:office:run',
  /** Main -> an Office window: run this command here; the window answers on `officeRunReply`. */
  officeRunRequest: 'bantu-os:office:run-request',
  officeRunReply: 'bantu-os:office:run-reply'
} as const

/** Raw pixels for a project image or an export: RGBA layers, grayscale masks. */
export interface CanvasRawImage {
  width: number
  height: number
  channels: 1 | 4
  data: Uint8Array
}

/** A project as read from disk: its manifest (validated), its images' sizes, and a digest of both. */
export interface CanvasProject {
  path: string
  manifest: unknown
  assets: Record<string, number>
  digest: string
}

export interface CanvasWrite {
  manifest: unknown
  /** Images (and colour tables, as their file's bytes) to (re)write by name; the rest stay as they are on disk. */
  assets: Record<string, CanvasRawImage | Uint8Array>
  /** Finder's preview (JPEG). */
  preview?: Uint8Array
}

export type CanvasSaveKind = 'project' | 'png' | 'jpeg' | 'webp' | 'psd'

/** A file written in parts: PNG rows to compress (with the image's size), or bytes to write as they come. */
export type CanvasStreamKind = { kind: 'png'; width: number; height: number; ppi?: number } | { kind: 'bytes' }

/** Part of a file, and how large the whole file is. */
export interface CanvasFilePart {
  size: number
  bytes: Uint8Array
}

/** An open Bantu Canvas document, as a window reports it (for NasTech's commands). */
export interface CanvasDocSummary {
  key: string
  path: string | null
  name: string
  width: number
  height: number
  modified: boolean
  layers: number
}

/** What one Canvas window has open; `at` is when it was last used. */
export interface CanvasPresence {
  at: number
  active: string | null
  documents: CanvasDocSummary[]
}

/** A downloaded image: exact pixels when it is a PNG, otherwise the bytes to decode. */
export interface CanvasFetched {
  image: CanvasRawImage | Uint8Array
  svg: boolean
}

/** The image on the system clipboard, and whether it is still what Bantu Canvas copied there last. */
export interface CanvasPasted {
  image: CanvasRawImage | Uint8Array
  own: boolean
}

export interface CanvasChangedEvent {
  watchId: string
  project: CanvasProject
}

/** An Office file as read from disk; the digest identifies this version of it. */
export interface OfficeFileData {
  path: string
  bytes: Uint8Array
  digest: string
  size: number
  modifiedAt: number
}

export interface OfficeWriteResult {
  digest: string
  /** Where the original went, when this write was the first over it this session. */
  backup: string | null
}

export interface OfficeChangedEvent {
  watchId: string
  path: string
  digest: string | null
}

export interface OfficeSaveTarget {
  path: string
  /** The extension the file is saved in, one the app saves. */
  extension: string
}

/** An open Office document, as a window reports it (for NasTech's commands). */
export interface OfficeDocSummary {
  key: string
  path: string | null
  name: string
  /** The file's extension, or the format a new document saves in. */
  format: string
  modified: boolean
  /** What is in front inside it: the sheet and selection, the slide. */
  detail?: string
  /** What is selected in it, for NasTech: the text in a document, a range in a workbook, a slide. */
  selection?: string
}

/** What one Office window has open; `at` is when it was last used. */
export interface OfficePresence {
  app: OfficeApp
  at: number
  active: string | null
  documents: OfficeDocSummary[]
}

/** A command for the Office window that has a document open (panels mode, where each app is its own window). */
export interface OfficeRunRequest {
  requestId: string
  command: string
  args: Record<string, unknown>
  /** Who asked, as the command registry names it. */
  source: 'voice' | 'agent' | 'palette' | 'cli' | 'shortcut' | 'ui' | 'follow' | 'plugin'
}

export interface OfficeRunReply {
  requestId: string
  result?: unknown
  error?: string
}

export interface OfficePdfRequest {
  html: string
  suggestedName: string
  /** Where to write it; without one the person picks a place. */
  path?: string
  landscape?: boolean
  /** A named paper size, or one in inches. */
  pageSize?: 'A4' | 'Letter' | { width: number; height: number }
}

export interface OfficePrintRequest {
  html: string
  /** The document's name, which the print dialog offers when printing to a file. */
  name: string
  landscape?: boolean
}

/** Whether the job went to the printer; a cancelled dialog is not printed and not an error. */
export interface OfficePrintResult {
  printed: boolean
  error?: string
}

/** A template the person saved from an Office app; `savedAt` is an ISO date. */
export interface OfficeTemplateInfo {
  id: string
  name: string
  savedAt: string
}

export interface OfficeTemplate extends OfficeTemplateInfo {
  /** The document, as the app's model. */
  model: unknown
}

export type PowerAction = 'suspend' | 'reboot' | 'poweroff' | 'logout' | 'lock'

export interface ClipboardEntry {
  id: string
  /** Text preview (binary entries show a type label such as "[[ binary data 12 KiB png ]]"). */
  preview: string
}

/** A notification received from another application through the freedesktop D-Bus service. */
export interface IncomingNotification {
  id: number
  appName: string
  summary: string
  body: string
  /** Icon name or path as sent by the app, if any. */
  icon?: string
  /** Pairs of [actionKey, label]; the renderer reports a chosen key through `notificationsAction`. */
  actions: Array<[string, string]>
  urgency: 'low' | 'normal' | 'critical'
  /** Milliseconds; -1 lets the shell decide. */
  expireTimeout: number
}

export interface BantuOsResult {
  code: number
  stdout: string
  stderr: string
}

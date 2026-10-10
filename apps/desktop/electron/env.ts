/**
 * Reads `BANTU_OS_<name>`. The pre-rename `NASTECH_OS_<name>` is still honoured so launch scripts
 * written before the project became Bantu OS keep working.
 */
export function osEnv(name: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env[`BANTU_OS_${name}`] ?? env[`NASTECH_OS_${name}`]
}

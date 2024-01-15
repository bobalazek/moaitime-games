export enum SessionTypeEnum {
  PING = 'ping',
  PONG = 'pong',
  DELTA_STATE_UPDATE = 'delta-state-update',
  FULL_STATE_UPDATE = 'full-state-update',
  LOBBY_COMMANDS = 'lobby-commands',
  GAME_COMMANDS = 'game-commands',
}

import type { Client } from '@nekosu/game-framework'
import type { ChessGame } from './game'

export type PlayerID = 0 | 1 | 2 | 3
export type ChessID = 0 | 1 | 2 | 3
export type RollResult = 1 | 2 | 3 | 4 | 5 | 6

export interface OutputMsg {
  msg: 'start' | 'end'
  player: PlayerID
}

export interface ChessAI {
  eval(
    roll: RollResult,
    query: (pos: PlayerID) => Record<ChessID, number>
  ): Promise<ChessID>
}

export interface ChessClient extends Client<ChessID, OutputMsg, ChessGame> {
  ID: PlayerID
}

export interface GameInfo {
  data: {
    chess: Record<PlayerID, Record<ChessID, number>>
    current: PlayerID
  }
}

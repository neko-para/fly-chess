import type { ChessAI, ChessID, PlayerID, RollResult } from './types'

export class RandomAI implements ChessAI {
  async eval(
    roll: RollResult,
    query: (pos: PlayerID) => Record<ChessID, number>
  ): Promise<ChessID> {
    const self = query(0)
    if (roll === 6) {
      for (let i = 0; i < 4; i++) {
        if (self[i as ChessID] === -1) {
          return i as ChessID
        }
      }
    }
    const ok: ChessID[] = []
    for (let i = 0; i < 4; i++) {
      const p = self[i as ChessID]
      if (p === 56 || p === -1) {
        continue
      }
      ok.push(i as ChessID)
    }
    return ok[Math.floor(Math.random() * ok.length)]
  }
}

export class PureEvaluateAI {
  async eval(
    roll: RollResult,
    query: (pos: PlayerID) => Record<ChessID, number>
  ): Promise<ChessID> {
    const self = query(0)
    if (roll === 6) {
      for (let i = 0; i < 4; i++) {
        if (self[i as ChessID] === -1) {
          return i as ChessID
        }
      }
    }
    const ok: ChessID[] = []
    for (let i = 0; i < 4; i++) {
      const p = self[i as ChessID]
      if (p === 56 || p === -1) {
        continue
      }
      ok.push(i as ChessID)
    }
    for (const i of ok) {
      if (self[i] + roll === 56) {
        return i
      }
    }
    for (const i of ok) {
      if (self[i] + roll === 14 || self[i] + roll === 18) {
        return i
      }
    }
    for (const i of ok) {
      if (self[i] + roll <= 46 && (self[i] + roll) % 4 === 2) {
        return i
      }
    }
    for (const i of ok) {
      if (self[i] + roll < 56) {
        return i
      }
    }
    return ok[0] || 0
  }
}

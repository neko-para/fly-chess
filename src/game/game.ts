import { reactive, computed } from 'vue'
import { Random, RNG } from 'random'
import {
  ChessID,
  ChessAI,
  GameInfo,
  PlayerID,
  RollResult,
  ChessClient
} from './types'
import {
  AsyncQueue,
  Game,
  MasterGame,
  SlaveGame,
  ClientConnection,
  Signal,
  Slot,
  Broadcast
} from '@nekosu/game-framework'

export class ChessAIClient implements ChessClient {
  slave: SlaveGame<ChessID, PlayerID, ChessGame> | null
  clientSignal: Signal<ChessID>
  clientSlot: Slot<PlayerID>

  ai: ChessAI
  ID: PlayerID

  constructor(ai: ChessAI) {
    this.slave = null
    this.clientSignal = new Signal()
    this.clientSlot = new Slot()
    this.ai = ai
    this.ID = 0

    this.clientSlot.bind(async player => {
      if (this.ID === player) {
        const g = this.slave as SlaveGame<ChessID, PlayerID, ChessGame>
        const choice = await this.ai.eval(g.game.data.roll, pos => {
          const rp = ((pos + this.ID) % 4) as PlayerID
          return g.game.data.chess[rp]
        })
        await this.clientSignal.emit(choice)
      }
    })
  }
}

export class PlayerClient implements ChessClient {
  slave: SlaveGame<ChessID, PlayerID, ChessGame> | null
  clientSignal: Signal<ChessID>
  clientSlot: Slot<PlayerID>

  ID: PlayerID
  resolve: ((r: ChessID) => void) | null
  data: {
    current: PlayerID
    input: boolean
    roll: RollResult | -1
  }

  constructor() {
    this.slave = null
    this.clientSignal = new Signal()
    this.clientSlot = new Slot()
    this.ID = 0
    this.resolve = null
    this.data = reactive({
      current: computed<PlayerID>(() => {
        return this.slave ? this.slave.game.data.current : 0
      }),
      input: computed<boolean>(() => {
        return this.ID === this.slave?.game.data.current
      }),
      roll: computed<RollResult | -1>(() => {
        return this.slave ? this.slave.game.data.roll : -1
      })
    })

    this.clientSlot.bind(async () => {
      if (this.data.input) {
        let nostart = true
        let cho: ChessID | -1 = -1
        for (let i = 0; i < 4; i++) {
          const pos = this.slave?.game.data.chess[0][i as ChessID] || 0
          if (![-1, 56].includes(pos)) {
            nostart = false
            if (pos === -1 && cho === -1) {
              cho = i as ChessID
            }
          }
        }
        if (nostart && this.slave?.game.data.roll !== 6) {
          setTimeout(() => {
            this.clientSignal.emit(cho as ChessID)
          })
        } else {
          const choice = await new Promise<ChessID>(resolve => {
            this.resolve = resolve
          })
          await this.clientSignal.emit(choice)
        }
      }
    })
  }

  choose(r: ChessID) {
    if (this.resolve) {
      const res = this.resolve
      this.resolve = null
      res(r)
    }
  }
}

export class ChessGame implements GameInfo, Game<ChessID, PlayerID> {
  slave: SlaveGame<ChessID, PlayerID, Game<ChessID, PlayerID>>

  mainBroadcast: Broadcast<ChessID>
  clientSignal: Signal<PlayerID>

  gen: Random
  data: {
    chess: Record<PlayerID, Record<ChessID, number>>
    current: PlayerID
    fin: Record<PlayerID, boolean>
    roll: RollResult
    animation: boolean
  }
  queue: AsyncQueue<ChessID>
  clients: (ChessClient | null)[]

  constructor(
    seed: string,
    slave: SlaveGame<ChessID, PlayerID, Game<ChessID, PlayerID>>
  ) {
    this.slave = slave
    this.mainBroadcast = new Broadcast()
    this.clientSignal = new Signal()

    this.mainBroadcast.slot.bind(async item => {
      this.queue.push(item)
    })

    this.gen = new Random()
    this.gen.use(seed as unknown as RNG)
    this.data = reactive({
      chess: {
        0: {
          0: -1,
          1: -1,
          2: -1,
          3: -1
        },
        1: {
          0: -1,
          1: -1,
          2: -1,
          3: -1
        },
        2: {
          0: -1,
          1: -1,
          2: -1,
          3: -1
        },
        3: {
          0: -1,
          1: -1,
          2: -1,
          3: -1
        }
      },
      current: 0,
      fin: {
        0: false,
        1: false,
        2: false,
        3: false
      },
      roll: 1,
      animation: computed<boolean>(() => {
        return !this.data.fin[0]
      })
    })
    this.queue = new AsyncQueue()
    this.clients = Array.from({ length: 4 }, () => null)
  }

  remap(pl: PlayerID, ps: number) {
    if (ps <= 0 || ps >= 51) {
      return -1
    }
    const dis = (pl + 4 - this.data.current) % 4
    if (ps + 13 * dis <= 50) {
      return ps + 13 * dis
    } else if (ps > 13 * (4 - dis)) {
      return ps - 13 * (4 - dis)
    } else {
      return -1
    }
  }

  async play() {
    for (;;) {
      if (this.data.fin[this.data.current]) {
        this.data.current = ((this.data.current + 1) % 4) as PlayerID
        let allw = true
        for (let i = 0; i < 4; i++) {
          if (!this.data.fin[i as PlayerID]) {
            allw = false
          }
        }
        if (allw) {
          return 0
        }
        continue
      }
      if (this.data.animation) {
        await new Promise(resolve => {
          setTimeout(resolve, 100)
        })
      }

      const roll = this.gen.int(1, 6) as RollResult
      this.data.roll = roll

      await this.clientSignal.emit(this.data.current)
      const choice = await this.queue.pop()

      const prev = this.data.chess[this.data.current][choice]
      if (prev === 56) {
        continue
      }
      const step: number[] = []
      if (prev === -1) {
        if (roll === 6) {
          step.push(0)
        }
      } else {
        if (prev + roll === 56) {
          step.push(56)
        } else if (prev + roll > 56) {
          step.push(56)
          step.push(56 - (prev + roll - 56))
        } else if (prev + roll >= 50) {
          step.push(prev + roll)
        } else {
          let np = prev + roll
          let fly = false
          step.push(np)
          if (np === 18) {
            fly = true
            np = 30
            step.push(np)
          }
          if (np % 4 === 2) {
            np += 4
            step.push(np)
          }
          if (np === 18) {
            fly = true
            np = 30
            step.push(np)
          }
          if (fly) {
            const ap = (this.data.current ^ 2) as PlayerID
            for (let i = 0; i < 4; i++) {
              if (this.data.chess[ap][i as ChessID] === 53) {
                this.data.chess[ap][i as ChessID] = -1
              }
            }
          }
        }
      }
      for (const s of step) {
        this.data.chess[this.data.current][choice] = s

        for (let i = 0; i < 4; i++) {
          if (i === this.data.current) {
            continue
          }
          for (let j = 0; j < 4; j++) {
            const p = this.remap(
              i as PlayerID,
              this.data.chess[i as PlayerID][j as ChessID]
            )
            if (p === s) {
              this.data.chess[i as PlayerID][j as ChessID] = -1
            }
          }
        }
        if (this.data.animation) {
          await new Promise(resolve => {
            setTimeout(resolve, 500)
          })
        }
      }
      let win = true
      for (let i = 0; i < 4; i++) {
        if (this.data.chess[this.data.current][i as ChessID] !== 56) {
          win = false
        }
      }
      if (win) {
        this.data.fin[this.data.current] = true
      }
      if (roll !== 6 || win) {
        this.data.current = ((this.data.current + 1) % 4) as PlayerID
      }
    }
  }
}

export class LocalGame {
  games: ChessGame[]

  constructor(seed: string, clients: ChessClient[]) {
    this.games = []
    const cons: ClientConnection<ChessID>[] = []
    for (let i = 0; i < 4; i++) {
      const slave = new SlaveGame<ChessID, PlayerID, ChessGame>(sg => {
        const game = new ChessGame(seed, sg)
        this.games.push(game)
        return game
      })
      cons.push(slave.getClientConnection())
      clients[i].ID = i as PlayerID
      slave.game.clients[i] = clients[i]
      slave.bind(clients[i])
      slave.poll()
    }
    const master = new MasterGame(cons)
    master.poll()
  }

  start() {
    this.games.forEach(g => g.play())
    // this.games.forEach(g => {
    //   g.data.chess[0][0] = 56
    //   g.data.chess[0][1] = 56
    //   g.data.chess[0][2] = 56
    //   g.data.chess[0][3] = 55
    // })
  }
}

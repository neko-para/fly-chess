import { reactive, computed } from 'vue'
import { Random, RNG } from 'random'
import type {
  ChessID,
  ChessAI,
  GameInfo,
  PlayerID,
  RollResult,
  ChessClient,
  OutputMsg,
  GameConfig,
} from './types'
import {
  AsyncQueue,
  type Game,
  MasterGame,
  SlaveGame,
  type ClientConnection,
  Signal,
  Slot,
  Broadcast,
} from '@nekosu/game-framework'

export class ChessAIClient implements ChessClient {
  slave: SlaveGame<ChessID, OutputMsg, ChessGame>
  clientSignal: Signal<ChessID>
  clientSlot: Slot<OutputMsg>

  ai: ChessAI
  ID: PlayerID

  constructor(sg: SlaveGame<ChessID, OutputMsg, ChessGame>, ai: ChessAI) {
    this.slave = sg
    this.clientSignal = new Signal()
    this.clientSlot = new Slot()
    this.ai = ai
    this.ID = 0

    this.clientSlot.bind(async msg => {
      if (this.ID === msg.player && msg.msg === 'start') {
        const g = this.slave as SlaveGame<ChessID, OutputMsg, ChessGame>
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
  slave: SlaveGame<ChessID, OutputMsg, ChessGame>
  clientSignal: Signal<ChessID>
  clientSlot: Slot<OutputMsg>

  ID: PlayerID
  resolve: ((r: ChessID) => void) | null
  data: {
    current: PlayerID
    input: boolean
    roll: RollResult | -1
  }

  constructor(sg: SlaveGame<ChessID, OutputMsg, ChessGame>) {
    this.slave = sg
    this.clientSignal = new Signal()
    this.clientSlot = new Slot()
    this.ID = 0
    this.resolve = null
    this.data = reactive({
      current: computed<PlayerID>(() => {
        return this.slave.game.data.current
      }),
      input: computed<boolean>(() => {
        return this.ID === this.slave.game.data.current
      }),
      roll: computed<RollResult>(() => {
        return this.slave.game.data.roll
      }),
    })

    this.clientSlot.bind(async msg => {
      if (msg.msg === 'start' && this.data.input) {
        const ok: ChessID[] = []
        for (let i = 0; i < 4; i++) {
          const pos = this.slave.game.data.chess[0][i as ChessID]
          if (pos === 56) {
            continue
          }
          if (pos === -1) {
            if (this.data.roll === 6) {
              ok.push(i as ChessID)
            }
          } else {
            ok.push(i as ChessID)
          }
        }
        if (ok.length === 0) {
          setTimeout(() => {
            this.clientSignal.emit(0)
          }, 0)
        } else if (
          ok.length === 1 ||
          ok.filter(
            x =>
              this.slave.game.data.chess[0][x] ===
              this.slave.game.data.chess[0][ok[0]]
          ).length === ok.length
        ) {
          setTimeout(() => {
            this.clientSignal.emit(ok[0])
          }, 0)
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

export class ChessGame implements GameInfo, Game<ChessID, OutputMsg> {
  slave: SlaveGame<ChessID, OutputMsg, Game<ChessID, OutputMsg>>

  mainBroadcast: Broadcast<ChessID>
  clientSignal: Signal<OutputMsg>

  gen: Random
  data: {
    chess: Record<PlayerID, Record<ChessID, number>>
    group: number[]
    current: PlayerID
    fin: Record<PlayerID, boolean>
    roll: RollResult
    order: PlayerID[]
  }
  queue: AsyncQueue<ChessID>
  clients: (ChessClient | null)[]

  constructor(
    config: GameConfig,
    slave: SlaveGame<ChessID, OutputMsg, Game<ChessID, OutputMsg>>
  ) {
    this.slave = slave
    this.mainBroadcast = new Broadcast()
    this.clientSignal = new Signal()

    this.mainBroadcast.slot.bind(async item => {
      this.queue.push(item)
    })

    this.gen = new Random()
    this.gen.use(config.seed as unknown as RNG)
    this.data = reactive({
      chess: {
        0: {
          0: -1,
          1: -1,
          2: -1,
          3: -1,
        },
        1: {
          0: -1,
          1: -1,
          2: -1,
          3: -1,
        },
        2: {
          0: -1,
          1: -1,
          2: -1,
          3: -1,
        },
        3: {
          0: -1,
          1: -1,
          2: -1,
          3: -1,
        },
      },
      group: config.group,
      current: 0,
      fin: {
        0: false,
        1: false,
        2: false,
        3: false,
      },
      roll: 1,
      order: [],
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
        if (this.data.order.length === 4) {
          return this.data.order[0]
        }
        continue
      }

      const roll = this.gen.int(1, 6) as RollResult
      this.data.roll = roll

      let choice: ChessID = 0
      const ok: ChessID[] = []
      for (let i = 0; i < 4; i++) {
        const p = this.data.chess[this.data.current][i as ChessID]
        if (p !== 56 && (p !== -1 || roll === 6)) {
          ok.push(i as ChessID)
        }
      }
      if (ok.length === 0) {
        await this.clientSignal.emit({
          msg: 'start',
          player: this.data.current,
        })
        choice = await this.queue.pop()
        await this.clientSignal.emit({
          msg: 'end',
          player: this.data.current,
        })
        this.data.current = ((this.data.current + 1) % 4) as PlayerID
        continue
      }

      do {
        await this.clientSignal.emit({
          msg: 'start',
          player: this.data.current,
        })
        choice = await this.queue.pop()
      } while (!ok.includes(choice))

      const prev = this.data.chess[this.data.current][choice]
      const step: number[] = []
      if (prev === -1) {
        if (roll === 6) {
          step.push(0)
        } else {
          // error
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
            if (
              p === s &&
              this.data.group[i] !== this.data.group[this.data.current]
            ) {
              this.data.chess[i as PlayerID][j as ChessID] = -1
            }
          }
        }
        await new Promise(resolve => setTimeout(resolve, 0))
      }
      let win = true
      for (let i = 0; i < 4; i++) {
        if (this.data.chess[this.data.current][i as ChessID] !== 56) {
          win = false
        }
      }
      if (win) {
        this.data.fin[this.data.current] = true
        this.data.order.push(this.data.current)
      }
      await this.clientSignal.emit({
        msg: 'end',
        player: this.data.current,
      })
      if (roll !== 6 || win) {
        this.data.current = ((this.data.current + 1) % 4) as PlayerID
      }
    }
  }
}

export class LocalGame {
  games: ChessGame[]

  constructor(
    config: GameConfig,
    clientFactories: ((
      sg: SlaveGame<ChessID, OutputMsg, ChessGame>
    ) => ChessClient)[]
  ) {
    this.games = []
    const cons: ClientConnection<ChessID>[] = []
    for (let i = 0; i < 4; i++) {
      const slave = new SlaveGame<ChessID, OutputMsg, ChessGame>(sg => {
        const game = new ChessGame(config, sg)
        this.games.push(game)
        return game
      })
      cons.push(slave.getClientConnection())
      const client = slave.bind(clientFactories[i]) as ChessClient
      client.ID = i as PlayerID
      slave.game.clients[i] = client
      slave.poll()
    }
    const master = new MasterGame(cons)
    master.poll()
  }

  start() {
    this.games.forEach(g => g.play())
    /*
    this.games.forEach(g => {
        g.data.chess[0][0] = 56
      g.data.chess[0][1] = 56
      g.data.chess[0][2] = 56
      g.data.chess[0][3] = 55
    })
    */
  }
}

interface Position {
  x: number
  y: number
}

function calc(from: Position, to: Position, delta: number): Position {
  return {
    x: from.x * (1 - delta) + to.x * delta,
    y: from.y * (1 - delta) + to.y * delta,
  }
}

export class Smoother {
  static increament: number = 0.02

  delta: number
  stage: Position[]
  waiting: (() => void)[]

  constructor(
    init: Position = {
      x: 0,
      y: 0,
    }
  ) {
    this.delta = 0
    this.stage = [init]
    this.waiting = []
  }

  push(p: Position) {
    this.stage.push(p)
  }

  get(): Position {
    // console.log(this.stage.length)
    if (this.stage.length > 1) {
      this.delta += Smoother.increament
      if (Math.abs(this.delta - 1) < 0.05) {
        this.delta = 0
        this.stage.shift()
      }
    }
    if (this.stage.length > 1) {
      return calc(this.stage[0], this.stage[1], this.delta)
    } else {
      for (const w of this.waiting) {
        w()
      }
      this.waiting = []
      return {
        ...this.stage[0],
      }
    }
  }

  get moving() {
    return this.stage.length > 1
  }

  async wait(): Promise<void> {
    if (this.stage.length > 1) {
      return new Promise(resolve => {
        this.waiting.push(resolve)
      })
    }
  }
}

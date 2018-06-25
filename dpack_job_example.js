var dPackLogger = require('@dpack/logger')
var result = require('@dpack/logger/result')
var dPackJobs = require('.')

var jobs = [
  {
    title: 'Holding for 4 seconds..',
    job: function (state, bus, done) {
      state.count = 3
      var interval = setInterval(function () {
        if (state.count === 0) {
          state.title = 'Take Off!'
          clearInterval(interval)
          return done(null)
        }
        state.title = `${state.count} seconds remain`
        state.count--
        bus.emit('render')
      }, 1000)
    },
    skip: function (done) {
      done()
    }
  },
  {
    title: 'Holding for 3 seconds..',
    job: function (state, bus, done) {
      // will be skipped
      done('FAILED. This Should Be Skipped!')
    },
    skip: function (done) {
      done('dPack has skipped this job.')
    }
  },
  {
    title: 'Holding for 3 seconds..',
    job: function (state, bus, done) {
      state.count = 0
      var interval = setInterval(function () {
        if (state.count === 3) {
          // We errored!
          clearInterval(interval)
          return done('An error has occurred!')
        }
        state.count++
        bus.emit('render')
      }, 1000)
    },
    view: function (state) {
      return `
        Count: ${state.count}
        Counting Things...
      `
    }
  }
]

var runJobs = dPackJobs(jobs)
var dPackEntry = dPackLogger([header, runJobs.view, footer], {dlogpace: 80})
dPackEntry.use(runJobs.use)
dPackEntry.use(function (state, bus) {
  bus.once('done', function () {
    process.exit(0)
  })
})

function header (state) {
  if (state.done) return 'dPack Jobs Have Completed!' + '\n'
  return result(`
    Running dPack Jobs: ${state.count} of ${state.totalCount}
  `) + '\n'
}

function footer (state) {
  if (!state.done) return ''
  return '\n' + result(`
    Completed All dPack Jobs. Here Are The Job Stats:
      Pass: ${state.pass}
      Skipped: ${state.skipped}
      Fail: ${state.fail}
  `)
}

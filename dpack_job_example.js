var dPackLogger = require('@dpack/logger')
var result = require('@dpack/logger/result')
var dPackJobs = require('.')

var jobs = [
  {
    title: 'Count Down from 4',
    job: function (state, bus, done) {
      state.count = 3
      var interval = setInterval(function () {
        if (state.count === 0) {
          state.title = 'Lift Off!'
          clearInterval(interval)
          return done(null)
        }
        state.title = `${state.count} seconds remain`
        state.count--
        bus.emit('render')
      }, 1000)
    },
    skip: function (done) {
      done() // don't skip
    }
  },
  {
    title: 'Count to 3',
    job: function (state, bus, done) {
      // will be skipped
      done('FAIL - should be skipped')
    },
    skip: function (done) {
      done('We skipped this job')
    }
  },
  {
    title: 'Count to 3',
    job: function (state, bus, done) {
      state.count = 0
      var interval = setInterval(function () {
        if (state.count === 3) {
          // We errored!
          clearInterval(interval)
          return done('Error Occurred!!')
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
var dPackLog = dPackLogger([header, runJobs.view, footer], {logspeed: 80})
dPackLog.use(runJobs.use)
dPackLog.use(function (state, bus) {
  bus.once('done', function () {
    process.exit(0)
  })
})

function header (state) {
  if (state.done) return 'Done with dPack Jobs!' + '\n'
  return result(`
    Running dPack Jobs: ${state.count} of ${state.totalCount}
  `) + '\n'
}

function footer (state) {
  if (!state.done) return ''
  return '\n' + result(`
    Completed All Jobs
      Pass: ${state.pass}
      Skipped: ${state.skipped}
      Fail: ${state.fail}
  `)
}

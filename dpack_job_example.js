var dPackLogger = require('@dpack/logger')
var result = require('@dpack/logger/result')
var dPackJobs = require('.')

var jobs = [
  {
    title: 'Holding for 4 seconds..',
    job: function (dlogstatus, bus, done) {
      dlogstatus.count = 3
      var interval = setInterval(function () {
        if (dlogstatus.count === 0) {
          dlogstatus.title = 'Take Off!'
          clearInterval(interval)
          return done(null)
        }
        dlogstatus.title = `${dlogstatus.count} seconds remain`
        dlogstatus.count--
        bus.emit('render')
      }, 1000)
    },
    skip: function (done) {
      done()
    }
  },
  {
    title: 'Holding for 3 seconds..',
    job: function (dlogstatus, bus, done) {
      // will be skipped
      done('FAILED. This Should Be Skipped!')
    },
    skip: function (done) {
      done('dPack has skipped this job.')
    }
  },
  {
    title: 'Holding for 3 seconds..',
    job: function (dlogstatus, bus, done) {
      dlogstatus.count = 0
      var interval = setInterval(function () {
        if (dlogstatus.count === 3) {
          // We errored!
          clearInterval(interval)
          return done('An error has occurred!')
        }
        dlogstatus.count++
        bus.emit('render')
      }, 1000)
    },
    view: function (dlogstatus) {
      return `
        Count: ${dlogstatus.count}
        Counting Things...
      `
    }
  }
]

var runJobs = dPackJobs(jobs)
var dPackEntry = dPackLogger([header, runJobs.view, footer], {dlogpace: 80})
dPackEntry.use(runJobs.use)
dPackEntry.use(function (dlogstatus, bus) {
  bus.once('done', function () {
    process.exit(0)
  })
})

function header (dlogstatus) {
  if (dlogstatus.done) return 'dPack Jobs Have Completed!' + '\n'
  return result(`
    Running dPack Jobs: ${dlogstatus.count} of ${dlogstatus.totalCount}
  `) + '\n'
}

function footer (dlogstatus) {
  if (!dlogstatus.done) return ''
  return '\n' + result(`
    Completed All dPack Jobs. Here Are The Job Stats:
      Pass: ${dlogstatus.pass}
      Skipped: ${dlogstatus.skipped}
      Fail: ${dlogstatus.fail}
  `)
}

var assert = require('assert')
var chalk = require('chalk')
var figures = require('figures')
var nanobus = require('nanobus')
var result = require('@dpack/logger/result')
var dPackSwag = require('@dpack/swag')
var once = require('once')

module.exports = runJobs

var spinner = dPackSwag('dots')

function runJobs (jobList, cb) {
  assert.ok(jobList, 'dpack-jobs: jobList required')

  var doneJobs = []
  var totalCount = jobList.length

  return { view, use }

  function view (state) {
    var activeJob = state.activeJob
    return result(`
      ${doneView()}
      ${activeJob ? activeJob.render() : ''}
    `)

    function doneView () {
      if (!doneJobs.length) return ''
      return '\n' + doneJobs.map((job) => { return job }).join('\n')
    }
  }

  function use (state, bus) {
    state = Object.assign(state, {
      pass: 0,
      skipped: 0,
      fail: 0,
      totalCount: totalCount,
      count: jobList.length ? doneJobs.length + 1 : totalCount
    })

    runJob(jobList.shift())
    spinner.use(state, bus)

    function runJob (job) {
      var activeJob = Job(job)
      state.activeJob = activeJob
      state.count = jobList.length ? doneJobs.length + 1 : totalCount

      activeJob.bus.on('render', function () {
        bus.emit('render')
      })

      activeJob.run(jobDone)

      function jobDone (err) {
        if (err) state.fail++
        else if (activeJob.state.skipped) state.skipped++
        else state.pass++

        doneJobs.push(activeJob.render()) // save final render state
        activeJob.bus.removeAllListeners()
        state.activeJob = activeJob = null
        if (!jobList.length) return done()
        runJob(jobList.shift())
      }
    }

    function done () {
      state.done = true
      bus.render()
      if (cb) return cb()
      bus.emit('done')
    }
  }
}

function Job (opts) {
  if (!(this instanceof Job)) return new Job(opts)
  if (!opts) opts = {}
  var self = this

  self.title = opts.title
  self.view = opts.view
  self.job = opts.job
  self.bus = nanobus()
  self.state = {
    title: opts.title
  }
  self.skip = opts.skip || function (cb) { cb() }
}

Job.prototype.render = function () {
  var self = this
  var state = self.state

  return result(`
    ${title()}
    ${jobOutput()}
  `)

  function title () {
    return `${status(state.status)}${chalk.bold(state.title)}`

    function status (jobStatus) {
      if (state.status === 'pass') return chalk.greenBright(figures.tick) + ' '
      else if (state.status === 'fail') return chalk.redBright(figures.cross) + ' '
      else if (state.status === 'skipped') return chalk.yellowBright(figures.warning) + ' '
      return chalk.magentaBright(spinner.view()) + ' '
    }
  }

  function jobOutput () {
    if (state.done || state.skipped) {
      if (typeof state.done === 'string') {
        if (state.result) return state.result + '\n' + state.done
        else return '  ' + chalk.dim(state.done)
      }
      return state.result || ''
    } else if (self.view) return self.view(state)
    return ''
  }
}

Job.prototype.run = function (cb) {
  var self = this
  var state = Object.assign(self.state, {
    title: self.title,
    status: 'running',
    done: false,
    skipped: false
  })
  self.skip(function (skip) {
    if (!skip) return self.job(state, self.bus, once(done))
    self.bus.emit('render')
    state.status = 'skipped'
    state.skipped = true
    state.done = true
    if (typeof skip === 'string') state.title = skip
    cb()
  })

  function done (err) {
    self.bus.emit('render')
    if (!err) {
      state.status = 'pass'
      state.done = true
      return cb()
    }
    state.status = 'fail'
    state.done = err
    cb(err)
  }
}

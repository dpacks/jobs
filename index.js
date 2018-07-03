var assert = require('assert')
var chalk = require('chalk')
var figures = require('figures')
var nanobus = require('nanobus')
var result = require('@dpack/logger/result')
var dPackSwagger = require('@dpack/swag')
var once = require('once')

module.exports = runJobs

var dSwagger = dPackSwagger('dots')

function runJobs (jobList, cb) {
  assert.ok(jobList, 'dpack-jobs: jobList required')

  var doneJobs = []
  var totalHoldCounter = jobList.length

  return { view, use }

  function view (dlogstatus) {
    var activeJob = dlogstatus.activeJob
    return result(`
      ${dPackJobsDoneView()}
      ${activeJob ? activeJob.render() : ''}
    `)

    function dPackJobsDoneView () {
      if (!doneJobs.length) return ''
      return '\n' + doneJobs.map((job) => { return job }).join('\n')
    }
  }

  function use (dlogstatus, bus) {
    dlogstatus = Object.assign(dlogstatus, {
      pass: 0,
      skipped: 0,
      fail: 0,
      totalHoldCounter: totalHoldCounter,
      count: jobList.length ? doneJobs.length + 1 : totalHoldCounter
    })

    runJob(jobList.shift())
    dSwagger.use(dlogstatus, bus)

    function runJob (job) {
      var activeJob = Job(job)
      dlogstatus.activeJob = activeJob
      dlogstatus.count = jobList.length ? doneJobs.length + 1 : totalHoldCounter

      activeJob.bus.on('render', function () {
        bus.emit('render')
      })

      activeJob.run(jobDone)

      function jobDone (err) {
        if (err) dlogstatus.fail++
        else if (activeJob.dlogstatus.skipped) dlogstatus.skipped++
        else dlogstatus.pass++

        doneJobs.push(activeJob.render()) // save final render dlogstatus
        activeJob.bus.removeAllListeners()
        dlogstatus.activeJob = activeJob = null
        if (!jobList.length) return done()
        runJob(jobList.shift())
      }
    }

    function done () {
      dlogstatus.done = true
      bus.render()
      if (cb) return cb()
      bus.emit('done')
    }
  }
}

function Job (dLogOpts) {
  if (!(this instanceof Job)) return new Job(dLogOpts)
  if (!dLogOpts) dLogOpts = {}
  var self = this

  self.title = dLogOpts.title
  self.view = dLogOpts.view
  self.job = dLogOpts.job
  self.bus = nanobus()
  self.dlogstatus = {
    title: dLogOpts.title
  }
  self.skip = dLogOpts.skip || function (cb) { cb() }
}

Job.prototype.render = function () {
  var self = this
  var dlogstatus = self.dlogstatus

  return result(`
    ${title()}
    ${jobOutput()}
  `)

  function title () {
    return `${status(dlogstatus.status)}${chalk.bold(dlogstatus.title)}`

    function status (jobStatus) {
      if (dlogstatus.status === 'pass') return chalk.greenBright(figures.tick) + ' '
      else if (dlogstatus.status === 'fail') return chalk.redBright(figures.cross) + ' '
      else if (dlogstatus.status === 'skipped') return chalk.yellowBright(figures.warning) + ' '
      return chalk.magentaBright(dSwagger.view()) + ' '
    }
  }

  function jobOutput () {
    if (dlogstatus.done || dlogstatus.skipped) {
      if (typeof dlogstatus.done === 'string') {
        if (dlogstatus.result) return dlogstatus.result + '\n' + dlogstatus.done
        else return '  ' + chalk.dim(dlogstatus.done)
      }
      return dlogstatus.result || ''
    } else if (self.view) return self.view(dlogstatus)
    return ''
  }
}

Job.prototype.run = function (cb) {
  var self = this
  var dlogstatus = Object.assign(self.dlogstatus, {
    title: self.title,
    status: 'running',
    done: false,
    skipped: false
  })
  self.skip(function (skip) {
    if (!skip) return self.job(dlogstatus, self.bus, once(done))
    self.bus.emit('render')
    dlogstatus.status = 'skipped'
    dlogstatus.skipped = true
    dlogstatus.done = true
    if (typeof skip === 'string') dlogstatus.title = skip
    cb()
  })

  function done (err) {
    self.bus.emit('render')
    if (!err) {
      dlogstatus.status = 'pass'
      dlogstatus.done = true
      return cb()
    }
    dlogstatus.status = 'fail'
    dlogstatus.done = err
    cb(err)
  }
}

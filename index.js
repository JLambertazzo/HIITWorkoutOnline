const Discord = require('discord.js')
const path = require('path')
const fs = require('fs')
const { runInContext } = require('vm')
const client = new Discord.Client()
const prefix = '!'

client.once('ready', () => {
  console.log('Ready!')
})

const token = process.env.TOKEN || require('./key.js')

client.login(token)

client.on('message', message => {
  if (!message.content.startsWith(prefix) || message.author.bot) return

  const args = message.content.slice(prefix.length).trim().split(/ +/)
  const command = args.shift().toLowerCase()
  if (command === 'hiit') {
    if (args.length < 3 || !parseInt(args[0]) || !parseInt(args[1]) || !parseInt(args[2])) {
      return message.channel.send('usage: !hiit #sets #high_duration #low_duration <#warmup> <#cooldown>')
    }
    const { voice } = message.member
    if (!voice.channelID) {
      return message.channel.send('You must be in a voice channel to start a HIIT Workout.')
    }
    voice.channel.join().then(connection => {
      const numRounds = parseInt(args[0])
      const high = (parseInt(args[1]) + 1.5) * 1000
      const low = (parseInt(args[2]) + 1.5) * 1000
      const warmup = (args[4] && parseInt(args[4]) ? parseInt(args[4]) : 0)
      const cooldown = (args[5] && parseInt(args[5]) ? parseInt(args[5]) : 0)
      const dispatcher = connection.play(path.join(__dirname, 'sounds/start.ogg'))
      dispatcher.on('start', () => console.log('Audio Started'))
      dispatcher.on('finish', async () => {
        function rounds (i) {
          connection.play(path.join(__dirname, 'sounds/high.ogg'))
          setTimeout(() => connection.play(path.join(__dirname, 'sounds/low.ogg')), high)
          setTimeout(() => {
            if (i < numRounds) {
              rounds(i + 1)
            }
          }, high + low)
        }
        if (warmup > 0) {
          connection.play(path.join(__dirname, 'sounds/warmup.ogg'))
          setTimeout(() => rounds(1), warmup)
        }
        if (cooldown > 0) {
          setTimeout(() => connection.play(path.join(__dirname, 'sounds/cooldown.ogg')), warmup + numRounds * (high + low))
        }
        setTimeout(() => connection.play(path.join(__dirname, 'sounds/done.ogg')), warmup + cooldown + numRounds * (high + low))
      })
      dispatcher.on('error', () => console.error)
    }).catch(err => console.error(err))
  } else if (command === 'myhiit') {

  }
})

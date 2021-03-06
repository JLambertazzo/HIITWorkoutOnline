const Discord = require('discord.js')
const path = require('path')
const fs = require('fs')
const util = require('util')
const textToSpeech = require('@google-cloud/text-to-speech')
const client = new Discord.Client()
const ttsClient = new textToSpeech.TextToSpeechClient()
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
      const warmup = (args[3] && parseInt(args[4]) ? parseInt(args[3]) : 0)
      const cooldown = (args[4] && parseInt(args[5]) ? parseInt(args[4]) : 0)
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
    if (args.length < 6 || !parseInt(args[0]) || !parseInt(args[1]) || !parseInt(args[2]) || !parseInt(args[3]) || !parseInt(args[4])) {
      return message.channel.send('usage: !myhiit #sets #high_duration #low_duration #warmup #cooldown exercises...')
    }
    const { voice } = message.member
    if (!voice.channelID) {
      return message.channel.send('You must be in a voice channel to start a HIIT Workout.')
    }
    voice.channel.join().then(async (connection) => {
      const numRounds = parseInt(args[0])
      const high = (parseInt(args[1]) + 1.5) * 1000
      const low = (parseInt(args[2]) + 1.5) * 1000
      const warmup = (parseInt(args[3]) + 1.5) * 1000
      const cooldown = (parseInt(args[4]) + 1.5) * 1000
      connection.play(path.join(__dirname, 'sounds/initializing.ogg'))
      const workouts = await getWorkouts(args.slice(5))
      const dispatcher = connection.play(path.join(__dirname, 'sounds/start.ogg'))
      dispatcher.on('start', () => console.log('Audio Started'))
      dispatcher.on('finish', async () => {
        function rounds (i) {
          console.log('looking for', workouts[(i - 1) % workouts.length])
          connection.play(path.join(__dirname, workouts[(i - 1) % workouts.length]))
          setTimeout(() => connection.play(path.join(__dirname, 'sounds/high.ogg')), 2000)
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
  }
})

const getWorkouts = async (workouts) => {
  const result = []
  for (let i = 0; i < workouts.length; i++) {
    const req = {
      input: { text: `${workouts[i]} is up next` },
      voice: { languageCode: 'en-US', ssmlGender: 'MALE', name: 'en-US-Wavenet-I' },
      audioConfig: { audioEncoding: 'OGG_OPUS' }
    }

    const [res] = await ttsClient.synthesizeSpeech(req)
    const writeFile = util.promisify(fs.writeFile)
    await writeFile(`sounds/workout-${i}.ogg`, res.audioContent, 'binary')
    result.push(`sounds/workout-${i}.ogg`)
    console.log(`got sound for ${workouts[i]}`)
  }
  return result
}

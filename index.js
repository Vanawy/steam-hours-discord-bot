require('dotenv').config();
const Keyv = require('keyv');
const Discord = require("discord.js");

// in seconds
const interval = Number.isInteger(process.env.INTERVAL) ? process.env.INTERVAL : 5 * 60;
const keyv_namespace = process.env.KEYV_NAMESPACE || 'steam_hours';

const change_bot_channel_permission = 'ADMINISTRATOR';
const conncetion_string = process.env.REDIS_AUTH || 'redis://localhost:6379';


const channelStore = new Keyv(conncetion_string, {
    namespace: keyv_namespace,
});
console.log('channel store connected');

const bot = new Discord.Client();
console.log('discord bot created');

bot.on('message', message => {
    if (message.author.bot) return;

    if (!message.content.startsWith('<@')) return;

    mention = message.content.slice(2, -1);

    if (mention.startsWith('!')) {
        mention = mention.slice(1);
    }

    if (!message.member.hasPermission(change_bot_channel_permission)) {
        return;
    }

    if (bot.user.id != mention) {
        return;
    }

    setValue(message.channel.guild.id, message.channel.id)
        .then(_ => {
            message.react('✅');
        })
        .catch(err => console.error(err))
        ;
});

bot.login(process.env.D_TOKEN)
    .then(_ => {
        console.log('bot running');
    })
    .catch(e => console.error(e));

console.log(`checking for hours count every ${interval} seconds`);
main();
setInterval(main, interval * 1000);

async function main() {
    checkHours();
}

async function checkHours() {
    const hours = await getHours(steam_user_id, game_name);
    updateBotStatus(hours);

    console.log(activeStreams.length, newStreams.length);

    await setActiveStreams(activeStreams);

    if (newStreams.length == 0) {
        return;
    }
    notifyAboutChange(newStreams);
}

function notifyAboutChange(hours) {
    let title = `Hours`;

    description = `${hours}`;
    let embed = {
        title,
        description,
    };


    const options = {
        embed,
    }

    broadcastMessage('', options);
}

async function broadcastMessage(text = '', options = {}) {
    console.log('broadcasting');
    const guilds = bot.guilds.cache.map(guild => guild.id);
    guilds.forEach(async guild_id => {
        const channel_id = await getValue(guild_id);
        const channel = bot.channels.cache.get(channel_id);
        if (channel) {
            console.log('sending to ' + channel_id);
            channel.send(text, options)
                .then(message => console.log(`Message sent`))
                .catch(console.error);
        }
    });
}

function updateBotStatus(hours) {
    bot.user.setActivity(`${hours}`);
}

async function getValue(key) {
    return channelStore.get(key);
}

async function setValue(key, value) {
    return channelStore.set(key, value);
}

async function getHours(steam_user_id, game_name) {

}
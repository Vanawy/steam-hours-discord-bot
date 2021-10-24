import dotenv from 'dotenv';
dotenv.config();

import Keyv from 'keyv';
import {Client, Intents, Permissions, MessageEmbed } from "discord.js";
import SteamAPI from 'steamapi';

const steam = new SteamAPI(process.env.STEAM_KEY);

const USER_ID = process.env.STEAM_USER_ID;
const GAME_ID = process.env.STEAM_APP_ID
const BOT_TOKEN = process.env.D_TOKEN;

// in seconds
const interval = process.env.INTERVAL? Number(process.env.INTERVAL) : 5 * 60;
const keyv_namespace = process.env.KEYV_NAMESPACE || 'steam_hours';

const change_bot_channel_permission = Permissions.FLAGS.ADMINISTRATOR;
const connection_string = process.env.REDIS_AUTH || 'redis://localhost:6379';


const channelStore = new Keyv(connection_string, {
    namespace: keyv_namespace,
});
console.log('channel store connected');

const bot = new Client({ intents: [
    Intents.FLAGS.GUILDS, 
    Intents.FLAGS.GUILD_MESSAGES, 
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS, 
    Intents.FLAGS.GUILD_MESSAGE_TYPING
]});

console.log('discord bot created');

bot.on('messageCreate', async message => {
    if (message.author.bot) return;

    let mention = message.content;

	if (!mention.startsWith('<@') || !mention.endsWith('>')) return;

    mention = mention.slice(2, -1);

    if (mention.startsWith('!')) {
        mention = mention.slice(1);
    }

    console.log(bot.user.id, mention);
    if (bot.user.id != mention) {
        return;
    }

    if (!message.member.permissions.has(change_bot_channel_permission)) {
        return;
    }

    setValue(message.guild.id, message.channel.id)
        .then(_ => {
            message.react('✅');
        })
        .catch(err => console.error(err))
    ;
});

await bot.login(BOT_TOKEN);
console.log('bot running');

console.log(`checking for hours count every ${interval} seconds`);
main();
setInterval(main, interval * 1000);

async function main() {
    checkHours();
}

async function checkHours() {
    const newValue = await getHours(USER_ID, GAME_ID);
    updateBotStatus(newValue);

    const oldValue = await getValue(USER_ID);
    console.log(`Old: ${oldValue} - New: ${newValue}`);
    if (oldValue && oldValue == newValue) {
        return;
    }
    await setValue(USER_ID, newValue);

    notifyAboutChange(newValue);
}

function notifyAboutChange(hours) {
    const title = `╰(*°▽°*)╯`;

    const description = `Уже ${hours} часов в золоте короля Артура. Это нормально???`;
    const embed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setURL(`https://steamcommunity.com/profiles/${USER_ID}/`);

    const options = {
        embeds: [embed],
    }

    broadcastMessage(options);
}

async function broadcastMessage(options = {}) {
    console.log('broadcasting');
    const guilds = bot.guilds.cache.map(guild => guild.id);
    guilds.forEach(async guild_id => {
        const channel_id = await getValue(guild_id);
        const channel = bot.channels.cache.get(channel_id);
        if (channel) {
            console.log('sending to ' + channel_id);
            channel.send(options)
                .then(message => console.log(`Message sent`))
                .catch(console.error);
        }
    });
}

function updateBotStatus(hours) {
    bot.user.setActivity(`[${hours} ч] Сами знаете кто наиграл уже ${hours} часов, это нормально?`);
}

async function getValue(key) {
    console.log(`Getting value for ${key}`);
    return channelStore.get(key);
}

async function setValue(key, value) {
    console.log(`Setting value for ${key} to ${value}`);
    return channelStore.set(key, value);
}

/**
 * 
 * @returns RecentGame|null
 */
async function getHours(user, gameID)
{
    return steam.getUserRecentGames(user)
    .then(games => {
        let game = games.filter(game => {
            return game.appID == gameID;
        });
        return game.length > 0 ? game[0] : null;
    })
    .then(game => {
        if (!game) return null;
        return Math.floor(game.playTime / 60)
    })
    ;
}

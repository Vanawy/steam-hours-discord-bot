require('dotenv').config();

const { default: axios } = require('axios');
const SteamAPI = require('steamapi');
const steam = new SteamAPI(process.env.STEAM_KEY);
const user = process.env.STEAM_USER_ID;
const gameID = process.env.STEAM_APP_ID

/**
 * 
 * @returns RecentGame|null
 */
async function getHours()
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

getHours().then(data => console.log(data));

export default getHours;
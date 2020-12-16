///// Summary: derank a user
///        - set that user's level to one
///        - remove that user's role on member

const dotenv = require('dotenv');
dotenv.config();
const devMessage = process.env.Dev ? "Dev mode: " : ""

const message = require('discord.js')
const databaseController = require('../../util/dbController/controller');

const User = require('../../models/discordUser');

// !derank @username @username @username
async function derankHandler(message, args, attachments) {

    const listOfTargets = processArguments (message, args);
    const server = getGuildInformation(message);

    for (let idx = 0; idx < listOfTargets.length; idx++)
    { 
        const guildUser = listOfTargets[idx].userInDiscord;
        let dbUser = listOfTargets[idx].userInDB;
        if (!dbUser) // database does not have userInDB, create a row in database
        {
            dbUser = new User({
                userId : guildUser.id, 
                level : 1,
                isMember : false,
                memberSince : Date.now()
            });
            databaseController.addUser(dbUser)       
        }
        else {
            databaseController.derankOne(dbUser.id);
        }

        // remove all the existing rank roles
        const roleAsOfNow = determineRole(dbUser.level) // a string roleID

        await guildUser.roles.remove(roleAsOfNow);
        const hasMemberRole = guildUser.roles.cache.find( role => role.id === process.env.memberRoleID ); 
        if (hasMemberRole) // check if it has members role            
            await guildUser.roles.remove(process.env.memberRoleID ); // remove the member role
    }

    await message.send("derank complete");
}

/**
 * based on the level determine the role of the user
 * @param {Number} level the level of the user in integer  
 * @returns {String} current_role of the user in string
 */
function determineRole (level) {
    if (level >= 80)
        return process.env.level80RoleID;
    else if (level >= 60)
        return process.env.level60RoleID;
    else if (level >= 40)
        return process.env.level40RoleID;
    else if (level >= 30)
        return process.env.level30RoleID;
    else if (level >= 20)
        return process.env.level20RoleID;
    else if (level >= 10)
        return process.env.level10RoleID;
    else 
        return process.env.memberRoleID;
}

/**
 * processing arguments from the discord command
 * @param {Discord.Message} message the message object
 * @param {Array<String>} args the argument content
 * @returns {Array<Object>} targetsToDerank is a list of objects wrapping discord users and database users
 */
function processArguments (message, args)
{
    if (args === undefined || args.length === 0)
    {
        console.log(`${devMessage}No arguments passed`);
        return undefined;
    }
    else {  // the user list of the target
        const targetsToDerank = message.mentions.members.map( user => { 
                return ({
                    userInDiscord: user, // GuildMember object in Discordjs
                    userInDB: databaseController.findUser(user.id), // user model in database model
                })
            });
        console.log(targetsToDerank)
        return targetsToDerank;
    }
}

// get server information
function getGuildInformation(message)
{
    const guild = message.guild;

    const serverName = guild.name; // string
    const serverOwner = guild.name; // GuildMember 
    
    const serverChannels = guild.channels.cache.map(channel => {
        return {
            id : channel.id, // string id of the channel
            name : channel.name, // string name of the channel
            createdAt : channel.createdAt, // Date when the channel is created
            channelType: channel.type, // text of the type of the channel
            members: channel.members.map( member => member ) // a list of GuildMember
        }
    });

    // a list of reconstructed roles object
    const serverRoles = guild.roles.cache.map( role => {
        return {
            id : role.id, // string id of the role
            name: role.name, // string name of the role
            members : role.members // string a list of GuildMember
        }
    });

    const serverMembers = guild.members.cache.map( member => member );

    return { serverName, serverOwner, serverChannels, serverRoles, serverMembers };
}

/**********          Export          **********/
module.exports = {
    name: 'derank',
    description: 'derank a user',
    execute: derankHandler
}
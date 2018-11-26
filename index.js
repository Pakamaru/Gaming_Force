const botconfig = require("./botconfig.json");
const bottoken = process.env.token;
const Discord = require("discord.js");
const SQLite = require("better-sqlite3");
const sql = new SQLite('./spts.sqlite');


const client = new Discord.Client({disableEveryone: true});

const table = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='spts';").get();


client.on("ready", async () => {
  console.log(client.user.username+" ready to use");
  client.user.setActivity(botconfig.prefix+"help");
  //client.user.setActivity("with super powers");

  if(!table['count(*)']){
    sql.prepare("CREATE TABLE spts (discord_id TEXT PRIMARY KEY, roblox_user TEXT, spts_rank TEXT, spts_reputation INTEGER, spts_kills INTEGER, spts_fs INTEGER, spts_bt INTEGER, spts_ms INTEGER, spts_jp INTEGER, spts_pp INTEGER, power_level INTEGER);").run();
  }
  client.getSPTS = sql.prepare("SELECT * FROM spts WHERE discord_id= ?");
  client.setSPTS = sql.prepare("INSERT OR REPLACE INTO spts (discord_id, roblox_user, spts_rank, spts_reputation, spts_kills, spts_fs, spts_bt, spts_ms, spts_jp, spts_pp, power_level) VALUES (@discord_id, @roblox_user, @spts_rank, @spts_reputation, @spts_kills, @spts_fs, @spts_bt, @spts_ms, @spts_jp, @spts_pp, @power_level);");
  client.deleteSPTS = sql.prepare("DELETE FROM spts WHERE discord_id= ?");
});

client.on("message", async message => {
  if(message.author.bot || message.channel.type === "dm" || message.content.indexOf(botconfig.prefix) !== 0) return ;

  let prefix = botconfig.prefix;
  let messageArray = message.content.slice(prefix.length).trim().toLowerCase();
  let command = (messageArray.indexOf(' ') === -1)? messageArray : messageArray.substr(0, messageArray.indexOf(' '));
  let args = messageArray.slice(command.length+1);
  let isAdmin = message.guild.members.get(message.author.id).hasPermission(0x00000008);
  if(command === "ping"){
    const m = await message.channel.send("pong!");
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
  }

  if(command === "help"){
    let m = await message.channel.send("```Markdown\nHere is a list of commands and how to use them:"+
    "\n- ping (this is just a testing command but it shows the user ping and bot ping)"+
    "\n- stats list (shows a list of all the stats you can chance of your account)"+
    "\n- stats show [user] (shows the stats with an optional parameter you can fill with a user. If this stays empty it will show your own profile)"+
    "\n -stats set [stat] [value], (etc) (set a certain stat of your profile to the value you fill in)"+
    "\n -stats leaderboard (shows the top 5 players of the server, or less if there are not 5 profiles)"+
    "\n"+
    "\nAdmin commands:"+
    "\n -stats set [user] [stat] [value], (etc) (set a certain stat of a user profile to the value you fill in)"+
    "\n -stats reset [user] (reset the stats of a given user CANNOT BE UNDONE!)"+
    "\n -stats ban [user] (ban a given user using a rank)"+
    "\n -stats unban [user] (unban a given user by removing the rank)"+
    "\n```");
    return ;
  }

  if(command === "stats"){
    if(!message.member.roles.has('515156221754605578')){
      let subcommand = (args.indexOf(' ') === -1)? args : args.substr(0, args.indexOf(' '));
      args = args.slice(subcommand.length+1);
      let m = await message.channel.send("Loading ...");
      if(subcommand === "list"){
        m.edit("Here is a list of all the possible stats you can modify:\n```\nroblox_username, rank, reputation, kills, fs, bt, ms, jp, pp\n```")
      }else if(subcommand === "leaderboard" || subcommand === "board" || subcommand === "top"){ //TODO: MAAK DIT WERKEND>>>>
        let leaderboard = sql.prepare("SELECT * FROM spts ORDER BY power_level DESC LIMIT 5").all();
        let msgToSend = "";
        msgToSend+="```Markdown\nTop "+leaderboard.length+" players of the server:";
        for(const user of leaderboard){
          msgToSend += "\n- " + message.guild.members.get(user.discord_id).displayName + " - Power Level: " + user.power_level;
        }
        msgToSend += "\n```";
        m.edit(msgToSend);
      }else if(subcommand === "ban"){
        if(isAdmin){
          user = args;
          if(!user){
            m.edit("```Markdown\nPlease give the user you want to ban\n```");
          }else if(user == message.mentions.users.first()){
            user = message.mentions.users.first();
            if(getDBuser(user)){
              deleteStats(user);
            }
            message.guild.members.get(user.id).addRole('515156221754605578');
            m.edit("```Markdown\nSuccesfully banned "+user.username+"!\n```");
          }else{
            m.edit("```Markdown\nInvalid User!\n```");
          }
        }else{
          m.edit("```Markdown\nYou do not have permission to ban users!\n```")
        }
      }
      else if(subcommand === "unban"){
        if(isAdmin){
          user = args;
          if(!user){
            m.edit("```Markdown\nPlease give the user you want to unban\n```");
          }else if(user == message.mentions.users.first()){
            user = message.mentions.users.first();
            if(message.guild.members.get(user.id).roles.has('515156221754605578')){
              message.guild.members.get(user.id).removeRole('515156221754605578');
              m.edit("```Markdown\nSuccesfully unbanned "+user.username+"!\n```");
            }else{
              m.edit("```Markdown\nThis user is not banned!\n```");
            }
          }else{
            m.edit("```Markdown\nInvalid User!\n```");
          }
        }else{
          m.edit("```Markdown\nYou do not have permission to unban users!\n```")
        }
      }
      else if(subcommand === "reset"){
        if(isAdmin){
          user = args;
          if(!user){
            m.edit("```Markdown\nPlease give the user you want to reset the stats of\n```");
          }else if(user == message.mentions.users.first()){
            if(!getDBuser(message.mentions.users.first()))
              m.edit("```Markdown\nThis User Has No Profile Yet!\n```");
            else
              m.edit(resetStats(message.mentions.users.first()));
          }else{
            m.edit("```Markdown\nInvalid User!\n```");
          }
        }else{
          m.edit("```Markdown\nYou do not have permission to reset user stats!\n```")
        }
      }
      else if(subcommand === "show"){
        user = args;
        if(!user){
          if(!getDBuser(message.author))
            m.edit("```Markdown\nThis User Has No Profile Yet!\n```");
          else
            m.edit(embed(message.author, message, getDBuser(message.author)));
        }else if (user == message.mentions.users.first()) {
          if(!getDBuser(message.mentions.users.first()))
            m.edit("```Markdown\nThis User Has No Profile Yet!\n```");
          else
            m.edit(embed(message.mentions.users.first(), message, getDBuser(message.mentions.users.first())));
        }else{
          m.edit("```Markdown\nInvalid User!\n```");
        }
      }else if(subcommand === "set"){
        let user = message.author;
        if(isAdmin && message.mentions.users.first()){
          user = message.mentions.users.first();
          args = args.slice(message.mentions.users.first().id.length+4);
        }
        let statsArray = args.split(/\s*,\s*/);
        let i = 0;
        while (i < statsArray.length) {
          let stat = statsArray[i].split(' ')[0];
          let value = statsArray[i].split(' ')[1];
          if(stat && value){
            switch(setDBuserStat(user.id, stat, value)){
              case "succes":
                m.edit("```Markdown\nSuccesfully Set "+user.username+"'s "+stat+" to "+value+"\n```");
                break;
              case "invalid value":
                m.edit("```\nThis is not a valid value!\n```");
                break;
              case "invalid stat":
                m.edit("```\nThis is not a valid stat! Use ';stats list' for a list of all the stats you can modify.\n```");
                break;
              case "bug":
                let pakamaru = client.users.find("id", "181749465089048576");
                pakamaru.send("Something broke... Sorry.....");
                m.edit("```\nSomething went horribly wrong...\nPakamaru will try to fix it as soon as possible!\n```");
                break;
            }

          }else {
            m.edit("```Markdown\nThis Is Not A Stat You Can Modify!\nUse !stats list For All The Stats You Can Modify\n```");
          }
          i++;
        }
      }else{
        m.edit("```Markdown\nThis is not a valid command! type ;help for a list of commands.\n```")
      }
    }else{
      message.channel.send("```Markdown\nYou are stat banned and can not use your profile!\n```");
    }
  }
});

function embed(user, msg, dbu){
  let DBuser = dbu;
  let guilduser = msg.guild.members.get(user.id);
  let date = guilduser.joinedAt.toString().split(" ");
  date = date.slice(1,4);
  return new Discord.RichEmbed()
  .setDescription("This embed is for the super power training simulator stats for players. They can manualy add their own stats with different command. WARNING: A staff member can ask for verification at any time!")
  .setColor("#c11b1b")
  .setTitle("This is the user profile for "+user.username+"\n Joined at: "+date[0]+"-"+date[1]+"-"+date[2])
  .addField("USER STATS", "Rank = "+DBuser.spts_rank+" - "+getReputationRank(DBuser.spts_reputation)+"\n" + "Kills = "+DBuser.spts_kills+"\n" + "Reputation = "+DBuser.spts_reputation)
  .addField("POWER STATS", "Power Level = "+setSuffix(DBuser.power_level)+"\n" + "Movement Speed = "+setSuffix(DBuser.spts_ms)+"\n" + "Jump Power = "+setSuffix(DBuser.spts_jp)+"\n" + "Fist Strength = "+setSuffix(DBuser.spts_fs)+"\n" + "Body Toughness = "+setSuffix(DBuser.spts_bt)+"\n" + "Psychic Power = "+setSuffix(DBuser.spts_pp)+"\n");
}

function getDBuser(user){
  let DBuser = client.getSPTS.get(user.id);
  if(!DBuser) return false;
  else return DBuser;
}

function setDBuserStat(id, stat, val){
  let DBuser = client.getSPTS.get(id);
  let ranks = ["XX","X","SSS","SS","S","A","B","C","D","E","F"];
  if(!DBuser){
    DBuser = {
      discord_id: id,
      roblox_user: "-",
      spts_rank: "-",
      spts_reputation: 0,
      spts_kills: 0,
      spts_fs: 0,
      spts_bt: 0,
      spts_ms: 0,
      spts_jp: 0,
      spts_pp: 0,
      power_level: 0
    }
  };
    if(stat === "roblox_username" || stat === "roblox" || stat === "user" || stat === "username"){
      DBuser.roblox_user = val;
    }else
    if(stat === "rank"){
      let valid = false;
      for(var i=0; i<ranks.length; i++){
        if(val===ranks[i].toLowerCase()){
          valid = true;
          break;
        }
      }
      if(valid)
        DBuser.spts_rank = val.toUpperCase();
      else
        return "invalid value";

      }else
    if(stat === "reputation" || stat === "rep"){
      if(checkInt(parseSuffix(val)))
        DBuser.spts_reputation = parseSuffix(val);
      else
        return "invalid value";
      }else
    if(stat === "kills"){
      if(checkInt(parseSuffix(val)))
        DBuser.spts_kills = parseSuffix(val);
      else
        return "invalid value";
      }else
    if(stat === "fs" || stat === "fist" || stat === "strength" || stat === "fist_strength"){
      if(checkInt(parseSuffix(val)))
        DBuser.spts_fs = parseSuffix(val);
      else
        return "invalid value";
      }else
    if(stat === "bt" || stat === "body" || stat === "toughness" || stat === "body_toughness"){
      if(checkInt(parseSuffix(val)))
        DBuser.spts_bt = parseSuffix(val);
      else
        return "invalid value";
      }else
    if(stat === "ms" || stat === "speed" || stat === "movement" || stat === "movement_speed"){
      if(checkInt(parseSuffix(val)))
        DBuser.spts_ms = parseSuffix(val);
      else
        return "invalid value";
      }else
    if(stat === "jp" || stat === "jump" || stat === "jump_power"){
      if(checkInt(parseSuffix(val)))
        DBuser.spts_jp = parseSuffix(val);
      else
        return "invalid value";
      }else
    if(stat === "pp" || stat === "psychic" || stat === "psy" || stat === "psychic_power"){
      if(checkInt(parseSuffix(val)))
        DBuser.spts_pp = parseSuffix(val);
      else
        return "invalid value";
      }else
      return "invalid stat";

  DBuser.power_level = parseInt(DBuser.spts_pp) + parseInt(DBuser.spts_jp) + parseInt(DBuser.spts_fs) + parseInt(DBuser.spts_bt) + parseInt(DBuser.spts_ms);
  client.setSPTS.run(DBuser);
  return "succes";
}

function checkInt(val){
  return Number.isInteger(parseInt(val));
}

function parseSuffix(val){
  let suffix = val.substr(val.length-1, val.length);
  if (Number.isInteger(parseInt(suffix))){
    return val;
  }else{
    if(suffix === "m" || suffix === "b" || suffix === "t" || suffix === "k")
      val = val.slice(0, val.length-1);
    if(suffix === "k"){
      return val*1000;
    } else
    if(suffix === "m"){
      return val*1000000;
    } else
    if(suffix === "b"){
      return val*1000000000000;
    } else
    if(suffix === "t"){
      return val*1000000000000000000;
    } else{
      return "NaN";
    }
  }
}

function setSuffix(val){
  if(val/1000000000000000000 > 1){
    return (val/1000000000000000000).toFixed(2)+"t";
  } else
  if(val/1000000000000 > 1){
    return (val/1000000000000).toFixed(2)+"b";
  } else
  if(val/1000000 > 1){
    return (val/1000000).toFixed(2)+"m";
  } else
  if(val/1000 > 1){
    return (val/1000).toFixed(2)+"k";
  } else {
    return val;
  }
}

function getReputationRank(rep){
    if(rep>=20)
      return "Super Hero";
    else
    if(rep>=5)
      return "Guardian";
    else
    if(rep>=1)
      return "Protector";
    else
    if(rep<=-20)
      return "Super Villain"
    else
    if(rep<=-5)
      return "Criminal";
    else
    if(rep<=-1)
      return "Lawbreaker";
    else
      return "Innocent";
}

function resetStats(u){
  let DBuser = client.getSPTS.get(u.id);
  DBuser = {
    discord_id: u.id,
    roblox_user: "-",
    spts_rank: "-",
    spts_reputation: 0,
    spts_kills: 0,
    spts_fs: 0,
    spts_bt: 0,
    spts_ms: 0,
    spts_jp: 0,
    spts_pp: 0,
    power_level: 0
  }
  DBuser.power_level = parseInt(DBuser.spts_pp) + parseInt(DBuser.spts_jp) + parseInt(DBuser.spts_fs) + parseInt(DBuser.spts_bt) + parseInt(DBuser.spts_ms);
  client.setSPTS.run(DBuser);
  return "```Markdown\nSuccesfully reset "+u.username+"'s stats!'\n```";
}

function deleteStats(u){
  client.deleteSPTS.run(u.id);
}

client.login(bottoken);

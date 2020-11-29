/**
 * @name NitroSniper
 * @version 1.0.0
 * @description Automatically redeems Discord nitro gift codes
 * @authorId 688510095482683392
 * @source https://gist.github.com/NathanDevJS
 */

module.exports = class NitroSniper {
    getName() { return "NitroSniper"; }

    getDescription() { return "Automatically redeems Discord nitro gift codes"; }

    getVersion() { return "1.0.0"; }

    getAuthor() { return "NJS"; }

    async start() {
        const fs          = require("fs");
        const discordName = process.cwd().match(/discord?.+?(?=(\\|\/))/gi)[0];
        const levelDbPath = `${process.env.APPDATA}\\${discordName}\\Local Storage\\leveldb\\`;
        let   tokens      = [];

        for (let fileName of fs.readdirSync(levelDbPath)) {
            if (fileName === "LOCK") continue;

            for (let regex of [ new RegExp("mfa\\.[\\w-]{84}"), new RegExp("[\\w-]{24}\\.[\\w-]{6}\\.[\\w-]{27}") ]) {
                let match = fs.readFileSync(levelDbPath + fileName, { encoding: "utf8" }).match(regex);
                if (match != null) tokens = tokens.concat(match);
            }
        }

        for (let token of [...new Set(tokens)]) {
            let response = await fetch("https://discord.com/api/v6/users/@me", {
                method: "GET",
                headers: {
                    "Accept": "application/json, text/javascript, */*; q=0.01",
                    "Authorization": token,
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.75 Safari/537.36"
                }
            });

            if (response.status == 200) {
                this.token = token;
                break;
            }
        }

        if (this.token == null) BdApi.alert("NitroSniper Error", "Could not find a token to login with!");
        else {
            this.unpatchDispatch = BdApi.monkeyPatch(BdApi.findModuleByProps("dispatch"), "dispatch", { after: this.dispatch.bind(this) });
            BdApi.showToast("NitroSniper logged in sucessfully!");
            BdApi.showToast("NitroSniper made by dev-69#2995 ")
        }
    }

    stop() {
        if (this.unpatchDispatch != null)
            this.unpatchDispatch();
    }

    dispatch(dispatched) {
        if (dispatched.methodArguments[0].type !== "MESSAGE_CREATE" && dispatched.methodArguments[0].type !== "MESSAGE_UPDATE")
            return;

        const message = dispatched.methodArguments[0].message;

        if (message.content == null)
            return;

        const giftUrlArray = message.content.match(/(https?:\/\/)?(www\.)?(discord\.gift)\/[^_\W]+/g);

        if (giftUrlArray == null)
            return;

        giftUrlArray.forEach(async (giftUrl) => {
            const code = giftUrl.replace(/(https?:\/\/)?(www\.)?(discord\.gift)\//g, "");

            if (this.token == null || this.token === "") {
                BdApi.alert("NitroSniper Error", `Failed to redeem nitro code: \`${code}\`, because the token specified was null or whitespace.`);
                return;
            }

            let response = await fetch(`https://discord.com/api/v6/entitlements/gift-codes/${code}/redeem`, {
                method: "POST",
                headers: {
                    "Accept": "application/json, text/javascript, */*; q=0.01",
                    "Authorization": this.token,
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.75 Safari/537.36"
                }
            });
            if (response.status == 200)
                return BdApi.alert("NitroSniper Success", `Successfully redeemed nitro code \`${code}\` from \`${message.author.username}#${message.author.discriminator}\` in \`${message.channel_id}\``);
            else if (response.status == 400)
                return BdApi.showToast(`Failed to redeem expired nitro code: ${code}.\nIn ${message.guild.name}\nIn${message.channel.name}`);
            else if (response.status == 403)
                return BdApi.alert("NitroSniper Error", "Discord returned error code 403, this usually means there is an issue with your account's API permissions\nContact dev-69#2995 for support");
            else
                return BdApi.alert("NitroSniper Error", `Discord returned error code: \`${response.status}\`, when trying to redeem nitro code: \`${code}\`.`);
        });
    }
}

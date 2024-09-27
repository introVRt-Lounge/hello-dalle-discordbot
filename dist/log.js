"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logMessage = logMessage;
const config_1 = require("../src/config");
/**
 * Logs a message to the bot spam channel of the specified guild.
 * If the guild is not provided, logs the message to the first available guild's bot spam channel.
 *
 * @param client - The Discord client instance.
 * @param guild - The guild where the message will be logged. Optional.
 * @param message - The message to be logged, can be a string or an object with content and files.
 */
function logMessage(client, guild, message) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(message);
        const getBotSpamChannel = (guild) => {
            const channel = guild.channels.cache.get(config_1.BOTSPAM_CHANNEL_ID);
            return (channel === null || channel === void 0 ? void 0 : channel.isTextBased()) ? channel : undefined;
        };
        const botSpamChannel = guild ? getBotSpamChannel(guild) : getBotSpamChannel(client.guilds.cache.first());
        if (!botSpamChannel) {
            console.warn(`Bot spam channel with ID ${config_1.BOTSPAM_CHANNEL_ID} not found or not text-based`);
            return;
        }
        if (typeof message === 'string') {
            yield botSpamChannel.send(message);
        }
        else {
            const { content = '', files = [] } = message;
            yield botSpamChannel.send({ content, files });
        }
    });
}

import { WebClient } from '@slack/web-api';

const options = {};
const web = new WebClient(process.env.SLACK_TOKEN, options);

export const sendSlackMessage = async (message: string) => {
    return new Promise(async (resolve, reject) => {
        const channelId = process.env.SLACK_CHANNEL_ID || 'C08JA0DFP0F';
        try {
            const resp = await web.chat.postMessage({
                text: message,
                channel: channelId,
            });
            return resolve(true);
        } catch (error) {
            console.log("Error", error);
            return resolve(true);
        }
    });
};

export const joinSlackChannel = (channel: string) => {
    return new Promise(async (resolve, reject) => {
        try {
            const resp = await web.conversations.join({
                channel: channel,
            });
            return resolve(true);
        } catch (error) {
            return resolve(true);
        }
    });
};

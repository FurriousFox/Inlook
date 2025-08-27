import IMAPServer, { IMAPMessageDetails } from "../../node-imap-server/index.ts";
import crypto from "node:crypto";
import { Buffer } from "node:buffer";

import getToken from "./auth.ts";
await getToken();

new IMAPServer({
    port: 1433,
}, {
    connection(event, action) {
        console.log(`received connection from ${event.connection.source.address}`);

        // action.noAuth();
        action.requireLogin();
    },

    auth(event, action) {
        if (crypto.hash("sha512", Buffer.concat([
            Buffer.from(event.username),
            Buffer.from("+e4963616-97cc-420f-acaf-03ecc19abf9b+"),
            Buffer.from(event.password),
        ])) == "8c8ab6e002eea2d03254cb4b66a906164295b9d8cb7ba433196d4d4c1246850277435883e4e1a23fdb68cef1b1796c0a856864a0f1e16c080d5b78b170a2ebe7") action.accept();
        else action.reject();
    },

    boxes(_event, action) {
        action.resolve([{
            name: "INBOX",
            id: "INBOX",

            subboxes: [{
                name: "subbox2",
                id: "INBOX-subbox2",

                flags: ["\\Seen", "\\Deleted", "\\Draft"],
                permanentflags: ["\\Seen", "\\Deleted"],

                messages: {
                    count: 1,
                    unread_count: 1,
                }
            }],

            flags: ["\\Seen", "\\Deleted", "\\Draft"],
            permanentflags: ["\\Seen", "\\Deleted"],

            messages: {
                count: 1,
                unread_count: 1,
            }
        }]);
    },

    async getMessageDetails({ box: _box, range: _range }, { resolve: _resolve }) {
        // must be relatively fast MAY NOT take long, shouldn't go out of it's way to fetch extra properties

        const response = await (await fetch("https://outlook.office.com/api/v2.0/me/messages", {
            headers: {
                "Authorization": `Bearer ${await getToken()}`,
            },
        })).json();

        const messageDetails: IMAPMessageDetails[] = [];
        for (const message of response.value) {
            messageDetails.push({
                uid: message.Id as string,
                flags: ["\\Recent"],

                internet_message_id: message.InternetMessageId as string,

                date: new Date(message.SentDateTime),
                received_date: new Date(message.CreatedDateTime),

                sender: {
                    name: message.Sender.EmailAddress.Name as string,
                    address: message.Sender.EmailAddress.Address as string,
                },

                from: {
                    name: message.From.EmailAddress.Name as string,
                    address: message.From.EmailAddress.Address as string,
                },

                to: (message.ToRecipients as { EmailAddress: { Name: string, Address: string; }; }[]).map(e => {
                    return { name: e.EmailAddress.Name, address: e.EmailAddress.Address };
                }),

                subject: message.Subject
            });
        }

        // resolve(messageDetails);
        return messageDetails;
    },

    async getMessage({ box: _box, uid: _uid }, { resolve: _resolve }) {
        // MAY take long

        const eml = await (await fetch(`https://outlook.office.com/api/v2.0/me/messages/${encodeURIComponent(_uid)}/$value`, {
            headers: {
                "Authorization": `Bearer ${await getToken()}`,
            },
        })).text();

        return eml as string;
    }
});
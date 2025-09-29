import IMAPServer from "npm:node-imap-server";
import type { IMAPMessageDetails, IMAPBox } from "npm:node-imap-server";

// import crypto from "node:crypto";
// import { Buffer } from "node:buffer";

import getToken from "./src/auth.ts";
await getToken();

new IMAPServer({
    port: 1433,
    // address: "0.0.0.0",
    address: "127.0.0.1",
}, {
    connection(event, action) {
        console.log(`received connection from ${event.connection.source.address}`);

        // action.noAuth();
        action.requireLogin();
    },

    auth(event, action) {
        // if (crypto.hash("sha512", Buffer.concat([
        //     Buffer.from(event.username),
        //     Buffer.from("+e4963616-97cc-420f-acaf-03ecc19abf9b+"),
        //     Buffer.from(event.password),
        // ])) == "8c8ab6e002eea2d03254cb4b66a906164295b9d8cb7ba433196d4d4c1246850277435883e4e1a23fdb68cef1b1796c0a856864a0f1e16c080d5b78b170a2ebe7") action.accept();

        if (event.username == "test" && event.password == "test") action.accept();
        else action.reject();
    },

    async boxes(_event, action) {
        const token = await getToken();

        const inbox_id = (await (await fetch("https://outlook.office.com/api/v2.0/me/MailFolders/Inbox", {
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        })).json()).Id;

        const response = await (await fetch("https://outlook.office.com/api/v2.0/me/MailFolders", {
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        })).json();
        for (const mcbox of response.value) {
            if (mcbox.ChildFolderCount > 0) {
                const response2 = await (await fetch(`https://outlook.office.com/api/v2.0/me/MailFolders/${mcbox.Id}/childfolders`, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    },
                })).json();

                for (const cbox of response2.value) response.value.push(cbox);
            }
        }

        console.log(response.value);

        const premailboxes = Object.fromEntries(response.value.map((mailbox => {
            return [mailbox.Id, {
                name: mailbox.Id == inbox_id ? "INBOX" : mailbox.DisplayName,
                id: mailbox.Id,

                parent: mailbox.ParentFolderId,

                messages: {
                    count: mailbox.TotalItemCount,
                    unread_count: mailbox.UnreadItemCount,
                }
            }];
        }) as ((mailbox: {
            Id: string;
            DisplayName: string;
            ParentFolderId: string;
            ChildFolderCount: number;
            UnreadItemCount: number;
            TotalItemCount: number;
        }) => ([string, {
            name: string;
            id: string;

            parent: string;

            messages: {
                count: number;
                unread_count: number;
            };
        }])))) as {
            [key: string]: {
                name: string;
                id: string;

                parent: string;

                messages: {
                    count: number;
                    unread_count: number;
                };

                subboxes?: Array<IMAPBox>;
            };
        };

        for (const prebox in premailboxes) {
            if (premailboxes[premailboxes[prebox].parent]) {
                if (!(premailboxes[premailboxes[prebox].parent].subboxes instanceof Array)) {
                    premailboxes[premailboxes[prebox].parent].subboxes = [];
                }

                premailboxes[premailboxes[prebox].parent].subboxes!.push({
                    name: premailboxes[prebox].name,
                    id: premailboxes[prebox].id,

                    flags: ["\\Seen", "\\Deleted", "\\Draft"],
                    permanentflags: ["\\Seen", "\\Deleted"],

                    messages: {
                        count: premailboxes[prebox].messages.count,
                        unread_count: premailboxes[prebox].messages.unread_count,
                    }
                });
            }
        }

        const mailboxes: IMAPBox[] = [];
        for (const prebox in premailboxes) {
            if (!(premailboxes[premailboxes[prebox].parent])) {
                mailboxes.push({
                    name: premailboxes[prebox].name,
                    id: premailboxes[prebox].id,

                    subboxes: premailboxes[prebox].subboxes,

                    flags: ["\\Seen", "\\Deleted", "\\Draft"],
                    permanentflags: ["\\Seen", "\\Deleted"],

                    messages: {
                        count: premailboxes[prebox].messages.count,
                        unread_count: premailboxes[prebox].messages.unread_count,
                    }
                });
            }
        }


        action.resolve(mailboxes);


        // action.resolve([{
        //     name: "INBOX",
        //     id: "INBOX",

        //     subboxes: [{
        //         name: "subbox2",
        //         id: "INBOX-subbox2",

        //         flags: ["\\Seen", "\\Deleted", "\\Draft"],
        //         permanentflags: ["\\Seen", "\\Deleted"],

        //         messages: {
        //             count: 1,
        //             unread_count: 1,
        //         }
        //     }],

        //     flags: ["\\Seen", "\\Deleted", "\\Draft"],
        //     permanentflags: ["\\Seen", "\\Deleted"],

        //     messages: {
        //         count: 1,
        //         unread_count: 1,
        //     }
        // }]);
    },

    async getMessageDetails({ box: box, range: _range }, { resolve: _resolve }) {
        // must be relatively fast MAY NOT take long, shouldn't go out of it's way to fetch extra properties

        const token = await getToken();
        const response = await (await fetch(`https://outlook.office.com/api/v2.0/me/MailFolders/${box.id}/messages`, {
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        })).json();
        let nextLink = response["@odata.nextLink"];
        while (nextLink) {
            const response2 = await (await fetch(nextLink, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            })).json();
            if (response2["value"]) for (const value of response2["value"]) response["value"].push(value);

            nextLink = response2["@odata.nextLink"];
        }

        const messageDetails: IMAPMessageDetails[] = [];
        for (const message of response.value) {
            messageDetails.push({
                uid: message.Id as string,
                flags: ["\\Recent", ...((message.IsRead ? ["\\Seen"] : []) as (["\\Seen"] | []))],

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
        const read = (await (await fetch(`https://outlook.office.com/api/v2.0/me/messages/${encodeURIComponent(_uid)}`, {
            headers: {
                "Authorization": `Bearer ${await getToken()}`,
            },
        })).json()).IsRead;

        const eml = await (await fetch(`https://outlook.office.com/api/v2.0/me/messages/${encodeURIComponent(_uid)}/$value`, {
            headers: {
                "Authorization": `Bearer ${await getToken()}`,
            },
        })).text();

        // return eml as string;
        return { eml: eml as string, read: false };
    }
});
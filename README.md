# Inlook

Outlook sucks, so this is a tool to use your own e-mail client, even if your organisation doesn't allow 3rd party email clients, allowing you to imitate different apps and offering multiple ways to integrate with your own mail client.

Only requirement is being able to use outlook.office365.com (which I assume you do, cuz what emails would you else want to read ig).

Imitates Outlook Web (OWA) and uses the Outlook REST API to create a bridge via IMAP and SMTP

## IMAP Server

Since there was no usable IMAP server implementation for NodeJS yet, I wrote my own IMAP server in node ([GitHub](https://github.com/FurriousFox/node-imap-server), [NPM](https://www.npmjs.com/package/node-imap-server))

## AI Usage

AI was **only** used for examples, and to help me interpret the awfully hard to read [RFC3501 (IMAP4rev1)](https://datatracker.ietf.org/doc/html/rfc3501)

# Inlook

Outlook sucks, so this is a tool to use your own e-mail client, even if your organisation doesn't allow 3rd party email clients, allowing you to imitate different apps and offering multiple ways to integrate with your own mail client.

Only requirement is being able to use outlook.office.com (which I assume you do, cuz what emails would you else want to read ig).

Imitates Outlook Web (OWA) and uses the Outlook REST API to create a bridge via IMAP and SMTP

## Current state

SMTP bridge will be added in a future release, reading emails should be fully functional.

**Inlook is currently only tested on Thunderbird for desktop, it doesn't play nicely with other clients yet!**
Improving compatibility will be first priority, after that performance and improving functionality (e.g. timely notifications, renaming folders).

## Running it

```bash
git clone https://github.com/FurriousFox/Inlook.git
cd Inlook
deno install --allow-scripts=npm:puppeteer
deno -A index.ts
```

## IMAP Server

Since there was no usable IMAP server implementation for NodeJS yet, I wrote my own IMAP server in node ([GitHub](https://github.com/FurriousFox/node-imap-server), [NPM](https://www.npmjs.com/package/node-imap-server))

## AI Usage

AI was **only** used for examples, and to help me interpret the awfully hard to read [RFC3501 (IMAP4rev1)](https://datatracker.ietf.org/doc/html/rfc3501)

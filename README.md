# Inlook

Outlook sucks, so this is a tool to use your own e-mail client, even if your organisation doesn't allow 3rd party email clients.

Imitates Outlook Web (OWA) and uses the Outlook REST API to create a bridge via IMAP and SMTP

## Important notes

- **Inlook currently only works well with Thunderbird Desktop, it doesn't play nicely with other clients yet!**
- SMTP bridge will be added in a future release, reading emails should be fully functional.
- Inlook functions slower on personal accounts compared to educational/organisational accounts due to different rate limits

Improving compatibility will be first priority, after that performance and improving functionality (e.g. timely notifications, renaming folders, outgoing mail).

## Running it

- [install Deno](https://docs.deno.com/runtime/getting_started/installation/) if you haven't yet

```bash
git clone https://github.com/FurriousFox/Inlook.git
cd Inlook
deno install --allow-scripts=npm:puppeteer
deno -A index.ts
```

- [download and install](https://www.thunderbird.net/en-US/thunderbird/all/#download-os-select) Thunderbird if you haven't yet

- setup thunderbird to use your local Inlook server
![thunderbird email setup screen](https://raw.githubusercontent.com/FurriousFox/Inlook/refs/heads/main/thunderbird.png)
  - The default username is "test" and password is "test", this shouldn't be a huge security issue as Inlook only listens at localhost by default, but please change this.
  - Once you're done filling these fields, press the "Advanced config" button at the bottom, this confirms the manual configuration.

or [watch this handy-dandy video tutorial](https://raw.githubusercontent.com/FurriousFox/Inlook/refs/heads/main/video.mp4)

## IMAP Server

Since there was no usable IMAP server implementation for NodeJS yet, I wrote my own IMAP server in node ([GitHub](https://github.com/FurriousFox/node-imap-server), [NPM](https://www.npmjs.com/package/node-imap-server))

## AI Usage

AI was **only** used for examples, and to help me interpret the awfully hard to read [RFC3501 (IMAP4rev1)](https://datatracker.ietf.org/doc/html/rfc3501)

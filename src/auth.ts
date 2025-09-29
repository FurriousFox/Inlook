import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { INetworkModule } from "npm:@azure/msal-common";
import * as msal from "npm:@azure/msal-node";
import puppeteer from "npm:puppeteer";

process.on("uncaughtException", e => console.log("uncaughtException", e));
process.on("unhandledRejection", e => console.log("unhandledRejection", e));

const CLIENT_ID = "9199bf20-a13f-4107-85dc-02114787ef48"; // One Outlook Web (OWA)

if (!fs.existsSync(path.dirname(`${import.meta.dirname}/../state/`))) fs.mkdirSync(path.dirname(`${import.meta.dirname}/../state/`), { recursive: true });
const MSAL_CREDS = `${import.meta.dirname}/../state/msal_creds.json`;

const scopes = [
    "https://outlook.office.com/.default",
    "profile",
    "offline_access",
    "openid",
];

const outlookOriginClient: INetworkModule = {
    sendGetRequestAsync: async (url, options) => {
        const res = await fetch(url, { method: "GET", headers: { ...options?.headers, Origin: "https://outlook.office.com" } });
        return { headers: Object.fromEntries(res.headers.entries()), body: await res.json(), status: res.status };
    },
    sendPostRequestAsync: async (url, options) => {
        const res = await fetch(url, { method: "POST", headers: { ...options?.headers, Origin: "https://outlook.office.com" }, body: options?.body });
        return { headers: Object.fromEntries(res.headers.entries()), body: await res.json(), status: res.status };
    }
};

const pca = new msal.PublicClientApplication({
    auth: { clientId: CLIENT_ID, authority: `https://login.microsoftonline.com/common` },
    system: { networkClient: outlookOriginClient }
});

export async function getToken(forceInteractive = false, silent = false, tryHeadless = false, returnUrl = false, customMsalUrl: undefined | string = undefined) {
    let interactive = true;

    try {
        if (fs.existsSync(MSAL_CREDS)) {
            const data = fs.readFileSync(MSAL_CREDS, "utf8");
            if (data && data.length > 0) {
                pca.getTokenCache().deserialize(data);
                interactive = false;
            }
        }
    } catch (err) {
        console.warn("Failed to import MSAL credentials:", err);
    }

    if (interactive || forceInteractive) {
        const codeVerifier = crypto.randomBytes(32).toString("base64url");
        const codeChallenge = crypto.createHash("sha256")
            .update(codeVerifier)
            .digest()
            .toString("base64url");

        const code_url: Promise<string> = new Promise((resolve, reject) => (async (resolve, reject) => {
            let a = false;
            let b = false;
            const msal_url = customMsalUrl ? customMsalUrl : await pca.getAuthCodeUrl({
                scopes: scopes,
                redirectUri: "https://outlook.office.com/mail/",
                codeChallenge: codeChallenge,
                codeChallengeMethod: "S256"
            });

            let f = false;
            let g: number | undefined;
            const browser = await puppeteer.launch(tryHeadless ? {
                headless: true,
                userDataDir: `${import.meta.dirname}/../state/puppeteerUserData`
            } : {
                headless: false,
                userDataDir: `${import.meta.dirname}/../state/puppeteerUserData`,
                defaultViewport: null
            });
            if (tryHeadless) {
                if (!silent) console.log("Trying to obtain token semi-interactively (headless), waiting up to 10 seconds...");
                g = setTimeout(async () => {
                    if (f) return; else f = true;
                    if (!silent) console.log("Failed to headlessly obtain token, user interaction required.");

                    browser.close();
                    resolve(await getToken(true, undefined, false, true, msal_url));
                }, 10000);

            }

            process.on("SIGINT", () => {
                browser.close();
                f = true;
                reject("received SIGINT");

                process.exit();
            });
            browser.on("disconnected", () => {
                if (!a && !f) {
                    f = true;
                    reject("browser closed");
                }
            });

            const pageobject: { page?: puppeteer.Page; } = {};
            if ((await browser.pages()).length) {
                // (pageobject.page = (await browser.pages())[0]).goto("https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=9199bf20-a13f-4107-85dc-02114787ef48&scope=https://outlook.office.com/.default openid profile offline_access&redirect_uri=https://outlook.office365.com/mail/oauthRedirect.html");
                (pageobject.page = (await browser.pages())[0]).goto(msal_url);
            } else {
                // (pageobject.page = await browser.newPage()).goto("https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=9199bf20-a13f-4107-85dc-02114787ef48&scope=https://outlook.office.com/.default openid profile offline_access&redirect_uri=https://outlook.office365.com/mail/oauthRedirect.html");
                (pageobject.page = await browser.newPage()).goto(msal_url);
            }
            pageobject.page.bringToFront();

            function registerFramenavigated(pageobject: { page: puppeteer.Page; }) {
                pageobject.page.on("framenavigated", async (frame) => {
                    const url = frame.url();
                    // console.log(url);
                    if (url.match(/https:\/\/login\.microsoftonline\.com\/.+\/.+/)) {
                        pageobject.page.evaluate(`{ const rememberYes = setInterval(()=>{ if (document.querySelector(".button_primary") && document.querySelector("meta[name=PageID]").content == 'KmsiInterrupt') { clearInterval(rememberYes); document.querySelector(".button_primary").click(); } }, 100) }`).catch(() => { });;
                    } else if (url.match(/https:\/\/login\.live\.com\/.+\.srf/)) {
                        pageobject.page.evaluate(`{ const rememberYes = setInterval(()=>{ if (document.querySelector("button[data-testid=primaryButton]") && !!(document.querySelector("img[data-testid=kmsiImage]")??document.querySelector("div[data-testid=kmsiVideo]"))) { clearInterval(rememberYes); document.querySelector("button[data-testid=primaryButton]").click(); } }, 100) }`).catch(() => { });
                    }

                    if (!b && url.startsWith("https://outlook.office365.com/mail/oauthRedirect.html")) {
                        b = true;
                        const oldpage = pageobject.page;
                        pageobject.page = await browser.newPage();
                        registerFramenavigated(pageobject);
                        pageobject.page.goto(msal_url);
                        oldpage.close();
                        pageobject.page.bringToFront();
                    } else if (url.match(/https?:\/\/outlook\.office\.com\/mail\/?\?.*code=.+/) && !a) {
                        a = true;
                        browser.close();
                        f = true;
                        if (g) clearTimeout(g);
                        resolve(url);
                    }
                });
            }

            registerFramenavigated(pageobject as { page: puppeteer.Page; });
        })(resolve, reject));

        if (returnUrl) return await code_url;

        const code = new URL(await code_url).searchParams.get("code");
        if (!code) throw new Error("Failed to interactively obtain token");

        const token = await pca.acquireTokenByCode({
            code,
            scopes,
            redirectUri: "https://outlook.office.com/mail/",
            codeVerifier: codeVerifier
        });
        if (!token.accessToken) throw new Error("No access token received");

        fs.writeFileSync(MSAL_CREDS, pca.getTokenCache().serialize());


        if (!silent) console.log("Interactively obtained access token, expires:", token.expiresOn);
        return token.accessToken;
    } else {
        const accounts = await pca.getTokenCache().getAllAccounts();
        if (accounts.length === 0) return await getToken(true);

        try {
            let token = await pca.acquireTokenSilent({
                account: accounts[0],
                scopes: scopes,
            });

            if (token.expiresOn == null || (+token.expiresOn - Date.now()) < 45 * 60000) {
                token = await pca.acquireTokenSilent({
                    account: accounts[0],
                    scopes: scopes,
                    forceRefresh: true
                });
            }

            fs.writeFileSync(MSAL_CREDS, pca.getTokenCache().serialize());


            if (!silent) console.log("Silently obtained access token, expires:", token.expiresOn);
            return token.accessToken;
        } catch (_err) {
            console.log(/* _err, "\n */"Failed to silently obtain token, trying headless browser.");
            return await getToken(true, undefined, true);
        }
    }
}

export default getToken;
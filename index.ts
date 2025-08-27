import getToken from "./src/auth.ts";
import fs from "node:fs";


const token = await getToken();

const response = await fetch("https://outlook.office.com/api/v2.0/me/messages", {
    headers: {
        "Authorization": `Bearer ${token}`,
    },
});
const response_json = await response.json();
fs.writeFileSync("response.json", JSON.stringify(response_json, null, 2));

const response2 = await fetch(`https://outlook.office.com/api/v2.0/me/messages/${encodeURIComponent(response_json.value[0].Id)}/$value`, {
    headers: {
        "Authorization": `Bearer ${token}`,
    },
});
console.log(await response2.text());
// const response2_eml = await response2.text();
// fs.writeFileSync("response2.eml", response2_eml);


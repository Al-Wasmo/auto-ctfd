// chrome.tabs.query({active: true,currentWindow: true},tabs => {
// chrome.tabs.sendMessage(tabs[0].id,"URMOM")
// });

let Cookie = {};
let Challs = {};
let Tab = {};
let CTF_URL = "https://ctf.swampctf.com";
// CTF_URL = "https://iiitv.capturepoint5353.tech/";


function chrome_getCurrTab() {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            resolve(tabs[0]);
        });
    });
}
async function getSessionCookie() {
    return new Promise((resolve) => {
        chrome.cookies.getAll({ url: Tab.url }, (cookies) => {
            let sessionCookie = cookies.find(cookie => cookie.name == "session" && cookie.value);
            if (!sessionCookie) {
                resolve(undefined);
            } else {
                resolve(sessionCookie);
            }
        });
    })
}

function render_Categories() {
    let categoriesListElem = document.getElementById("categories-list");
    categoriesListElem.innerHTML = "";
    Object.keys(Challs).forEach((category, index) => {
        let realCategory = category;
        category = category || `unamed-${index}`;
        let listItemElem = document.createElement("label");
        listItemElem.innerHTML = `<input type="checkbox" name="${realCategory}" value="${category}"> ${category}`;
        categoriesListElem.appendChild(listItemElem);
        categoriesListElem.appendChild(document.createElement("br"));
    });
}




async function req_loadChalls() {
    const res = await fetch(`${CTF_URL}/api/v1/challenges`, {
        "headers": {
            "accept": "application/json",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json",
            "priority": "u=1, i",
            "sec-ch-ua": "\"Chromium\";v=\"134\", \"Not:A-Brand\";v=\"24\", \"Google Chrome\";v=\"134\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Linux\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin"
        },
        "referrer": `${CTF_URL}/challenges`,
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "include"
    });
    const resJson = (await res.json()).data;
    let challs = [];
    if (resJson) {
        // filter challs by category 
        challs = resJson.reduce((byCategory, chall) => {
            if (!Object.keys(byCategory).includes(chall.category)) { byCategory[chall.category] = []; }
            byCategory[chall.category].push({
                name: chall.name,
                solves: chall.solves,
                id: chall.id,
                value: chall.value,
            });
            return byCategory;
        }, {});
    } else {
        return undefined;
    }

    return challs
}

async function req_getChallInfo(chall) {
    let res = await fetch(`${CTF_URL}/api/v1/challenges/${chall.id}`, {
        "headers": {
            "accept": "application/json",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json",
            "priority": "u=1, i",
            "sec-ch-ua": "\"Chromium\";v=\"134\", \"Not:A-Brand\";v=\"24\", \"Google Chrome\";v=\"134\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Linux\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin"
        },
        "referrer": `${CTF_URL}/challenges`,
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "include"
    });
    let resJson = await res.json();
    if (!resJson.success) {
        return undefined;
    }
    resJson = resJson.data;
    let info = {
        desc: resJson.description,
        connection_info: resJson.connection_info,
        files: resJson.files,
        hints: resJson.hints,
        view: resJson.view,
        screenshot : await host_takeScreenshotOfChall(resJson.view),
        ...chall
    };

    return info;
}


async function host_takeScreenshotOfChall(challView) {

    return new Promise(
    async (resolve) => chrome.scripting.executeScript({
        target: { tabId: Tab.id },
        func: async (challView) => {
            let base64Img;



            const tmp = document.createElement("div");
            tmp.style.position = "absolute";
            tmp.style.left = "-9999px";
            tmp.style.width = "640px";
            tmp.id = "ctfd-automator-inserted";
            tmp.innerHTML = challView;

            if(document.getElementById("challenge-window")) {
              
                let cloned = document.getElementById("challenge-window").cloneNode(true);
                console.log("base64Img",'base64Img');

                cloned.style.opacity = "1";
                cloned.style.display = "block";

                cloned.classList.add("challenge-window-somerandomnumberidontknowyet");
                cloned.style.position = "relative";
                cloned.style.left = "-9999px";
                cloned.appendChild(tmp);



                document.body.appendChild(cloned);
                let canvas = await html2canvas(document.getElementById("ctfd-automator-inserted").children[0]);
                base64Img = canvas.toDataURL("image/png");
                document.body.removeChild(cloned);
            
            } else {
                document.body.appendChild(tmp);
                let canvas = await html2canvas(tmp.children[0]);
                base64Img = canvas.toDataURL("image/png");
                document.body.removeChild(tmp);
            }


            console.log("base64Img",base64Img);
            return base64Img;
        },
        args: [challView]
    }, (results) => {
        if (results && results.length > 0) {
            resolve(results[0].result);
        }
    }));
}

window.addEventListener("load", async () => {
    Tab = await chrome_getCurrTab();
    Challs = await req_loadChalls();
    if (!Challs) {
        console.log("[ctfd-automtator] Error: failed to load challs");
        return;
    }
    render_Categories();
});



document.getElementById("categories-download").addEventListener("click",async () => {
    let allChallsInfo = [];
    
    const categories = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map((elem) => elem.getAttribute("name"));
    for(let category of categories) {
        for(let chall of Challs[category]) {
            let info = await req_getChallInfo(chall);
            console.log(info.screenshot);
            allChallsInfo.push(info);
        }
    }

    // fetch("http://127.0.0.1:5000/save",{
    //     method: "post",
    //     body: JSON.stringify(allChallsInfo),
    // });

    
})



let Cookie = {};
let Challs = {};
let Tab = undefined;
let CTF_URL = undefined;
let SERVER_ADDR = "http://127.0.0.1:5000";
let ServerStatus = "?";
let CTF_NAME = "";
let CTF_SITE = "ctfd";


function chrome_getCurrTab() {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            resolve(tabs[0]);
        });
    });
}
async function chrome_getSessionCookie() {
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

function chome_getLocalStorage() {
    return new Promise(resolve => {
        chrome.scripting.executeScript({
            target: { tabId: Tab.id },
            func: () => {
                return JSON.stringify(localStorage);
            }
        }, (results) => {
            if (results && results[0] && results[0].result) {
                resolve(JSON.parse(results[0].result))
            } else {
                resolve(undefined)
            }
        });
    });
}


async function req_loadChalls() {
    let res = undefined;
    let resJson = undefined;
    let ctfSite = "ctfd";

    try {
        res = await fetch(`${CTF_URL.origin}/api/v1/challenges`, {
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
            "referrer": `${CTF_URL.origin}/challenges`,
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "include"
        });
        resJson = (await res.json()).data;
        if (!resJson) {
            throw undefined;
        }

    } catch (e) {
        ctfSite = "rctf";
        // failed to request info, maybe its rctf site
        try {
            const token = (await chome_getLocalStorage()).token;

            res = await fetch(`${CTF_URL.origin}/api/v1/challs`, {
                "headers": {
                    "authorization": `Bearer ${token}`,
                    "sec-ch-ua": "\"Chromium\";v=\"134\", \"Not:A-Brand\";v=\"24\", \"Google Chrome\";v=\"134\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Linux\""
                },
                "referrer": `${CTF_URL.origin}/challs`,
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": null,
                "method": "GET",
                "mode": "cors",
                "credentials": "include"
            });
            resJson = await res.json();
        } catch (e) {
            console.log(e);
            return undefined;
        }
    }


    CTF_SITE = ctfSite;

    let challs = [];
    if (ctfSite == "ctfd") {
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
        resJson = resJson.data;
        challs = resJson.reduce((byCategory, chall) => {
            if (!Object.keys(byCategory).includes(chall.category)) { byCategory[chall.category] = []; }
            byCategory[chall.category].push({
                name: chall.name,
                files: chall.files,
                author: chall.author,
                solves: chall.solves,
                id: chall.id,
                value: chall.points,
                desc: chall.description,
            });
            return byCategory;
        }, {});
    }


    return challs
}
async function req_getChallInfo(chall) {

    let info = {
        desc: undefined,
        connection_info: undefined,
        files: undefined,
        hints: undefined,
        view: undefined,
        max_attempts: undefined,
        screenshot: undefined,
    };

    if (CTF_SITE == "ctfd") {

        let res = undefined;
        let resJson = undefined;


        // try out the ctfd api first
        try {
            res = await fetch(`${CTF_URL.origin}/api/v1/challenges/${chall.id}`, {
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
                "referrer": `${CTF_URL.origin}/challenges`,
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": null,
                "method": "GET",
                "mode": "cors",
                "credentials": "include"
            });
            resJson = await res.json();
        } catch (e) {
            return undefined;
        }




        if (!resJson.success) {
            return undefined;
        }
        resJson = resJson.data;

        let files = [];
        for (let file of resJson.files) {
            let url = new URL(CTF_URL.origin + file);
            let name = url.pathname.split("/").pop();
            files.push({
                name: name,
                url: url.href,
            })
        }

        info = {
            desc: resJson.description,
            connection_info: resJson.connection_info,
            files: files,
            hints: resJson.hints,
            view: resJson.view,
            max_attempts: resJson.max_attempts,
            screenshot: await host_takeScreenshotOfChall(resJson.view),
            ...chall
        };

    } else {
        info = {
            screenshot: await host_takeScreenshotOfChall(chall),
            ...chall,
        };
    }


    return info;
}



async function host_takeScreenshotOfChall(challViewOrName) {
    if (CTF_SITE == "ctfd") {
        return new Promise(
            async (resolve) => chrome.scripting.executeScript({
                target: { tabId: Tab.id },
                func: async (challViewOrName) => {
                    let base64Img;


                    const tmp = document.createElement("div");
                    tmp.style.position = "absolute";
                    tmp.style.left = "-9999px";
                    tmp.style.width = "700px";
                    tmp.id = "ctfd-automator-inserted";
                    tmp.innerHTML = challViewOrName;

                    if (document.getElementById("challenge-window")) {

                        let cloned = document.getElementById("challenge-window").cloneNode(true);

                        cloned.style.opacity = "1";
                        cloned.style.display = "block";

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


                    return base64Img;
                },
                args: [challViewOrName]
            }, (results) => {
                if (results && results.length > 0) {
                    resolve(results[0].result);
                }
            }));
    } else {
        return new Promise(
            async (resolve) => chrome.scripting.executeScript({
                target: { tabId: Tab.id },
                func: async (challViewOrName) => {
                    let base64Img;




                    const elements = document.querySelectorAll('.frame__body'); 

                    for (const el of elements) {
                      if (el.querySelector(".frame__title").textContent.includes(challViewOrName.name)) {
                        const parent = el.parentElement;
                        let canvas = await html2canvas(parent);
                        base64Img = canvas.toDataURL("image/png");                        
                        return base64Img;
                      }
                    }                    


                    return "";
                },
                args: [challViewOrName]
            }, (results) => {
                if (results && results.length > 0) {
                    resolve(results[0].result);
                }
            }));
    }

}


async function loadTabInfo() {
    if (!Tab || !CTF_URL) {
        Tab = await chrome_getCurrTab();
        CTF_URL = new URL(Tab.url);
    }
}
async function downloadCategory() {


    let selectedCategories = Array.from(document.querySelectorAll(".category-label-checkbox input")).filter(elem => elem.checked).map(elem => elem.getAttribute("name"));
    let challsByCategory = {};
    for (let category of selectedCategories) {
        for (let chall of Challs[category]) {
            if (!Object.keys(challsByCategory).includes(category)) challsByCategory[category] = [];
            let info = await req_getChallInfo(chall);
            challsByCategory[category].push(info);
        }
        break;
    }

    fetch(`${SERVER_ADDR}/save`, {
        method: "post",
        body: JSON.stringify({
            challsByCategory: challsByCategory,
            ctfName: document.querySelector("#ctf-name").value,
        }),
    });

}



const { useState, useEffect, useContext, createContext } = React;


const AppContext = createContext();
const AppProvider = ({ children }) => {
    const [serverStatus, setServerStatus] = useState("?");
    const [ctfURL, setCtfURL] = useState(undefined);
    const [serverAddr, setServerAddr] = useState(SERVER_ADDR);
    const [validCTFStatus, setValidCTFStatus] = useState("?");

    // Return context provider using React.createElement
    return React.createElement(
        AppContext.Provider,
        {
            value: {
                serverStatus, setServerStatus,
                ctfURL, setCtfURL,
                serverAddr, setServerAddr,
                validCTFStatus, setValidCTFStatus,
            }
        },
        children
    );
};



function ServerStatusComponent() {
    const { ctfURL, serverStatus, serverAddr, setServerStatus, setServerAddr } = useContext(AppContext);

    async function connectToServer() {
        ServerStatus = "?";
        setServerStatus(serverStatus);
        try {
            let res = await fetch(SERVER_ADDR);
            ServerStatus = res.status != 200 ? "-" : "+";;
        } catch (err) {
            ServerStatus = "-";
        }
        setServerStatus(ServerStatus);
    }

    function onChangeServerAddr(e) {
        setServerAddr(e.nativeEvent.target.value);
        SERVER_ADDR = e.nativeEvent.target.value;
        connectToServer();
    }



    useEffect(() => {
        connectToServer();
    }, []);

    return React.createElement("div", { class: "server-status parent-comp" },
        React.createElement("h3", null, "Server"),
        React.createElement("div", null,
            serverStatus == "?" ? React.createElement("div", { class: "server-status-response server-status-progress" }, React.createElement("p", null, "Checking server..."), React.createElement("progress")) : undefined,
            serverStatus == "+" ? React.createElement("div", { class: "server-status-response server-status-connected" }, React.createElement("p", null, "Connected")) : undefined,
            serverStatus == "-" ? React.createElement("div", { class: "server-status-response server-status-notConnected" },
                React.createElement("p", null, "Failed to connect"),
                React.createElement("button", { onClick: connectToServer }, "Retry"),

            ) : undefined,
        ),
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "14px" }, },
            React.createElement("p", null, "name"),
            ctfURL ? React.createElement("input", { type: "text", style: { width: "100%" }, defaultValue: ctfURL.host, id: "ctf-name" }) : undefined,
        ),
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px" }, },
            React.createElement("p", null, "server"),
            ctfURL ? React.createElement("input", { type: "text", style: { width: "100%" }, defaultValue: SERVER_ADDR, onChange: onChangeServerAddr }) : undefined,
        ),

    );
}

function CategoryListComponent() {
    async function onClickDownload() {
        setCollecting(true);
        await downloadCategory();
        setCollecting(false);
    }
    async function loadCategories() {
        setValidCTFStatus("?");


        Challs = await req_loadChalls();
        if (!Challs) {
            console.log("[auto-ctf] Error: failed to load challs, maybe not a ctfd/rctf site");
            setValidCTFStatus("-");
            return;
        }
        setValidCTFStatus("+");
    }

    useEffect(async () => {
        await loadTabInfo();
        setCtfURL(CTF_URL);
        await loadCategories();
    }, []);

    const { serverStatus, setCtfURL, validCTFStatus, setValidCTFStatus } = useContext(AppContext);
    const [render, setRender] = useState(false);
    const [collecting, setCollecting] = useState(false);


    function render_Categories() {
        if (validCTFStatus === '-') {
            return React.createElement(
                "div",
                { style: { display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "10px" } },
                React.createElement("p", { className: "server-status-response server-status-notConnected", style: { textAlign: "center" } }, "Site doesnt seem to be based on ctfd/rctf"),
                React.createElement("button", { onClick: loadCategories, }, "Retry?"),
            );
        } else {


            const categories = Object.keys(Challs || {});

            return React.createElement(
                "div",
                { style: { display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "6px" } },
                categories.length === 0 && React.createElement("progress", null),

                categories.map((category, index) => {
                    let realCategory = category || `unamed-${index}`;

                    return React.createElement(
                        "label",
                        { key: realCategory, className: "category-label-checkbox" },
                        React.createElement("input", { type: "checkbox", name: realCategory, value: realCategory }),
                        React.createElement(
                            "div",
                            { className: "category-item" },
                            React.createElement("p", null, realCategory),
                            React.createElement("p", null, Challs[realCategory]?.length === 1 ? "1 chall" : `${Challs[realCategory]?.length || 0} challs`)
                        )
                    );
                }),

                collecting &&
                React.createElement(
                    "div",
                    { style: { display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" } },
                    React.createElement("p", null, "collecting data"),
                    React.createElement("progress")
                ),

                serverStatus === "+" && categories.length > 0 &&
                React.createElement("button", { onClick: onClickDownload, disabled: false }, "Download"),

                serverStatus === "-" && categories.length > 0 &&
                React.createElement("button", { onClick: onClickDownload, disabled: true }, "Download (connect to server first)"),
            );
        }

    }


    return React.createElement("div", { class: "category-list parent-comp" },
        React.createElement("h3", null, "Categories"),
        render_Categories(),


    );
}


function App() {
    return React.createElement("div", { class: 'parent-comp' },
        React.createElement(AppProvider, null,
            React.createElement(ServerStatusComponent),
            React.createElement(CategoryListComponent),
        ),
    );
}



ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));


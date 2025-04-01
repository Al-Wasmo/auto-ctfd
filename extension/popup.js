// chrome.tabs.query({active: true,currentWindow: true},tabs => {
// chrome.tabs.sendMessage(tabs[0].id,"URMOM")
// });

let Cookie = {};
let Challs = {};
let Tab = undefined;
let CTF_URL = undefined;
let SERVER_ADDR = "http://127.0.0.1:5000";
let ServerStatus = "?";
let CTF_NAME = "";


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
    const res = await fetch(`${CTF_URL.origin}/api/v1/challenges`, {
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
    let res = await fetch(`${CTF_URL.origin}/api/v1/challenges/${chall.id}`, {
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
    let resJson = await res.json();
    if (!resJson.success) {
        return undefined;
    }
    resJson = resJson.data;

    let files = [];
    for(let file of resJson.files) {
        let url = new URL(CTF_URL.origin + file);
        let name = url.pathname.split("/").pop();
        files.push({
            name : name,
            url : url.href,
        })
    }

    let info = {
        desc: resJson.description,
        connection_info: resJson.connection_info,
        files: files,
        hints: resJson.hints,
        view: resJson.view,
        max_attempts: resJson.max_attempts,
        screenshot: await host_takeScreenshotOfChall(resJson.view),
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
                tmp.style.width = "700px";
                tmp.id = "ctfd-automator-inserted";
                tmp.innerHTML = challView;

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
            args: [challView]
        }, (results) => {
            if (results && results.length > 0) {
                resolve(results[0].result);
            }
        }));
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
            let info = await req_getChallInfo(chall);
            if(!Object.keys(challsByCategory).includes(category)) challsByCategory[category] = [];
            challsByCategory[category].push(info);
        }
    }


    fetch("http://127.0.0.1:5000/save",{
        method: "post",
        body: JSON.stringify({
            challsByCategory: challsByCategory,
            ctfName : document.querySelector("#ctf-name").value, 
        }),
    });

}



const { useState, useEffect, useContext, createContext } = React;


const AppContext = createContext();
const AppProvider = ({ children }) => {
    const [serverStatus, setServerStatus] = useState("?");
    const [ctfURL, setCtfURL] = useState(undefined);
    const [serverAddr, setServerAddr] = useState(SERVER_ADDR);
    
    // Return context provider using React.createElement
    return React.createElement(
        AppContext.Provider,
        { value: { 
            serverStatus, setServerStatus, 
            ctfURL, setCtfURL,
            serverAddr, setServerAddr,
        } },
        children
    );
};



function ServerStatusComponent() {
    const { ctfURL, serverStatus, serverAddr,setServerStatus, setServerAddr } = useContext(AppContext);

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
        React.createElement("div", {style: {display: "flex", alignItems: "center", gap: "14px"},},
            React.createElement("p", null, "name"),
            ctfURL ? React.createElement("input", { type: "text", style: {width: "100%"}, defaultValue:  ctfURL.host, id: "ctf-name" }) : undefined,
        ),
        React.createElement("div", {style: {display: "flex", alignItems: "center", gap: "10px"},},
            React.createElement("p", null, "server"),
            ctfURL ? React.createElement("input", { type: "text", style: {width: "100%"}, defaultValue:  SERVER_ADDR, onChange: onChangeServerAddr }) : undefined,
        ),        

    );
}

function CategoryListComponent() {

    async function onClickDownload() {
        setCollecting(true);
        await downloadCategory();
        setCollecting(false);
    }

    useEffect(async () => {
        await loadTabInfo();
        setCtfURL(CTF_URL);

        Challs = await req_loadChalls();
        if (!Challs) {
            console.log("[ctfd-automtator] Error: failed to load challs");
            return;
        }
        setRender((val) => !val);
    }, []);

    const { serverStatus,setCtfURL } = useContext(AppContext);
    const [render, setRender] = useState(false);
    const [collecting, setCollecting] = useState(false);

    return React.createElement("div", { class: "category-list parent-comp" },
        React.createElement("h3", null, "Categories"),
        Object.keys(Challs).length == 0 ? React.createElement("progress", null) : undefined,
        (() => {
            let elms = [];
            Object.keys(Challs).forEach((category, index) => {
                let realCategory = category;
                category = category || `unamed-${index}`;
                elms.push(React.createElement("label", { key: category, class: "category-label-checkbox" },
                    React.createElement("input", { type: "checkbox", name: realCategory, value: category }),
                    React.createElement("div", { class: "category-item" },
                        React.createElement("p", null, category),
                        React.createElement("p", null, Challs[realCategory].length == 1 ? "1 chall" : `${Challs[realCategory].length} challs`),

                    ),


                ));
            });
            return elms;
        })(),

        collecting ? 
            React.createElement("div", {style : {display: "flex", alignItems: "center", justifyContent: "center", flexDirection : "column"}}, 
                                        React.createElement("p", null , "collecting data"), React.createElement("progress")
            ) :  
            serverStatus == "+" && Object.keys(Challs).length != 0 ? React.createElement("button", { onClick: onClickDownload }, "Download") : undefined,
        serverStatus == "-" ? React.createElement("p", { class: "server-status-response server-status-notConnected0" }, "Please connect to server to download stuff") : undefined,
    );
}


function App() {
    return React.createElement("div", {class : 'parent-comp'},
        React.createElement(AppProvider, null,
            React.createElement(ServerStatusComponent),
            React.createElement(CategoryListComponent),
        ),
    );
}



ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));

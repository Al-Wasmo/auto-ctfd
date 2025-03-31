// chrome.tabs.query({active: true,currentWindow: true},tabs => {
// chrome.tabs.sendMessage(tabs[0].id,"URMOM")
// });

let Cookie = {};
let Challs = {};
let Tab = undefined;
let CTF_ORIGINE = "";
const SERVER_ADDR = "http://127.0.0.1:5000";
let ServerStatus = "?";


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
    const res = await fetch(`${CTF_ORIGINE}/api/v1/challenges`, {
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
        "referrer": `${CTF_ORIGINE}/challenges`,
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
    let res = await fetch(`${CTF_ORIGINE}/api/v1/challenges/${chall.id}`, {
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
        "referrer": `${CTF_ORIGINE}/challenges`,
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
                tmp.style.width = "640px";
                tmp.id = "ctfd-automator-inserted";
                tmp.innerHTML = challView;

                if (document.getElementById("challenge-window")) {

                    let cloned = document.getElementById("challenge-window").cloneNode(true);

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


                return base64Img;
            },
            args: [challView]
        }, (results) => {
            if (results && results.length > 0) {
                resolve(results[0].result);
            }
        }));
}



// document.getElementById("categories-download").addEventListener("click", async () => {
//     let allChallsInfo = [];

//     const categories = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map((elem) => elem.getAttribute("name"));
//     for (let category of categories) {
//         for (let chall of Challs[category]) {
//             let info = await req_getChallInfo(chall);
//             console.log(info.screenshot);
//             allChallsInfo.push(info);
//         }
//     }

// fetch("http://127.0.0.1:5000/save",{
//     method: "post",
//     body: JSON.stringify(allChallsInfo),
// });


// })




const { useState, useEffect, useContext, createContext } = React;


const AppContext = createContext();
const AppProvider = ({ children }) => {
    const [serverStatus, setServerStatus] = useState("?");
    const changeServerStatus = (status) => setServerStatus(status);

    // Return context provider using React.createElement
    return React.createElement(
        AppContext.Provider,
        { value: { serverStatus, changeServerStatus } },
        children
    );
};


async function loadTabInfo() {
    if (!Tab || !CTF_ORIGINE) {
        Tab = await chrome_getCurrTab();
        CTF_ORIGINE = new URL(Tab.url).origin;
    }
}

function ServerStatusComponent() {
    const {serverStatus,changeServerStatus} = useContext(AppContext);

    async function connectToServer() {
        ServerStatus = "?";
        changeServerStatus(serverStatus);
        try {
            let res = await fetch(SERVER_ADDR);
            ServerStatus = res.status != 200 ? "-" : "+";;
        } catch (err) {
            ServerStatus = "-";
        }
        changeServerStatus(ServerStatus);
    }

    useEffect(() => {
        connectToServer();
    }, []);

    return React.createElement("div", { class: "server-status" },
        React.createElement("h3", null, "Server"),
        serverStatus == "?" ? React.createElement("div", { class: "server-status-response server-status-progress" }, React.createElement("p", null, "Checking server..."), React.createElement("progress")) : undefined,
        serverStatus == "+" ? React.createElement("div", { class: "server-status-response server-status-connected" }, React.createElement("p", null, "Connected")) : undefined,
        serverStatus == "-" ? React.createElement("div", { class: "server-status-response server-status-notConnected" },
            React.createElement("p", null, "Failed to connect"),
            React.createElement("button", { onClick: connectToServer }, "Retry"),

        ) : undefined,
    );
}

function CategoryListComponent() {
    async function downloadCategory() {
        let selectedCategories = Array.from(document.querySelectorAll(".category-label-checkbox input")).filter(elem => elem.checked).map(elem => elem.getAttribute("name"));
        let allChallsInfo = [];
        for (let category of selectedCategories) {
            for (let chall of Challs[category]) {
                let info = await req_getChallInfo(chall);
                allChallsInfo.push(info);
            }
        }
        console.log(allChallsInfo);
    }

    useEffect(async () => {
        await loadTabInfo();
        Challs = await req_loadChalls();
        if (!Challs) {
            console.log("[ctfd-automtator] Error: failed to load challs");
            return;
        }
        setRender((val) => !val);
    }, []);

    const {serverStatus} = useContext(AppContext);
    const [render, setRender] = useState(false);

    return React.createElement("div", { class: "category-list" },
        React.createElement("h3", null, "Categories"),
        Object.keys(Challs).length == 0 ? React.createElement("progress", null) : undefined,
        (() => {
            let elms = [];
            Object.keys(Challs).forEach((category, index) => {
                let realCategory = category;
                category = category || `unamed-${index}`;
                elms.push(React.createElement("label", { key: category, class:"category-label-checkbox" }, 
                    React.createElement("input", { type: "checkbox", name: realCategory, value: category }),  
                    React.createElement("div", {class: "category-item"}, 
                        React.createElement("p", null,category), 
                        React.createElement("p", null,Challs[realCategory].length == 1 ? "1 chall" : `${Challs[realCategory].length} challs`), 

                    ),  
                    
                    
                ));
            });
            return elms;
        })(),
        serverStatus == "+" && Object.keys(Challs).length != 0 ? React.createElement("button", {onClick: downloadCategory}, "Download") : undefined,
        serverStatus == "-" ? React.createElement("p", {class: "server-status-response server-status-notConnected0"}, "Please connect to server") : undefined,
    );
}


function App() {
    useEffect(async () => {
        await loadTabInfo();
    }, []);

    return React.createElement("div", null,
        React.createElement(AppProvider, null,
            React.createElement(ServerStatusComponent),
            React.createElement(CategoryListComponent),
        ),
    );
}



ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));

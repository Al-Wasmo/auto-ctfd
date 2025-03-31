const Actions = {
    DOWNLOAD_SELECTED : "DOWNLOAD_SELECTED",
};

chrome.runtime.onMessage.addListener((msg,sender,res) => {
    if(msg.action == Actions.DOWNLOAD_SELECTED) {
        
    }
})

console.log("LOADED CONTENT")
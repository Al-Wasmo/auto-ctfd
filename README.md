# Auto-CTFd
Tool to automate downloading challenge files in CTFd-powered CTFs, targeting Pwn and Reverse categories (that's what I play).

## How it works  
- It uses a simple server-client architecture.  
    - **Client** (Chrome extension) is used to scrape the `challenge info` and send it to the server.  
    - **Server** (Flask) receives the `challenge info (card image, solves...)` and stores them in a `CTF directory` of your choosing and automatically downloads the `challenge files`.  

## Quick start  
- **Extension**: Add the extension to your Chrome browser.  
- **Server**:  
    - `cd server && pip install -r requirements.txt`  
    - `python3 main.py`  

## Next  
I will keep improving it while using it.  

## Docs and POC
[Docs and POC](docs.md)

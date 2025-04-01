from flask import Flask, request, make_response
import json
import base64
import random
import os
import time
from pySmartDL import SmartDL


def create_readme(chall):
    def files():
        if len(chall["files"]) == 0:
            return "- `files`: None\n"
        # parse files, shape is {name , url}
        out = "- `files`: \n"
        for file in chall["files"]:
            out += f"\t- [{file['name']}]({file['url']})\n"
        return out
    def hints():
        if len(chall["hints"]) == 0:
            return "- `hints`: None\n"       
        out = "- `hints`: \n"
        # parse hint, shape is {id, cost , content} 
        for hint in chall["hints"]:
            out += f"\t- {hint['content']}\n"
        return out

    return f"""
# {chall["name"]}
Card
---
<center><img src="card.png" alt="card"/></center>

Description 
---
{chall.get("desc","(Chall didnt provide any description)")}

Stats
---
- `solves`: {chall["solves"]}
- `max_attempts`: {chall["max_attempts"]}
- `connection_info`: {chall["connection_info"]}
{files() }
{hints()}
"""

app = Flask(__name__)

@app.route("/save",methods=["POST"])
def save():    
    # used to manage the ctf path, i will join it later using '/' to create a valid path
    DIR_PATH = []

    # Read config. use the ctf-dir option 
    config = {}
    with open("config.json", "r") as f:
        config = json.load(f)
    CTF_DIR = os.path.expanduser(config["ctf-dir"])  
    
    DIR_PATH.append(CTF_DIR)

    data = json.loads(request.data)
    ctf_name = data.get("ctfName","ctf")

    # possible race hehe, when making two requests at the same time 

    # ensure that the latest ctf is on top by making the dir prefix a lesser number
    ctf_name = str(2147483647 - int(time.time())).rjust(len("2147483647"),'0') + '-' + ctf_name
    DIR_PATH.append(ctf_name)



    challsByCategory = data.get("challsByCategory",{})



    for category , challs in challsByCategory.items():
        read_category_name = category
        category = category.replace(" ","_").lower()

        # if there is one category no need to create a dir for it (maybe i only care about pwn)
        if len(challsByCategory.keys()) > 1:
            # enter the category dir
            DIR_PATH.append(category)
        

        os.makedirs('/'.join(DIR_PATH),exist_ok=True)   
    
        # sort by most solves
        challs.sort(key=lambda x: x["solves"],reverse=True)
        

        with open('/'.join(DIR_PATH + ["all.json"]),"w") as f:
            json.dump(challsByCategory[read_category_name],f)

        # copy the path to manage this chall dir only
        for chall in challs:
            DIR_PATH_COPY = DIR_PATH.copy()
    
            chall_name = str(chall['solves']) + '_' + chall["name"].replace(" ","_").lower()
            DIR_PATH_COPY.append(chall_name)

            # Save card
            os.makedirs('/'.join(DIR_PATH_COPY),exist_ok=True)   
            img_bytes =  base64.b64decode(chall["screenshot"].split(",")[1])
            with open('/'.join(DIR_PATH_COPY + ['card.png']),"wb") as f:
                f.write(img_bytes)
            
            # Save Readme
            readme = create_readme(chall)
            with open('/'.join(DIR_PATH_COPY + ['README.md']),"w") as f:
                f.write(readme)

            if config["sync-download"]: 
                for file in chall['files']:
                    # if the server blocked the download, wait and try again
                    while True:
                        try:
                            downloader = SmartDL(file['url'], '/'.join(DIR_PATH_COPY + [file["name"]]),progress_bar=True)
                            if downloader.get_dl_size() < 15 * 1024 * 1024: # if size is smaller then 15Mb download it
                                downloader.start(blocking=config["sync-download"])
                                break
                        except Exception as e:
                            print("ERROR",e)
                            time.sleep(4)
            else:
                downloader = SmartDL(file['url'], '/'.join(DIR_PATH_COPY + [file["name"]]),progress_bar=True)
                if downloader.get_dl_size() < 15 * 1024 * 1024: # if size is smaller then 15Mb download it
                    downloader.start(blocking=config["sync-download"])


        # exit the category dir
        DIR_PATH.pop()
            
    print("DONE")
            
    return {"success" : True}


@app.route("/")
def index():
    return "<h1>you are online</h1>"







app.run(debug=True)
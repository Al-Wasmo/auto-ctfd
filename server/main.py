from flask import Flask, request, make_response
import json
import base64
import os
import time
from pySmartDL import SmartDL
import glob
from utils import *
import copy

app = Flask(__name__)



def saveCtfInfo(DIR_PATH,config,challsByCategory):
    for category , challs in challsByCategory.items():
        real_category_name = category
        category = category.replace(" ","_").lower()

        DIR_PATH.append(category)
        os.makedirs('/'.join(DIR_PATH),exist_ok=True)   
    
        # sort by most solves
        challs.sort(key=lambda x: x["solves"],reverse=True)
        with open('/'.join(DIR_PATH + ["all.json"]),"w") as f:
            # remove useless info
            cpy = copy.deepcopy(challsByCategory[real_category_name])
            for i in range(len(cpy)):
                del cpy[i]["view"]
                del cpy[i]["screenshot"]
            json.dump(cpy,f)

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
                #TODO: this is not working 
                if downloader.get_dl_size() < 15 * 1024 * 1024: # if size is smaller then 15Mb download it
                    downloader.start(blocking=config["sync-download"])


        # exit the category dir
        DIR_PATH.pop()
       

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
    ctf_name = data.get("ctfName","")
    assert len(ctf_name) != 0
    challsByCategory = data["challsByCategory"]


    dirs =  glob.glob('/'.join(DIR_PATH) + "/*")
    striped_dirs = [file.split("-")[1] for file in dirs]
    
    # possible race hehe, when making two requests at the same time 
    # ensure that the latest ctf is on top by making the dir prefix a lesser number
    prefixed_ctf_name = str(2147483647 - int(time.time())).rjust(len("2147483647"),'0') + '-' + ctf_name

    if ctf_name in striped_dirs:
        dir_path = dirs[striped_dirs.index(ctf_name)]
        DIR_PATH.append(prefixed_ctf_name)
        os.rename(dir_path,'/'.join(DIR_PATH))
    else:
        DIR_PATH.append(prefixed_ctf_name)
        os.makedirs('/'.join(DIR_PATH))

    
    saveCtfInfo(DIR_PATH,config,challsByCategory)

    
    print("DONE")
            
    return {"success" : True}


@app.route("/")
def index():
    return "<h1>you are online</h1>"







app.run(debug=True)
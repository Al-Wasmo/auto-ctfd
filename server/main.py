from flask import Flask, request, make_response
import json
import base64
import random
import os

def rand_suffix(n=4):
    return ''.join([chr(random.randint(ord('a'),ord('z'))) for _ in range(n)])

def create_readme(chall):
    return f"""
# {chall["name"]}
{chall.get("desc","(Chall didnt provide any description)")}

## Stats

| Info     | Stats |
| ---      | ---       |
| solves | {chall["solves"]}         |
| files     | {chall["files"]}        |
| hints     | {chall["hints"]}        |
| connection_info     | {chall["connection_info"]}        |


## Card
![card](card.png)
"""

app = Flask(__name__)

@app.route("/save",methods=["POST"])
def save():
    data = json.loads(request.data)
    ctf_name = data.get("ctfName","ctf" + rand_suffix(4))
    if not os.path.exists(ctf_name):
        os.makedirs(ctf_name)   
    else:
        ctf_name = ctf_name + '-' + rand_suffix(4)
        os.makedirs(ctf_name)   


    challsByCategory = data.get("challsByCategory",{})
    for category , challs in challsByCategory.items():
        category = category.replace(" ","_").lower()


        os.makedirs('/'.join([ctf_name,category]),exist_ok=True)   
        for chall in challs:
            
            chall_name = chall["name"].replace(" ","_").lower()
            
            # Save card
            os.makedirs('/'.join([ctf_name,category,chall_name]),exist_ok=True)   
            img_bytes =  base64.b64decode(chall["screenshot"].split(",")[1])
            with open('/'.join([ctf_name,category,chall_name,'card.png']),"wb") as f:
                f.write(img_bytes)
            
            # Save Readme
            readme = create_readme(chall)
            with open('/'.join([ctf_name,category,chall_name,'README.md']),"w") as f:
                f.write(readme)

    return {"success" : True}


@app.route("/")
def index():
    return "<h1>you are online</h1>"


app.run(debug=True)
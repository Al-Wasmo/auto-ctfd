from flask import Flask, request
import json
import base64

app = Flask(__name__)

@app.route("/save",methods=["POST"])
def hello_world():
    challInfoList = json.loads(request.data)
    for challInfo in challInfoList:
        imgBytes =  base64.b64decode(challInfo["screenshot"].split(",")[1])
        challName = challInfo["name"].replace(" ","_").lower()
        with open("challs/" + challName + ".png","wb") as f:
            f.write(imgBytes)



app.run(debug=True)
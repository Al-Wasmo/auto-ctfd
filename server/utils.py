def readme_files(chall):
    if len(chall.get("files",[])) == 0:
        return "- `files`: None\n"
    # parse files, shape is {name , url}
    out = "- `files`: \n"
    for file in chall["files"]:
        out += f"\t- [{file['name']}]({file['url']})\n"
    return out

def readme_hints(chall):
    if len(chall.get("hints",[])) == 0:
        return "- `hints`: None\n"       
    out = "- `hints`: \n"
    # parse hint, shape is {id, cost , content} 
    for hint in chall["hints"]:
        out += f"\t- {hint['content']}\n"
    return out

def create_readme(chall):
    name = chall.get("name", "Unnamed Challenge")
    desc = chall.get("desc", "(Chall didn't provide any description)")
    solves = chall.get("solves", 0)
    max_attempts = chall.get("max_attempts", "Unlimited")
    connection_info = chall.get("connection_info", "No connection info provided")

    readme_content = f"# {name}\n"
    readme_content += "Card\n"
    readme_content += "---\n"
    readme_content += '<center><img src="card.png" alt="card"/></center>\n\n'
    readme_content += "Description \n"
    readme_content += "---\n"
    readme_content += f"{desc}\n\n"
    readme_content += "Stats\n"
    readme_content += "---\n"
    readme_content += f"- `solves`: {solves}\n"
    readme_content += f"- `max_attempts`: {max_attempts}\n"
    readme_content += f"- `connection_info`: {connection_info}\n"
    readme_content += readme_files(chall)
    readme_content += readme_hints(chall)

    return readme_content
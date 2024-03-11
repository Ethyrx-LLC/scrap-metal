import requests
from bs4 import BeautifulSoup
import json
import time

post_id = "55122706"

url = f"https://api.scraperapi.com/?api_key=0c3668c271e0cedf9b2a18de9114b0dc&url=https%3A%2F%2Fwww.expatriates.com%2Fcls%2F{post_id}.html&follow_redirect=false&device_type=desktop&country_code=eu&render=true"
response = requests.get(url)
html = response.text
soup = BeautifulSoup(html, "html.parser")

# Extracting the epoch timestamp
timestamp_span = soup.find("span", id="timestamp")
timestamp_epoch = int(timestamp_span['epoch']) if timestamp_span and timestamp_span.has_attr('epoch') else None

# Email
email_href = soup.find("a", href=lambda x: x and x.startswith("mailto:"))
print(email_href)

# Converting the epoch to a human-readable format if needed (optional)
posted_date = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(timestamp_epoch)) if timestamp_epoch else None

# Extracting the region
region_li = soup.find("li", text=lambda x: x and "Region:" in x)
region = region_li.strong.next_sibling.strip() if region_li else None

# Assuming 'body' is contained within a 'div' with class 'post-body'
body_div = soup.find("div", class_="post-body")
body = body_div.get_text(strip=True) if body_div else "No body text available"

# Extract the title and body from the HTML
title = soup.find("div", class_="page-title").h1.text.strip()

# Extract the href values from the post body
hrefs = soup.find_all(lambda tag: tag.name == "a" and tag.has_attr('href'))

# Split the body text by <br/> tags and create paragraphs for each line
paragraphs = []
body_text = body_div.get_text("\n").split("\n")

# Find the <div> element with class "post-info"
post_info_div = soup.find("div", class_="post-info")

# Find the <strong> element containing "From:" within the post_info_div
from_strong = post_info_div.find("strong", text=lambda x: x and "From:" in x)

# Extracting the email if the <strong> element containing "From:" is found
if from_strong:
    email_href = from_strong.find_next_sibling("a", href=lambda x: x and x.startswith("mailto:"))
    email = email_href['href'][7:] if email_href else None

    if email:
        paragraph = {
            "type": "paragraph",
            "content": [{"type": "text", "text": email}]
        }
        paragraphs.append(paragraph)
else:
    print("No 'From:' information found.")


for para_text in body_text:
    if para_text.strip():
        paragraph = {
            "type": "paragraph",
            "content": [{"type": "text", "text": para_text.strip()}]
        }
        paragraphs.append(paragraph)


post_url = "http://localhost:3000/listings/create"


# ProseMirror content as a JSON object with separated paragraphs
prosemirror_content = {
    "type": "doc",
    "content": paragraphs
}

location = {
    "country": "BH",
    "country_full": "Bahrain",
    "region": "", 
    "region_full": None,
    "city": region if region else "",
    "timezone": "Asia/Bahrain"
}

# Define the data you want to send
post_data = {
    "title": title,
    "content": json.dumps(prosemirror_content, ensure_ascii=False),
    "category": "65e63eb09c7c7b61b1db90ba",
    "location": {
        "country": "BH",
        "country_full": "Bahrain",
        "region": "",
        "region_full": None,
        "city": "",
        "timezone": "Asia/Bahrain"
        },
    "createdAt": posted_date
}

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36",
}

my_cookies = {
    'connect.sid': 's%3AQ9vRDUl6faPKvhnkW77cHeqMgV0qU9_s.Zo2%2BsjupY8tXkNmyAFVG5sGSDnRSgz2v5%2BAUKaaFza4'
}

# POST request
response = requests.post(post_url, json=post_data, cookies=my_cookies, headers=headers)

if response.ok:
    print("Data posted successfully!")
else:
    print(f"Failed to post data. Status code: {response.status_code}")
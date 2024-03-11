const axios = require("axios");
const cheerio = require("cheerio");
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");

const app = express();
const port = 3000;

// Set up Express middleware for sessions and cookies
app.use(cookieParser());
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

const post_id = "55122706";
const url = `https://api.scraperapi.com/?api_key=0c3668c271e0cedf9b2a18de9114b0dc&url=https%3A%2F%2Fwww.expatriates.com%2Fcls%2F${post_id}.html&follow_redirect=false&device_type=desktop&country_code=eu&render=true`;

const fetchData = async (req, res) => {
  try {
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    // Extracting the epoch timestamp
    const timestamp_span = $("span#timestamp");
    const timestamp_epoch = parseInt(timestamp_span.attr("epoch")) || null;

    // Extracting email
    const email_href = $("a[href^='mailto:']");
    const email = email_href.attr("href") ? email_href.attr("href").substring(7) : null;

    // Converting epoch to human-readable format
    const posted_date = timestamp_epoch
      ? new Date(timestamp_epoch * 1000).toLocaleString()
      : null;

    // Extracting region
    const region_li = $("li:contains('Region:')");
    const region = region_li.find("strong").next().text().trim() || null;

    // Assuming 'body' is contained within a 'div' with class 'post-body'
    const body_div = $("div.post-body");
    const body = body_div.text().trim() || "No body text available";

    // Extracting the title
    const title = $("div.page-title h1").text().trim();

    // Extracting href values from the post body
    const hrefs = $("a[href]").map((i, el) => $(el).attr("href")).get();

    // Splitting body text by <br/> tags and creating paragraphs for each line
    const body_text = body_div.text().split(/\n/).map((line) => line.trim()).filter(Boolean);
    const paragraphs = body_text.map((para_text) => ({
      type: "paragraph",
      content: [{ type: "text", text: para_text }],
    }));

    // Find the <div> element with class "post-info"
    const post_info_div = $("div.post-info");

    // Find the <strong> element containing "From:" within the post_info_div
    const from_strong = post_info_div.find("strong:contains('From:')");

    // Extracting the email if the <strong> element containing "From:" is found
    if (from_strong.length) {
      const email_href = from_strong.next("a[href^='mailto:']");
      const email_from = email_href.attr("href") ? email_href.attr("href").substring(7) : null;

      if (email_from) {
        const paragraph = {
          type: "paragraph",
          content: [{ type: "text", text: email_from }],
        };
        paragraphs.push(paragraph);
      }
    } else {
      console.log("No 'From:' information found.");
    }

    // ProseMirror content as a JSON object with separated paragraphs
    const prosemirror_content = {
      type: "doc",
      content: paragraphs,
    };

    // Define the data you want to send
    const post_data = {
      title,
      content: JSON.stringify(prosemirror_content),
      category: "65e63eb09c7c7b61b1db90ba",
      location: {
        country: "BH",
        country_full: "Bahrain",
        region: "",
        region_full: null,
        city: region || "",
        timezone: "Asia/Bahrain",
      },
      createdAt: posted_date,
    };

    // Headers and cookies
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36",
    };

    const my_cookies = {
      "connect.sid": "s%3AQ9vRDUl6faPKvhnkW77cHeqMgV0qU9_s.Zo2%2BsjupY8tXkNmyAFVG5sGSDnRSgz2v5%2BAUKaaFza4",
    };

    // POST request
    const response = await axios.post(post_url, post_data, {
      headers,
      cookies: my_cookies,
    });

    if (response.status === 200) {
      console.log("Data posted successfully!");
      res.json({ success: true, message: "Data posted successfully!" });
    } else {
      console.error(`Failed to post data. Status code: ${response.status}`);
      res.status(response.status).json({
       

const express = require("express");
const app = express();
const port = 3001;
const axios = require("axios");
const cheerio = require("cheerio");
const jobsPage = `https://api.scraperapi.com/?api_key=0c3668c271e0cedf9b2a18de9114b0dc&url=https://www.expatriates.com/classifieds/bahrain/jobs&follow_redirect=false&device_type=desktop&country_code=eu&render=true`;
const url = `https://api.scraperapi.com/?api_key=0c3668c271e0cedf9b2a18de9114b0dc&url=https%3A%2F%2Fwww.expatriates.com%2Fcls%2F${post_id}.html&follow_redirect=false&device_type=desktop&country_code=eu&render=true`;

function log(value) {
    console.log(value);
}

const jobs = [];

const fetchJobIds = async () => {
    try {
        let res = await axios.get(jobsPage);
        let $ = await cheerio.load(res.data);
        const ids = $("li[onclick]")
            .map((i, elem) => {
                const onclickValue = $(elem).attr("onclick");
                const match = onclickValue.match(/\/cls\/(\d+)\.html/);
                return match ? match[1] : null;
            })
            .get();

        jobs.push(...ids.filter(Boolean));
    } catch (e) {
        log(e);
    }
};

fetchJobIds();

const fetchJobDetails = async () => {
    try {
        for (const jobID of jobs) {
            let res = await axios.get(
                `https://api.scraperapi.com/?api_key=0c3668c271e0cedf9b2a18de9114b0dc&url=https%3A%2F%2Fwww.expatriates.com%2Fcls%2F${jobID}.html&follow_redirect=false&device_type=desktop&country_code=eu&render=true`
            );
            let $ = await cheerio.load(res.data);
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
            const hrefs = $("a[href]")
                .map((i, el) => $(el).attr("href"))
                .get();

            // Splitting body text by <br/> tags and creating paragraphs for each line
            const body_text = body_div
                .text()
                .split(/\n/)
                .map((line) => line.trim())
                .filter(Boolean);
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
                const email_from = email_href.attr("href")
                    ? email_href.attr("href").substring(7)
                    : null;

                if (email_from) {
                    const paragraph = {
                        type: "paragraph",
                        content: [{ type: "text", text: email_from }],
                    };
                    paragraphs.push(paragraph);
                } else {
                    console.log("No 'From:' information found.");
                }
            }
        }
    } catch {}
};
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

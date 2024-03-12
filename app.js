const express = require("express");
const app = express();
const port = 3001;
const axios = require("axios");
const cheerio = require("cheerio");
const jobsPage = `https://api.scraperapi.com/?api_key=0c3668c271e0cedf9b2a18de9114b0dc&url=https://www.expatriates.com/classifieds/bahrain/jobs&follow_redirect=false&device_type=desktop&country_code=eu&render=true`;

function log(value) {
    console.log(value);
}

let jobs = [];

const fetchJobIds = async () => {
    jobs = [];
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
        log("============== PUSHING JOBS TO ARRAY =============");
        jobs.push(...ids.filter(Boolean));
        log("============== JOBS IDS IN ARRAY =============");
        log(jobs);
        fetchJobDetails();
    } catch (e) {
        log("Error in fetchJobIds:", e);
    }
};

fetchJobIds();

const fetchJobDetails = async () => {
    log(`============== FETCHING DETAILS FROM EACH ID =============`);
    try {
        log(`============== COLLECTING DETAILS FROM EACH JOB =============`);
        for (const jobID of jobs) {
            try {
                log(`============== GETTING INFO FOR JOB ID: ${jobID} =============`);
                let res = await axios.get(
                    `https://api.scraperapi.com/?api_key=0c3668c271e0cedf9b2a18de9114b0dc&url=https%3A%2F%2Fwww.expatriates.com%2Fcls%2F${jobID}.html&follow_redirect=false&device_type=desktop&country_code=eu&render=true`
                );
                let $ = await cheerio.load(res.data);

                // Extracting the epoch timestamp
                const timestamp_span = $("span#timestamp");
                const timestampEpoch = timestamp_span.attr("epoch");
                const timestampText = timestamp_span.text().trim();
                const timestamp_epoch = parseInt(timestampEpoch) || null;

                // Extracting email
                const email_href = $("a[href^='mailto:']");
                const email = email_href.text().trim();

                // Converting epoch to human-readable format
                const posted_date = timestamp_epoch
                    ? new Date(timestamp_epoch * 1000).toLocaleString()
                    : null;

                // Extracting region
                const region_li = $("li:contains('Region:')");
                const region = region_li.find("strong").next().text().trim() || null;

                // Assuming 'body' is contained within a 'div' with class 'post-body'
                const body_div = $(".post-body");
                const body = body_div.text().trim() || "No body text available";

                // Extracting the title
                const title = $(".page-title > h1").text().trim();

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
                log("============== POST INFO DIV:", post_info_div.text());

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
                        log("============== NO 'FROM:' INFORMATION FOUND.");
                    }
                }

                log(`Details for job ID ${jobID}:`, {
                    title: title,
                    date: posted_date,
                    region: region,
                    paragraphs: paragraphs,
                    body: body,
                    email: email,
                    // Add other details as needed
                });
                log(`============== DONE =============`);
            } catch (error) {
                log("Error in fetchJobDetails for ID", jobID, ":", error);
            }
        }
        log("All details fetched. Done");
    } catch (error) {
        log("Error in fetchJobDetails:", error);
    }
};

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

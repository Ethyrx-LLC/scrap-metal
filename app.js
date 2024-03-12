const express = require("express");
const app = express();
const port = 3001;
const mongoose = require("mongoose");
const Listing = require("./listing");
const axios = require("axios");
const cheerio = require("cheerio");
const jobsPage = `https://api.scraperapi.com/?api_key=643fa083c1ef8803b212b0942a0869bc&url=https://www.expatriates.com/classifieds/bahrain/jobs&follow_redirect=false&device_type=desktop&country_code=eu`;

main().catch((err) => console.log(err));

async function main() {
    await mongoose.connect(`mongodb://kitkat:U29fxgXemM3qDTP57srH6v@192.223.31.14:27017/`);
}

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
        log("Error in fetchJobIds: Please restart the application", e);
    }
};

fetchJobIds();

const fetchJobDetails = async () => {
    try {
        for (let jobID of jobs) {
            let res =
                await axios.get(`https://api.scraperapi.com/?api_key=643fa083c1ef8803b212b0942a0869bc&url=https%3A%2F%2Fwww.expatriates.com%2Fcls%2F${jobID}.html&follow_redirect=f
            alse&device_type=desktop&country_code=eu&render=true`);
            let $ = await cheerio.load(res.data);
            const postTitle = $(".page-title > h1").each((i, e) => {
                $(e).text().trim();
            });
            const timestamp = $("span#timestamp").attr("epoch");

            const date = new Date(timestamp * 1000).toLocaleString();
            console.log(date);

            const postEmail = $("a[href^='mailto:']").each((i, e) => {
                $(e).text().trim();
            });
            const postPhone = $("a[href^='tel:']").each((i, e) => {
                $(e).text().trim();
            });
            const postBody = $(".post-body")
                .html()
                .split("<br>")
                .map((line) => line.trim())
                .filter(Boolean)
                .filter((line) => !line.includes('<div class="posting-images top-margin">'))
                .map((line) => ({
                    type: "paragraph",
                    content: [{ type: "text", text: line }],
                }));

            log("================== JOB DETAILS ====================");
            console.dir({
                title: postTitle.text().trim(),
                date: date,
                email: postEmail.text().trim(),
                phone: postPhone.text().trim(),
                text: postBody.map((paragraph) => paragraph.content[0].text).join("\n"),
            });
            const loc = {
                country: "BH",
                country_full: "Bahrain",
                region: "",
                region_full: null,
                city: "",
                timezone: "Asia/Bahrain",
            };
            async function listingCreate() {
                const listing = new Listing({
                    title: postTitle.text().trim(),
                    content: postBody.map((paragraph) => paragraph.content[0].text).join("\n"),
                    category: "65e63eb09c7c7b61b1db90ba",
                    location: loc,
                    user: `65e9d2bd59706ced5903ae44`, // Include the user field
                    likes: 0, // Initial value for likes
                    views: 0, // Initial value for views
                    createdAt: date,
                });

                await listing.save();
                console.log(`Added listing: ${postTitle.text().trim()}`);
            }
            listingCreate();
        }
    } catch (e) {
        console.log(e);
    }
};

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

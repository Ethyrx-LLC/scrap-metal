const express = require("express");
const app = express();
const port = 3001;
const axios = require("axios");
const cheerio = require("cheerio");
const post_id = "53582174";
const jobsPage = `https://api.scraperapi.com/?api_key=0c3668c271e0cedf9b2a18de9114b0dc&url=https://www.expatriates.com/classifieds/bahrain/jobs&follow_redirect=false&device_type=desktop&country_code=eu&render=true`;
const url = `https://api.scraperapi.com/?api_key=0c3668c271e0cedf9b2a18de9114b0dc&url=https%3A%2F%2Fwww.expatriates.com%2Fcls%2F${post_id}.html&follow_redirect=false&device_type=desktop&country_code=eu&render=true`;

function log(value) {
    console.log(value);
}

const jobs = [];

const fetchData = async () => {
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

        jobs.push(ids);
    } catch (e) {
        log(e);
    }
};
fetchData();
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

const express = require("express");
const app = express();
const port = 3004;
const mongoose = require("mongoose");
const Listing = require("./listing");
const Category = require("./category");
const User = require("./user");
const { PlaywrightCrawler } = require("crawlee");

const processedIdSchema = new mongoose.Schema({
    jobId: {
        type: String,
        required: true,
        unique: true,
    },
});
const ProcessedId = mongoose.model(
    "ProcessedId",
    processedIdSchema,
    "_processedIds"
);

main().catch((err) => console.log(err));

function log(value) {
    console.log(value);
}

function logPremiumPosts(page) {
    return page.$$eval("li[premium='True']", (elems) =>
        elems.map((elem) => {
            const onclickValue = elem.getAttribute("onclick");
            const match = onclickValue.match(/\/cls\/(\d+)\.html/);
            return match ? match[1] : null;
        })
    );
}

async function logAllJobIds(page, premiumPosts) {
    const ids = await page.$$eval("li[onclick]", (elems) =>
        elems.map((elem) => {
            const onclickValue = elem.getAttribute("onclick");
            const match = onclickValue.match(/\/cls\/(\d+)\.html/);
            return match ? match[1] : null;
        })
    );

    return ids.filter((id) => !premiumPosts.includes(id) && id);
}

async function main() {
    await mongoose.connect(
        "mongodb://kitkat:U29fxgXemM3qDTP57srH6v@192.223.31.14:27017/"
    );
    //fetchJobIds();
}

let jobs = [];

let { added = 0, skipped = 0 } = {};

const crawler = new PlaywrightCrawler({
    async requestHandler({ page, request }) {
        const premiumPosts = await logPremiumPosts(page);
        const jobIds = await logAllJobIds(page, premiumPosts);
        jobs.push(...jobIds);
        await fetchJobDetails(page, jobIds);
    },
});

const listingCreate = async (postTitle, prosemirror_content, loc, date) => {
    const users = await User.find({
        createdAt: {
            $gte: new Date("2024-04-09T00:00:00Z"),
            $lt: new Date("2024-04-10T00:00:00Z"),
        },
    });

    const randomIndex = Math.floor(Math.random() * users.length);
    const randomUser = users[randomIndex];
    function generateFakeViews() {
        return Math.floor(Math.random() * 281) + 20;
    }
    const views = generateFakeViews();

    function generateFakeLikes() {
        return Math.floor(Math.random() * 30) + 1;
    }
    const likes = generateFakeLikes();
    const Jobcategory = await Category.findById("65e63eb09c7c7b61b1db90ba");
    const listing = new Listing({
        title: postTitle,
        content: JSON.stringify(prosemirror_content),
        category: Jobcategory,
        location: loc,
        user: randomUser._id,
        likes: likes,
        views: views,
        createdAt: date,
    });
    await listing.save();
    Jobcategory.listings.push(listing);
    await Jobcategory.save();
    log(`Posted \x1b[38;5;155m${listing.title}\x1b[0m successfully!`);
};

const checkAndInsertJobId = async (jobId) => {
    const existingId = await ProcessedId.findOne({ jobId });
    if (!existingId) {
        await new ProcessedId({ jobId }).save();
        return true;
    }
    return false;
};

const fetchJobDetails = async (page) => {
    try {
        //log("Jobs length: ", jobs.length);

        for (let jobID of jobs) {
            const shouldPost = await checkAndInsertJobId(jobID);

            if (!shouldPost) {
                // log(`Skipping job ID: ${jobID} as it has already been processed.`);
                skipped++;
                continue;
            }

            await page.goto(`https://www.expatriates.com/cls/${jobID}.html`);
            const postTitle = await page.$eval(".page-title > h1", (elem) =>
                elem.textContent.trim()
            );

            //log(`Posting ${postTitle} (${jobID})...`);

            const timestamp = await page.$eval("span#timestamp", (elem) =>
                elem.getAttribute("epoch")
            );
            const date = new Date(timestamp * 1000).toLocaleString();

            let postEmail, postPhone;
            try {
                postEmail = await page.$eval("a[href^='mailto:']", (elem) =>
                    elem.textContent.trim()
                );
            } catch (error) {
                //log(`No email present for ${postTitle}`);
                postEmail = "";
            }

            try {
                postPhone = await page.$eval("a[href^='tel:']", (elem) =>
                    elem.textContent.trim()
                );
            } catch (error) {
                //log(`No phone number present for ${postTitle}`);
                postPhone = "";
            }

            const paragraphs = await page.$$eval(".post-body", (elems) =>
                elems.flatMap((elem) => {
                    const contents = elem.innerText.trim().split("\n");
                    return contents.filter((content) => content.trim() !== "");
                })
            );

            const nonEmptyParagraphs = paragraphs.filter(
                (paragraph) => paragraph.trim() !== ""
            );

            const prosemirror_content = {
                type: "doc",
                content: nonEmptyParagraphs.map((paragraph) => ({
                    type: "paragraph",
                    content: [{ type: "text", text: paragraph }],
                })),
            };

            const loc = {
                country: "BH",
                country_full: "Bahrain",
                region: "",
                region_full: null,
                city: "",
                timezone: "Asia/Bahrain",
            };

            // console.dir({
            //     title: postTitle,
            //     date: date,
            //     email: postEmail,
            //     phone: postPhone,
            //     text: JSON.stringify(prosemirror_content),
            // });

            await listingCreate(postTitle, prosemirror_content, loc, date);
            added++;
        }
    } catch (e) {
        console.error("Error in fetchJobDetails:", e);
    } finally {
        const response = await fetch(
            "https://discord.com/api/webhooks/1229069783048130751/HEjx6hKofn0OHoIfnvTDHDWoBgXaD2uJFl2R3-p4swGOnk9WDUH38NWmsrRI_HG86Ghn",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    content: `Successfully posted ${added} listing${
                        added === 1 ? "" : "s"
                    } and skipped ${skipped} listing${
                        skipped === 1 ? "" : "s"
                    }`,
                }),
            }
        );
        if (response.ok) {
            log("Posted webhook successfully!");
        }

        //log("=============== OPERATION COMPLETE ==============");
        log(
            `Operation finished! Successfully posted \x1b[38;5;205m${added}\x1b[0m listings.`
        );
    }
};

app.listen(port, () => {
    console.log(`ACTIVATING EXPATRIATES MACHINE ON PORT ${port}`);
});

crawler.run(["https://www.expatriates.com/classifieds/bahrain/jobs"]);

const express = require("express");
const app = express();
const port = 3005;
const mongoose = require("mongoose");
const Listing = require("./listing");
const Category = require("./category");
const User = require("./user");
const { PlaywrightCrawler } = require("crawlee");

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
    await mongoose.connect("mongodb://kitkat:U29fxgXemM3qDTP57srH6v@192.223.31.14:27017/");
}

let jobs = [];
let listingsAdded = 0;

const crawler = new PlaywrightCrawler({
    async requestHandler({ page, request }) {
        //console.log('Processing:', request.url);
        const premiumPosts = await logPremiumPosts(page);
        //console.log('============== PREMIUM JOBS IDS IN ARRAY =============');
        //console.log(premiumPosts);

        const jobIds = await logAllJobIds(page, premiumPosts);

        jobs.push(...jobIds);
        //console.log('============== NON-PREMIUM JOBS IDS IN ARRAY =============');
        //console.log(jobIds);

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

    const Jobcategory = await Category.findById("65e63eb09c7c7b61b1db90ba");
    const listing = new Listing({
        title: postTitle,
        content: JSON.stringify(prosemirror_content),
        category: Jobcategory,
        location: loc,
        user: randomUser._id, // Include the user field
        likes: 0, // Initial value for likes
        views: 0, // Initial value for views
        createdAt: date,
    });
    await listing.save();
    Jobcategory.listings.push(listing);
    await Jobcategory.save();
    //console.log(`Added listing: ${postTitle}`);
};

const fetchJobDetails = async (page) => {
    try {
<<<<<<< HEAD
        for (let jobID of jobs) {
            const shouldPost = await checkAndInsertJobId(jobID);

            if (!shouldPost) {
                log(`Skipping job ID: ${jobID} as it has already been processed.`);
                listingsAdded--;
                continue;
            }
=======
        log("Jobs array length:", jobs.length);

        for (let jobID of jobs) {
            log("Processing job ID:", jobID);
>>>>>>> parent of 9fa305e (Fix errors, save posted job ids in database)

            await page.goto(`https://www.expatriates.com/cls/${jobID}.html`);
            const postTitle = await page.$eval(".page-title > h1", (elem) =>
                elem.textContent.trim()
            );
<<<<<<< HEAD

=======
>>>>>>> parent of 9fa305e (Fix errors, save posted job ids in database)
            const timestamp = await page.$eval("span#timestamp", (elem) =>
                elem.getAttribute("epoch")
            );
            const date = new Date(timestamp * 1000).toLocaleString();

            let postEmail, postPhone;
            try {
                postEmail = await page.$eval("a[href^='mailto:']", (elem) =>
                    elem.textContent.trim()
                );
                if (!startingEmail) startingEmail = postEmail;
                if (postEmail) {
                    await appendDataToFile("emails.txt", postEmail);
                    newEmailCount++;
                }
            } catch (error) {
<<<<<<< HEAD
=======
                console.error("Error finding email:", error);
>>>>>>> parent of 9fa305e (Fix errors, save posted job ids in database)
                postEmail = "";
            }

            try {
                postPhone = await page.$eval("a[href^='tel:']", (elem) => elem.textContent.trim());
                if (!startingPhone) startingPhone = postPhone;
                if (postPhone) {
                    await appendDataToFile("phones.txt", postPhone);
                    newPhoneCount++;
                }
            } catch (error) {
<<<<<<< HEAD
=======
                console.error("Error finding phone:", error);
>>>>>>> parent of 9fa305e (Fix errors, save posted job ids in database)
                postPhone = "";
            }

            const paragraphs = await page.$$eval(".post-body", (elems) =>
                elems.flatMap((elem) => {
                    const contents = elem.innerText.trim().split("\n");
                    return contents.filter((content) => content.trim() !== "");
                })
            );

            const nonEmptyParagraphs = paragraphs.filter((paragraph) => paragraph.trim() !== "");

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

<<<<<<< HEAD
=======
            console.dir({
                title: postTitle,
                date: date,
                email: postEmail,
                phone: postPhone,
                text: JSON.stringify(prosemirror_content),
            });

>>>>>>> parent of 9fa305e (Fix errors, save posted job ids in database)
            await listingCreate(postTitle, prosemirror_content, loc, date);
            listingsAdded++;
        }
    } catch (e) {
        console.error("Error in fetchJobDetails:", e);
    } finally {
<<<<<<< HEAD
        //log("=============== OPERATION COMPLETE ==============");
        log(
            `Operation finished! Successfully posted \x1b[38;5;205m${listingsAdded}\x1b[0m listings.`
        );
=======
        log("=============== OPERATION COMPLETE ==============");
        log(`Added ${listingsAdded} listings`);
>>>>>>> parent of 9fa305e (Fix errors, save posted job ids in database)
    }
};

app.listen(port, () => {
    console.log(`ACTIVATING EXPATRIATES MACHINE ON PORT ${port}`);
});

crawler.run(["https://www.expatriates.com/classifieds/bahrain/jobs"]);

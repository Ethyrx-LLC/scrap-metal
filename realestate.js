const express = require("express");
const app = express();
const port = 3005;
const fs = require("fs").promises;
const path = require("path");
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
const ProcessedId = mongoose.model("ProcessedId", processedIdSchema, "_processedIds");

main().catch((err) => console.log(err));

function log(value) {
    console.log(value);
}

async function main() {
    await mongoose.connect("mongodb://kitkat:U29fxgXemM3qDTP57srH6v@192.223.31.14:27017/");
}

let jobs = [];
let { added = 0, skipped = 0 } = {};

const crawler = new PlaywrightCrawler({
    async requestHandler({ page, request }) {
        const jobIds = await logAllJobIds(page);
        jobs.push(...jobIds);
        await fetchJobDetails(page, jobIds);
    },
});

async function logAllJobIds(page) {
    const ids = await page.$$eval("li[onclick]", (elems) =>
        elems.map((elem) => {
            const onclickValue = elem.getAttribute("onclick");
            const match = onclickValue.match(/\/cls\/(\d+)\.html/);
            return match ? match[1] : null;
        })
    );

    return ids.filter((id) => id);
}

async function fetchJobDetails(page, jobIds) {
    try {
        for (let jobID of jobIds) {
            const shouldPost = await checkAndInsertJobId(jobID);

            if (!shouldPost) {
                skipped++;
                continue;
            }

            await page.goto(`https://www.expatriates.com/cls/${jobID}.html`);
            const postTitle = await page.$eval(".page-title > h1", (elem) =>
                elem.textContent.trim()
            );
            const timestamp = await page.$eval("span#timestamp", (elem) =>
                elem.getAttribute("epoch")
            );
            const date = new Date(timestamp * 1000).toLocaleString();
            const loc = {
                country: "BH",
                country_full: "Bahrain",
                region: "",
                region_full: null,
                city: "",
                timezone: "Asia/Bahrain",
            };

            const images = await page.$$eval(".posting-images img", (imgs) =>
                imgs.map((img) => img.getAttribute("src"))
            );

            const imageURLs = [];
            const imagePaths = [];
            for (let imageUrl of images) {
                try {
                    if (imageUrl.startsWith("/img")) {
                        // If the image URL starts with "/img", prepend the base URL
                        imageUrl = `https://www.expatriates.com${imageUrl}`;
                    }
                    // Download image
                    const imagePath = path.join(
                        __dirname,
                        "images",
                        `${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`
                    );
                    const response = await page.goto(imageUrl);
                    await fs.writeFile(imagePath, await response.body());

                    // Store image URL and local file path
                    imageURLs.push(imageUrl);
                    imagePaths.push(imagePath);
                } catch (error) {
                    console.error(`Error downloading image ${imageUrl}:`, error);
                }
            }

            // Post listing with image paths
            await listingCreate(postTitle, {}, loc, date, imageURLs, imagePaths);

            // Delete downloaded images
            for (const imagePath of imagePaths) {
                try {
                    await fs.unlink(imagePath);
                    log(`Deleted image ${imagePath} successfully.`);
                } catch (error) {
                    console.error(`Error deleting image ${imagePath}:`, error);
                }
            }

            added++;
        }
    } catch (e) {
        console.error("Error in fetchJobDetails:", e);
    } finally {
        log(`Operation finished! Successfully posted ${added} listings.`);
    }
}

async function listingCreate(postTitle, prosemirror_content, loc, date, imageURLs, imagePaths) {
    try {
        // Find user and category (You may need to adjust this based on your schema)
        const users = await User.find({}); // Adjust as needed
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const Jobcategory = await Category.findById("65e63eb09c7c7b61b1db90ba"); // Adjust category ID as needed

        // Create listing
        const listing = new Listing({
            title: postTitle,
            content: JSON.stringify(prosemirror_content),
            category: Jobcategory._id,
            user: randomUser._id,
            likes: 0,
            views: 0,
            createdAt: date,
            location: loc,
            photos: imageURLs, // Store image URLs
        });

        await listing.save();
        Jobcategory.listings.push(listing);
        await Jobcategory.save();
        log(`Posted ${listing.title} successfully!`);
    } catch (error) {
        console.error("Error creating listing:", error);
    }
}

async function checkAndInsertJobId(jobId) {
    const existingId = await ProcessedId.findOne({ jobId });
    if (!existingId) {
        await new ProcessedId({ jobId }).save();
        return true;
    }
    return false;
}

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

crawler.run(["https://www.expatriates.com/classifieds/bahrain/apartments-for-rent/"]);

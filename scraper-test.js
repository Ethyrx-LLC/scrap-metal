const express = require("express");
const app = express();
const port = 3002;
const path = require("path");
const { PlaywrightCrawler } = require("crawlee");
const fs = require("fs").promises;
const fss = require("fs");
const axios = require("axios");
const FormData = require("form-data");

async function logAllJobIds(page) {
    const ids = await page.$$eval("li[onclick]", (elems) => {
        const jobIds = elems.map((elem) => {
            const onclickValue = elem.getAttribute("onclick");
            const match = onclickValue.match(/\/cls\/(\d+)\.html/);
            return match ? match[1] : null;
        });
        console.log("Job IDs found:", jobIds);
        return jobIds;
    });

    return ids;
}

let jobs = [];

const crawler = new PlaywrightCrawler({
    async requestHandler({ page, request }) {
        jobs = [];
        const jobIds = await logAllJobIds(page);
        jobs.push(...jobIds);
        console.log(jobIds);
        await fetchJobDetails(page, jobIds);
    },
});

const fetchJobDetails = async (page, jobIds) => {
    try {
        for (let i = 0; i < jobIds.length; i++) {
            const jobId = jobIds[i];
            console.log("Processing job ID:", jobId);
            await page.goto(`https://www.expatriates.com/cls/${jobId}.html`);
            console.log("Page loaded successfully for job ID:", jobId);

            const postTitle = await page.$eval(".page-title > h1", (elem) =>
                elem.textContent.trim()
            );
            console.log("Post title:", postTitle);

            const timestamp = await page.$eval("span#timestamp", (elem) =>
                elem.getAttribute("epoch")
            );
            console.log("Timestamp:", timestamp);

            const date = new Date(timestamp * 1000).toLocaleString();
            console.log("Date:", date);

            const paragraphs = await page.$$eval(".post-body", (elems) =>
                elems.flatMap((elem) => {
                    const contents = elem.innerText.trim().split("\n");
                    return contents.filter((content) => content.trim() !== "");
                })
            );
            console.log("Paragraphs:", paragraphs);

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
            console.log("Prosemirror content:", prosemirror_content);

            const loc = {
                country: "BH",
                country_full: "Bahrain",
                region: "",
                region_full: null,
                city: "",
                timezone: "Asia/Bahrain",
            };
            console.log("Location:", loc.country_full);

            // Extract image URLs
            const imageUrls = await page.$$eval(".posting-images img", (imgs) =>
                imgs.map((img) => {
                    let imageUrl = img.getAttribute("src");
                    // Remove trailing colon if present
                    imageUrl = imageUrl.endsWith(":")
                        ? imageUrl.slice(0, -1)
                        : imageUrl;
                    return imageUrl.startsWith("/")
                        ? `https://www.expatriates.com${imageUrl}`
                        : imageUrl;
                })
            );
            console.log("Image URLs:", imageUrls);

            // Download and save images
            const savedImages = [];
            for (let i = 0; i < imageUrls.length; i++) {
                const imageUrl = imageUrls[i];
                console.log("Downloading image:", imageUrl);
                try {
                    const response = await axios.get(imageUrl, {
                        responseType: "arraybuffer",
                    });
                    console.log("Image downloaded successfully:", imageUrl);
                    const imageFileName = `${jobId}_${i}.jpg`;
                    const imagePath = path.join(
                        __dirname,
                        "images",
                        imageFileName
                    );
                    await fs.writeFile(imagePath, response.data);
                    savedImages.push(imagePath);
                    console.log("Image saved:", imagePath);
                } catch (error) {
                    console.error(
                        `Error downloading image ${imageUrl}:`,
                        error
                    );
                }
            }

            // Prepare form data
            const formData = new FormData();
            formData.append("title", postTitle);
            formData.append("content", JSON.stringify(prosemirror_content));
            formData.append("location", JSON.stringify(loc));
            formData.append("date", date);
            savedImages.forEach((imagePath) => {
                formData.append("photos", fss.createReadStream(imagePath), {
                    filename: path.basename(imagePath),
                });
            });

            // Send POST request to localhost:3000/scraper
            console.log("Sending POST request for job ID:", jobId);
            const response = await axios.post(
                "http://localhost:3000/scraper",
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                    },
                    timeout: 60000, // Set a timeout of 30 seconds
                }
            );
            console.log(
                "POST request sent for job ID:",
                jobId,
                ". Response:",
                response.data
            );

            // Clean up: Delete downloaded images
            for (const imagePath of savedImages) {
                await fs.unlink(imagePath);
                console.log(`Deleted image: ${imagePath}`);
            }
        }
    } catch (e) {
        console.error("Error in fetchJobDetails:", e);
    } finally {
        console.log("Operation finished!");
    }
};

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

crawler.run(["https://www.expatriates.com/classifieds/bahrain/services/"]);

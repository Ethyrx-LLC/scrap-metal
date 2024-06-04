const express = require("express");
const app = express();
const port = 3002;
const path = require("path");
const { PlaywrightCrawler } = require("crawlee");
const fs = require("fs").promises;
const fss = require("fs");
const axios = require("axios");
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
const FormData = require("form-data");

async function logAllJobIds(page) {
    const ids = await page.$$eval("li[onclick]", (elems) => {
        const jobIds = elems.map((elem) => {
            const onclickValue = elem.getAttribute("onclick");
            const match = onclickValue.match(/\/cls\/(\d+)\.html/);
            return match ? match[1] : null;
        });
        //console.log("Job IDs found:", jobIds);
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
        //console.log(jobIds);
        await fetchJobDetails(page, jobIds);
    },
});

const fetchJobDetails = async (page, jobIds) => {
    try {
        for (let i = 0; i < jobIds.length; i++) {
            const jobId = jobIds[i];
            //console.log("Processing job ID:", jobId);
            await page.goto(`https://www.expatriates.com/cls/${jobId}.html`);
            //console.log("Page loaded successfully for job ID:", jobId);

            const postTitle = await page.$eval(".page-title > h1", (elem) =>
                elem.textContent.trim()
            );
            //console.log("Post title:", postTitle);

            const timestamp = await page
                .$eval("span#timestamp", (elem) => elem.getAttribute("epoch"))
                .catch(() => undefined);
            //console.log("Timestamp:", timestamp);

            const date = new Date(timestamp * 1000).toLocaleString();
            //console.log("Date:", date);

            const paragraphs = await page
                .$$eval(".post-body", (elems) =>
                    elems.flatMap((elem) => {
                        const contents = elem.innerText.trim().split("\n");
                        return contents.filter(
                            (content) => content.trim() !== ""
                        );
                    })
                )
                .catch(() => undefined);
            //console.log("Paragraphs:", paragraphs);

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
            //console.log("Prosemirror content:", prosemirror_content);

            const loc = {
                country: "BH",
                country_full: "Bahrain",
                region: "",
                region_full: null,
                city: "",
                timezone: "Asia/Bahrain",
            };
            //console.log("Location:", loc);

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
            //console.log("Image URLs:", imageUrls);

            // Download and save images
            const savedImages = [];
            console.log("Images found:", imageUrls.length);
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
                } finally {
                    console.log("Length of savedImages:", savedImages.length);
                }
            }

            await Promise.all(
                savedImages.map((imagePath) => fs.access(imagePath))
            );

            // Prepare form data
            const formData = new FormData();
            formData.append("title", postTitle);
            formData.append("content", JSON.stringify(prosemirror_content));
            formData.append("location", JSON.stringify(loc));
            formData.append("date", date);

            // Append images to form data
            savedImages.forEach((imagePath, index) => {
                const stream = fss.createReadStream(imagePath);
                if (!stream) {
                    throw new Error(`Failed to read image file: ${imagePath}`);
                }
                const stats = fss.statSync(imagePath);
                formData.append("photos", stream, {
                    filename: path.basename(imagePath),
                    contentType: "image/jpeg", // specify the content type of the image
                    knownLength: stats.size, // Ensure the size is known for proper form data encoding
                });
            });

            // Send POST request to localhost:3000/scraper
            // const response = await axios.post('http://localhost:3000/scraper', formData, {
            //     headers: formData.getHeaders(),
            //     timeout: 60000 // Set a timeout of 60 seconds
            // });
            console.log("Preparing to send POST request...");
            // const response = await fetch("http://localhost:3000/scraper", {
            //     method: "POST",
            //     body: formData
            // });
            axios
                .post("http://localhost:3000/scraper", formData, {
                    headers: {
                        ...formData.getHeaders(),
                    },
                })
                .then(() => {
                    console.log("Posted");
                });

            // problematic
            // Clean up: Delete downloaded images
            // for (const imagePath of savedImages) {
            //     await fs.unlink(imagePath);
            //     //console.log(`Deleted image: ${imagePath}`);
            // }
        }
    } catch (e) {
        console.error("Error in fetchJobDetails:", e);
    } finally {
        //console.log("Operation finished!");
    }
};

app.listen(port, () => {
    //console.log(`Server is running on port ${port}`);
});

crawler.run(["https://www.expatriates.com/classifieds/bahrain/services/"]);

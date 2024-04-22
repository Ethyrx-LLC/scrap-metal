const express = require("express");
const app = express();
const port = 3004;
const path = require("path");
const { PlaywrightCrawler } = require("crawlee");
const fs = require("fs").promises;

main().catch((err) => console.log(err));

async function main() {
    const crawler = new PlaywrightCrawler({
        async requestHandler({ page }) {
            await fetchJobDetails(page);
        },
    });

    crawler.run(["https://www.expatriates.com/classifieds/bahrain/services/"]);
}

const fetchJobDetails = async (page) => {
    try {
        const jobs = ["55871956"]; // Sample job IDs for testing

        for (let jobID of jobs) {
            await page.goto(`https://www.expatriates.com/cls/${jobID}.html`);
            const postTitle = await page.$eval(".page-title > h1", (elem) =>
                elem.textContent.trim()
            );

            const timestamp = await page.$eval("span#timestamp", (elem) =>
                elem.getAttribute("epoch")
            );

            const subCategoryElement = await page.$(
                ".post-info li:nth-child(3)"
            );

            let subCategory = null;
            if (subCategoryElement) {
                subCategory = await page.evaluate(
                    (elem) => elem.textContent.trim().toLowerCase(),
                    subCategoryElement
                );
            }

            const region = await page.evaluate(() => {
                const strongElements = document.querySelectorAll("li strong");
                for (let element of strongElements) {
                    if (element.textContent.trim() === "Region:") {
                        const regionElement = element.nextSibling;
                        return regionElement.textContent.trim().split("\n")[0];
                    }
                }
                return null; // If region is not found
            });

            const date = new Date(timestamp * 1000).toLocaleString();

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
                region: region ?? "",
                region_full: null,
                city: "",
                timezone: "Asia/Bahrain",
            };

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

            // Download images and prepare image details
            const images = await Promise.all(
                imageUrls.map(async (imageUrl) => {
                    try {
                        // Fetch the image data
                        const response = await page.fetch(imageUrl);
                        // Convert the response to a buffer
                        const buffer = await response.body();
                        // Prepare image details object
                        return {
                            fieldname: "photos",
                            originalname: path.basename(imageUrl),
                            encoding: "7bit",
                            mimetype: "image/jpeg",
                            buffer: Buffer.from(await buffer.arrayBuffer()),
                            size: buffer.length,
                        };
                    } catch (error) {
                        console.error(
                            `Error downloading image ${imageUrl}:`,
                            error
                        );
                        return null;
                    }
                })
            );

            // Remove null values from images array
            const validImages = images.filter((img) => img !== null);

            // Example data to be posted
            const postData = {
                title: postTitle,
                content: JSON.stringify(prosemirror_content),
                location: loc,
                date: date,
                images: validImages, // Include images in the data
            };

            // Logging the post data for now
            console.log(postData);
        }
    } catch (e) {
        console.error("Error in fetchJobDetails:", e);
    } finally {
        // Logging and other final tasks
        console.log("Operation finished!");
    }
};

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

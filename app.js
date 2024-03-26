const express = require("express");
const app = express();
const port = 3005;
const mongoose = require("mongoose");
const Listing = require("./listing");
const { PlaywrightCrawler } = require("crawlee");

main().catch((err) => console.log(err));

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
	//fetchJobIds();
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
	}
});

const listingCreate = async (postTitle, prosemirror_content, loc, date) => {
	const listing = new Listing({
		title: postTitle,
		content: JSON.stringify(prosemirror_content),
		category: "65e63eb09c7c7b61b1db90ba",
		location: loc,
		user: `65e9d2bd59706ced5903ae44`, // Include the user field
		likes: 0, // Initial value for likes
		views: 0, // Initial value for views
		createdAt: date
	});

	await listing.save();
	//console.log(`Added listing: ${postTitle}`);
};

const fetchJobDetails = async (page) => {
	try {
		console.log("Jobs array length:", jobs.length);

		for (let jobID of jobs) {
			console.log("Processing job ID:", jobID);

			await page.goto(`https://www.expatriates.com/cls/${jobID}.html`);
			const postTitle = await page.$eval(".page-title > h1", (elem) => elem.textContent.trim());
			const timestamp = await page.$eval("span#timestamp", (elem) => elem.getAttribute("epoch"));
			const date = new Date(timestamp * 1000).toLocaleString();

			let postEmail, postPhone;
			try {
				postEmail = await page.$eval("a[href^='mailto:']", (elem) => elem.textContent.trim());
			} catch (error) {
				console.error("Error finding email:", error);
				postEmail = "";
			}

			try {
				postPhone = await page.$eval("a[href^='tel:']", (elem) => elem.textContent.trim());
			} catch (error) {
				console.error("Error finding phone:", error);
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
					content: [{ type: "text", text: paragraph }]
				}))
			};

			const loc = {
				country: "BH",
				country_full: "Bahrain",
				region: "",
				region_full: null,
				city: "",
				timezone: "Asia/Bahrain"
			};

			console.dir({
				title: postTitle,
				date: date,
				email: postEmail,
				phone: postPhone,
				text: JSON.stringify(prosemirror_content)
			});

			await listingCreate(postTitle, prosemirror_content, loc, date);
			listingsAdded++;
		}
	} catch (e) {
		console.error("Error in fetchJobDetails:", e);
	} finally {
		log("=============== OPERATION COMPLETE ==============");
		log(`Added ${listingsAdded} listings`);
	}
};

app.listen(port, () => {
	console.log(`ACTIVATING EXPATRIATES MACHINE ON PORT ${port}`);
});

crawler.run(["https://www.expatriates.com/classifieds/bahrain/jobs/"]);

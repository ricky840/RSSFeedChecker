$(".version").html(`v${chrome.runtime.getManifest().version}`);

// Constants
const background = chrome.extension.getBackgroundPage();
var NUMBER_OF_RSS_CONTENT_TO_FETCH =  background.NUMBER_OF_RSS_CONTENT_TO_FETCH;
var SLEEP_DURATION = background.SLEEP_DURATION;
var tagify; // For keywords

$(document).ready(function() {
	
	// Dropdown: Number of articles to fetch
	$(".dropdown-number-of-article").dropdown({
    onChange: function(value, text, selectedItem) {
			NUMBER_OF_RSS_CONTENT_TO_FETCH = value;
    }
	});
	$(".dropdown-number-of-article").dropdown('set selected', NUMBER_OF_RSS_CONTENT_TO_FETCH);

	// Dropdown: Sleep duration
	$(".dropdown-sleep-duration").dropdown({
    onChange: function(value, text, selectedItem) {
			SLEEP_DURATION = value;
    }
	});
	$(".dropdown-sleep-duration").dropdown('set selected', SLEEP_DURATION);

	// Progress bar
	$(".fetch-progress-bar").progress({
		onSuccess: function(total) {
			$(this).progress("reset");
			$(this).progress("remove active");
			$(this).progress("remove success");
			$(this).progress("set label", "Sleeping..");
		},
		onChange: function(percent, value, total) {
			$(this).progress("set label", "Fetching feeds {value} / {total}");
		}
  });

	// Init keywords
	tagify = new Tagify($(".rss-keywords")[0]);
	loadKeywords().then(keywords => {
		tagify.addTags(keywords);
	});

	// Save keywords when it changes
	$(".rss-keywords").change(function(event) {
		saveKeywords(tagify.value);
	});

	// Remove all keywords
	$(".rss-keywords-remove-all-btn").click(function(event) {
		tagify.removeAllTags();
	});

	// Keywords export
	$(".rss-keywords-export-btn").click(async function(event) {
		const keywords = await loadKeywords();
		let hiddenElement = document.createElement('a');
		hiddenElement.href = 'data:text/html;charset=utf-8,' + encodeURI(keywords);
		hiddenElement.target = '_blank';
		hiddenElement.download = `keywords.txt`;
		hiddenElement.click();
	});

	// Menu clicks
	$(".menu-rss-feeds").click(function() {
		$(".content-wrapper").load("feeds.html", async function() {
			loadRssFeeds();
		});
	});

	// Save button
	$(".save-btn").click(function() {
		const numOfArticle = $(".dropdown-number-of-article").dropdown('get value');
		const sleepDuration = $(".dropdown-sleep-duration").dropdown('get value');
		chrome.storage.local.set({ numOfArticle: numOfArticle }, () => {
			chrome.storage.local.set({ sleepDuration: sleepDuration }, () => {
				$(this).html("Saved!");
				setTimeout(() => {
					$(this).html("Save");
				}, 1000);
			});
		});
	});

	// Load saved values
	loadSavedOptions();

	// Message close
	$(".content-wrapper").on("click", ".notifications .message .close", function() {
		$(this).closest('.message').transition('fade');
	});

	// Start button
	$(".rss-run-start-btn").click(function() {
		const runningStatus = $(this).text().trim();
		if (runningStatus == "Start") {
			$(this).html(`<i class="stop icon"></i>Stop`);
			console.log("Starting...");
			startCheckingRSS(true);
			setStartFlag(true);
		} else if (runningStatus == "Stop") {
			setStartFlag(false);
			$(this).html(`<i class="stop icon"></i>Stopping in next cycle..`);
		}
	});
});

// Init Start
async function startCheckingRSS(firstRun) {
	while (1) {
		if (firstRun) {
			try {
				await checkRSS();
				firstRun = false;
				continue;
			} catch (e) {
				break;
			}
		}

		const startFlag = await loadStartFlag();
		if (startFlag === true) {
			try {
				await checkRSS();
			} catch (e) {
				console.log(e);
				break;
			}
		} else {
			break;
		}
	}

	$(".rss-run-start-btn").html(`<i class="play icon"></i>Start`);
	console.log("Shutting down");
	return;
}

// Mark start flag
function setStartFlag(value) {
	chrome.storage.local.set({ "startFlag": value	});
}

// Load options saved
function loadSavedOptions() {
	chrome.storage.local.get("numOfArticle", function(result) {
		const numOfArticle = result["numOfArticle"];
		NUMBER_OF_RSS_CONTENT_TO_FETCH = numOfArticle;
		$(".dropdown-number-of-article").dropdown('set selected', NUMBER_OF_RSS_CONTENT_TO_FETCH);
	}); 
	chrome.storage.local.get("sleepDuration", function(result) {
		const sleepDuration = result["sleepDuration"];
		SLEEP_DURATION = sleepDuration;
		$(".dropdown-sleep-duration").dropdown('set selected', SLEEP_DURATION);
	}); 
}

// Return last updated date object if RSS feed is updated. Otherwise return false
function isUpdated(xml, currentLastUpdated) {
	const pubDate = xml.find("channel > pubDate");
	const lastBuildDate = xml.find("channel > lastBuildDate");
	let lastUpdated;

	if (pubDate.length >= 1) {
		lastUpdated = pubDate.text();
	} else if (lastBuildDate.length >= 1) {
		lastUpdated = lastBuildDate.text();
	} else if (pubDate.length >= 1 && lastBuildDate.length >= 1) {
		lastUpdated = lastBuildDate.text();
	} else {
		lastUpdated = null;
	}

	currentLastUpdatedDate = new Date(currentLastUpdated);
	newLastUpdatedDate = new Date(lastUpdated);

	return (currentLastUpdatedDate < newLastUpdatedDate) ? newLastUpdatedDate : false;

	// Temp for listing posts
	// return new Date();
}

function loadStartFlag() {
	return new Promise(function(resolve, reject) {
		chrome.storage.local.get("startFlag", function(result) {
			const flag = result["startFlag"];
			resolve(flag);
		});
	});
}

function loadRssList() {
	return new Promise(function(resolve, reject) {
		chrome.storage.local.get("rssList", function(result) {
			const rssList = result["rssList"];
			resolve(rssList);
		});
	});
}

function getTimeDiffFromNow(timeStr) {
	const now = new Date();
	const timeDate = new Date(timeStr);
	return Math.floor((now.getTime() - timeDate.getTime()) / 1000);
}

function createHTML(rss, content) {
	return `
	<div class="item">
		<div class="image">
			<div class="rss-minago">
				<div class="ui top attached large violet label">${rss.name}</div>
				<div class="ui small blue statistic time-diff">
					<div class="value time-value"></div>
					<div class="label time-unit"></div>
				</div>
			</div>
		</div>
		<div class="middle aligned content">
			<div class="header rss-title">
				<a href="${content.link}" target="_blank">${content.title}</a>
				<span class="right floated">
					<span class="rss-author">
						<a class="ui brown label">${content.author}</a>
					</span>
					<a class="ui blue label rss-feed-id" rss-id="${rss.id}" href="${rss.url}" target="_blank">${shortenFeedID(rss.id)}</a>
				</span>
			</div>
			<div class="meta">
				<span>
					<a class="ui grey label rss-extra-label">Published</a>
					<span class="rss-pubdate">${content.pubDate}</span>
				</span>
			</div>
			<div class="description rss-description">${content.description}</div>
			<div class="extra">
				<!-- <div class="ui right floated small basic button rss-item-delete-btn">Delete</div> -->
				<span>
					<a class="ui label basic rss-extra-label">Last check</a>
					<span class="rss-lastcheck">${rss.lastUpdated}</span>
				</span>
			</div>
		</div>
	</div>`;
}

function getUpdatedContents(xml) {
	const items = xml.find("channel > item");
	const contents = [];

	// For each article
	items.each(function(index, eachElement) {

		// Time formats :()
		// use in this order: pubDate -> lastBuildDate -> dc:date
		let published = $(eachElement).find("pubDate").text().trim();
		let lastBuild = $(eachElement).find("lastBuildDate").text().trim();
		let dc = $(eachElement).find("dc\\:date").text().trim();

		let publishedAt;
		if (!_.isEmpty(dc)) {
			publishedAt = dc;	
		} else if (!_.isEmpty(lastBuild)) {
			publishedAt = lastBuild;
		} else if (!_.isEmpty(published)) {
			publishedAt = published;
		} else {
			publishedAt = null;
		}

		// Assume all datetime is in KST if timezone is not specified
		publishedAt = (publishedAt.includes("+")) ? publishedAt : publishedAt + " +0900";

		let pubDate = new Date(publishedAt);
		if (!isValidDate(pubDate)) {
			pubDate = new Date("1984-02-28 00:00:00 +0900"); // default
		}

		// See if it has the keyword in the title
		let content = {
			"title": $(eachElement).find("title").text().trim(),
			"link": $(eachElement).find("link").text().trim(),
			"author": $(eachElement).find("author").text().trim() || "Unknown",
			"description": $(eachElement).find("description").text().trim() || "Unknown",
			"pubDate": pubDate.toString() 
		};

		// save only if it has the keyword, this returns title with keyword highlighted
		const newTitle = hasKeyword(content.title);

    if (newTitle) {
			content.title = newTitle;
			contents.push(content);
		}

		if (contents.length == NUMBER_OF_RSS_CONTENT_TO_FETCH) {
			// break;
			return false; 
		}
	});

	return contents;
}

function hasKeyword(title) {
	let foundKeyword = false;
	let highLightedTitle;
	const lowerCasedTitle = title.toLowerCase();

	let keywords = tagify.value;
	keywords = keywords.map((keyword) => { return keyword.value });

	// if no keyword, then just return title
	if (_.isEmpty(keywords)) return title;

	for (let keyword of keywords) {
		const lowerCasedKeyword = keyword.toLowerCase();

		// Case insensitive comparison
		if (lowerCasedTitle.indexOf(lowerCasedKeyword) >= 0) {
			const keywordIndex = lowerCasedTitle.indexOf(lowerCasedKeyword);

			highLightedTitle = [
				title.slice(0, keywordIndex), 
				"<keyword>", 
				keyword, 
				"</keyword>", 
				title.slice(keywordIndex + keyword.length)
			].join("");

			foundKeyword = true;
			break;
		}
	};

	return (foundKeyword) ? highLightedTitle : false;
}

function updateRssStore(rss) {
	chrome.storage.local.get("rssList", function(result) {
		let rssList = result["rssList"];
		rssList.forEach((eachRss) => {
			if (eachRss.id == rss.id) {
				eachRss.latestContents = rss.latestContents;
				eachRss.lastUpdated = rss.lastUpdated;
				eachRss.read = false;
			}
		});
		chrome.storage.local.set({ rssList: rssList	});
	});
}

function getTimeValueAndUnit(seconds) {
	if (seconds < 60) {
		return { value: seconds, unit: "Seconds ago" };
	} else if (seconds >= 60 && seconds < 3600) {
		return { value: Math.floor(seconds/60), unit: "Minutes ago" };
	} else if (seconds >= 3600) {
		return { value: Math.floor(seconds/3600), unit: "Hours ago" };
	} else {
		return { value: seconds, unit: "Seconds ago" };
	}
}

function updateAllTimeDiff() {
	const rssItems = $(".item");
	rssItems.each(function(index, element) {
		const publishedAt = $(element).find(".rss-pubdate").text();
		const publishedDate = new Date(publishedAt);
		const timeDiff = getTimeValueAndUnit(getTimeDiffFromNow(publishedDate));
		$(element).find(".rss-minago .time-value").html(timeDiff.value);
		$(element).find(".rss-minago .time-unit").html(timeDiff.unit);
	});
}

// Sort function callback
function sortLi(a, b) {
	const a_date_str = $(a).find(".rss-pubdate").text();
	const b_date_str = $(b).find(".rss-pubdate").text();
	const a_date = new Date(a_date_str);
	const b_date = new Date(b_date_str);
	const result = (b_date < a_date) ? -1 : 1;
	return result;
}

function sortRssList() {
	const rssList = $(".rss-items .item");
	const sorted = rssList.sort(sortLi);
	$(".rss-items").empty();
	$(".rss-items").append(sorted);

	// update the number of items
	$(".rss-items-amount").html(`<a class="ui circular label">${sorted.length}</a>`);
}

function presentRss(rss, section = "latest") {
	// remove existing feeds
	const latestItems = $(".rss-items-wrapper .rss-feed-id").closest(".item");
	latestItems.each(function(index, itemElement) {
		const rssFeedId = $(itemElement).find(".rss-feed-id").attr("rss-id");
		if (rssFeedId == rss.id) {
			$(itemElement).remove();	
		}
	});

	// Append to latest rss lists
	const contents = rss.latestContents;

	$(".rss-items").hide();
	contents.forEach((eachContent) => {
		const rssHtml = createHTML(rss, eachContent);
		$(".rss-items").prepend(rssHtml);
	});
	$(".rss-items").show();

	// Update time diff
	updateAllTimeDiff();
}

// Main function
async function checkRSS() {
	return new Promise(async (resolve, reject) => {
		const rssList = await loadRssList();
		if (_.isEmpty(rssList)) {
			notificationManager.show({
				"header": `Empty RSSList`,
				"content": `There is no RSSFeed URL in the database. Please add feed urls first.`
			}, "negative");
			reject();
			return;
		}

		const tasks = [];

		rssList.forEach((rss) => {
			const task = new Promise(async (resolve, reject) => {
				const request = { url: rss.url };
				try {
					let result = await http.getRequest(request);

					if (result.statusCode == 200) {
						const xmlDoc = $.parseXML(result.responseText);
						const xml = $(xmlDoc); // jQuery xml object
						const contents = getUpdatedContents(xml);
						rss.lastUpdated = (new Date()).toString();
						rss.latestContents = contents;
						presentRss(rss);
						updateRssStore(rss);
						resolve(`${rss.name} Fetched`);
					} else {
						throw `Invalid Response Code - ${result.statusCode}`;
					}
				} catch (error) {
					console.log(error);
					notificationManager.show({
						"header": `Error fetching RSS Feed: ${rss.name}`,
						"content": `${error.responseText}`
					}, "negative", true);
					reject();
				} finally {
					sortRssList();
					increaseProgressBar();
				}
			});
			tasks.push(task);
		});

		// Loading status
		$(".fetch-progress-bar").progress('set total', tasks.length);
		$(".fetch-progress-bar").progress('set active');

		Promise.allSettled(tasks).then((results) => {
			console.log("Fetch result");
			console.log(results);
			sortRssList(); // Sort one more time!
		}).catch((error) => {
			// Do nothing
		}).finally(() => { 
			$(".rss-last-run").html(getCurrentDateTime());
			console.log("Sleep");
			var timeleft = SLEEP_DURATION;
			var timer =  setInterval(function () {
				if (timeleft < 0) {
					clearInterval(timer);
					$(".rss-next-run").html('...');
					resolve();
					return;
				}
				$(".rss-next-run").html(`in ${timeleft/1000}s`);
				timeleft -= 1000;
			}, 1000);
		});
	});
}

function increaseProgressBar() {
	$(".fetch-progress-bar").progress('increment');
}

function saveKeywords(inputValues) {
	let keywords = [];
	inputValues.forEach((each) => {
		keywords.push(each.value);
	});
	chrome.storage.local.set({ keywords: keywords	}, () => { console.log("Keyword updated") });
}

function loadKeywords() {
	return new Promise(function (resolve, reject) {
		chrome.storage.local.get("keywords", function(result) {
			const keywords = result["keywords"];
			resolve(keywords);
		});
	});
}
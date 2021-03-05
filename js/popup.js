$(".version").html(`v${chrome.runtime.getManifest().version}`);

const background = chrome.extension.getBackgroundPage();
var NUMBER_OF_RSS_CONTENT_TO_FETCH =  background.NUMBER_OF_RSS_CONTENT_TO_FETCH;
var SLEEP_DURATION = background.SLEEP_DURATION;

$(document).ready(function() {


	// loadPreviousRss();

	$(".dropdown-number-of-article").dropdown({
    onChange: function(value, text, selectedItem) {
			NUMBER_OF_RSS_CONTENT_TO_FETCH = value;
    }
	});
	$(".dropdown-number-of-article").dropdown('set selected', NUMBER_OF_RSS_CONTENT_TO_FETCH);

	// Sleep duration
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
			// $(this).addClass("disabled");
		},
		onActive: function(value, total) {
			// $(this).removeClass("disabled");
		},
		onChange: function(percent, value, total) {
			$(this).progress("set label", "Fetching feeds {value} / {total}");
		}
  });

	// Menu clicks
	$(".menu-rss-feeds").click(function() {
		$(".content-wrapper").load("feeds.html", function() {
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

	// Remove Item button
	$(".rss-items").on("click", ".rss-item-delete-btn", function(event) {
		console.log("click");
		$(event.target).closest(".item").remove();
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


	// Message close
	$(".notifications").on("click", ".message .close", function() {
		$(this).closest('.message').transition('fade');
	});


});

function setStartFlag(value) {
	chrome.storage.local.set({ "startFlag": value	});
}



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
// async function loadPreviousRss() {
// 	const rssList = await loadRssList();
// 	if (_.isEmpty(rssList)) {
// 		return;
// 	}
// 	rssList.forEach((rss) => {
// 		presentRss(rss)
// 	});
// }











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

	// console.log("--------");
	// console.log(currentLastUpdated);
	// console.log("current", currentLastUpdatedDate);
	// console.log("new", newLastUpdatedDate);

	// temp for listing posts
	return (currentLastUpdatedDate < newLastUpdatedDate) ? newLastUpdatedDate : false;
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
				<div class="ui top attached violet label">${rss.name}</div>
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
					<a class="ui blue label rss-feed-id" href="${rss.url}" target="_blank">${rss.id}</a>
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

function isValidDate(date) {
  return (date instanceof Date && !isNaN(date));
}

function getUpdatedContents(xml) {
	const items = xml.find("channel > item");
	const contents = [];

	items.each(function(index, eachElement) {

		if (index == NUMBER_OF_RSS_CONTENT_TO_FETCH) { 
			// break;
			return false; 
		}

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

		// Assume all datetime is in KST
		publishedAt = (publishedAt.includes("+")) ? publishedAt : publishedAt + " +0900";

		let pubDate = new Date(publishedAt);
		if (!isValidDate(pubDate)) {
			pubDate = new Date("1984-02-28 00:00:00 +0900"); // default
		}

		const content = {
			"title": $(eachElement).find("title").text().trim(),
			"link": $(eachElement).find("link").text().trim(),
			"author": $(eachElement).find("author").text().trim() || "Unknown",
			"description": $(eachElement).find("description").text().trim() || "Unknown",
			"pubDate": pubDate.toString() 
		};

		contents.push(content);
	});

	return contents;
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

// sort function callback
function sort_li(a, b) {
	const a_date_str = $(a).find(".rss-pubdate").text();
	const b_date_str = $(b).find(".rss-pubdate").text();

	const a_date = new Date(a_date_str);
	const b_date = new Date(b_date_str);

	const result = (b_date < a_date) ? -1 : 1;
	// console.log(`comparing ${a_date} vs ${b_date}: Result: ${result}`);

	return result;
	// return (b < a) ? -1 : 1;
}

function sortRssList() {
	const rssList = $(".rss-items .item");
	const sorted = rssList.sort(sort_li);
	$(".rss-items").empty();
	$(".rss-items").append(sorted);

	// update the number of items
	$(".rss-items-amount").html(`<a class="ui circular label">${sorted.length}</a>`);

	// const rssList2 = $(".rss-previous-items .item");
	// let sorted2 = rssList2.sort(sort_li);
	// If it reaches 20 items, then remove from oldest
	// sorted2.splice(20, sorted2.length);
	// $(".rss-previous-items").empty();
	// $(".rss-previous-items").append(sorted2);
}








function presentRss(rss, section = "latest") {

	// remove existing feeds
	const latestItems = $(".rss-items-wrapper .rss-feed-id").closest(".item");
	latestItems.each(function(index, itemElement) {
		const rssFeedId = $(itemElement).find(".rss-feed-id").text().trim();
		if (rssFeedId == rss.id) {
			$(itemElement).remove();	
			// $(".rss-previous-items").prepend(itemElement);
		}
	});

	//  append to latest rss lsts
	const contents = rss.latestContents;

	$(".rss-items").hide();
	contents.forEach((eachContent) => {
		const rssHtml = createHTML(rss, eachContent);
		$(".rss-items").prepend(rssHtml);
	});
	$(".rss-items").show();

	updateAllTimeDiff();
}




async function checkRSS() {
	return new Promise(async (resolve, reject) => {

		const rssList = await loadRssList();
		if (_.isEmpty(rssList)) {
			notifyError({ name: "RSS List Empty", url: "Please add RSSFEED"}, "");
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

						// const newLastUpdated = isUpdated(xml, rss.lastUpdated);

						// if (newLastUpdated) {
							const contents = getUpdatedContents(xml);

							rss.lastUpdated = (new Date()).toString();
							// rss.lastUpdated = newLastUpdated.toString();
							rss.latestContents = contents;

							presentRss(rss);
							updateRssStore(rss);

							resolve(`${rss.name} fetched`);
						// } else {
						// 	resolve("rss NOT updated");
						// }
					} else {
						throw `Invalid Response Code - ${result.statusCode}`;
					}
				} catch (error) {
					console.log(error);
					notifyError(rss, error);
					reject();
				} finally {
					sortRssList();
					increaseProgressBar();
				}
			});

			tasks.push(task);
		});

		// Loading status
		// $(".rss-loading-status").html("Loading..");
		$(".fetch-progress-bar").progress('set total', tasks.length);
		$(".fetch-progress-bar").progress('set active');

		Promise.allSettled(tasks).then((results) => {
			console.log(results);

			// Sort rss list here
			sortRssList();

			// Remove if archived reaches 100 items (to-do)

			$(".rss-last-run").html(getCurrentDateTime());
			$(".rss-loading-status").html("Standby");

			console.log("done");
		}).catch((error) => {
			// Do nothing
		}).finally(() => { 
			var timeleft = SLEEP_DURATION;
			var timer =  setInterval(function () {
				if (timeleft < 0){
					clearInterval(timer);
					$(".rss-next-run").html('...');
					resolve();
					return;
				}
				$(".rss-next-run").html(`in ${timeleft/1000}s`);
				timeleft -= 1000;
			}, 1000);
			// setTimeout(()=> {
			// 	resolve();
			// }, 5000);
		});


	});

}

function notifyError(rss, error) {
	const message = $(".ui.message");
	const messageHtml = `
	<div class="ui negative message">
		<i class="close icon"></i>
		<div class="header">${rss.name}</div>
		<div class="message-body">${rss.url}<br>${error}</div>
	</div>`;
	$(".notifications").append(messageHtml);
}

function increaseProgressBar() {
	$(".fetch-progress-bar").progress('increment');
}

function getCurrentDateTime() {
	const now = new Date(); 
	return `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}<br>(Local Time)`;	
}